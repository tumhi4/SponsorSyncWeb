// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/SponsorSyncEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1_000_000 * 10**6);
    }
}

contract SponsorSyncTest is Test {
    SponsorSyncEscrow public escrow;
    MockUSDC public usdc;

    address public brand = address(0xB1);
    address public creator = address(0xC1);
    address public oracle = address(0x0A);
    bytes32 public campaignId = keccak256("SPONSOR_CAMPAIGN_001");
    uint256 public depositAmount = 5_000 * 10**6; // $5,000 USDC

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new SponsorSyncEscrow(address(usdc), oracle);

        // Fund brand with USDC
        usdc.transfer(brand, depositAmount);
        vm.prank(brand);
        usdc.approve(address(escrow), depositAmount);
    }

    function test_FundAndStagedVesting() public {
        // 1. Brand funds campaign
        vm.prank(brand);
        escrow.fundCampaign(campaignId, creator, depositAmount);

        assertEq(usdc.balanceOf(address(escrow)), depositAmount);
        assertEq(usdc.balanceOf(creator), 0);

        // 2. Oracle emits INITIAL_APPROVED -> Tranche 1 (50%) released
        vm.prank(oracle);
        escrow.releaseTranche1(campaignId);

        assertEq(usdc.balanceOf(creator), 2_500 * 10**6);
        assertEq(usdc.balanceOf(address(escrow)), 2_500 * 10**6);

        // 3. Oracle emits FULLY_SETTLED after 7-day retention -> Tranche 2 released
        vm.prank(oracle);
        escrow.releaseTranche2(campaignId);

        assertEq(usdc.balanceOf(creator), 5_000 * 10**6);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_DeleteAndDashClawback() public {
        // 1. Fund and release Tranche 1
        vm.prank(brand);
        escrow.fundCampaign(campaignId, creator, depositAmount);

        vm.prank(oracle);
        escrow.releaseTranche1(campaignId);

        assertEq(usdc.balanceOf(creator), 2_500 * 10**6);

        // 2. Creator deletes video -> Oracle triggers clawback
        vm.prank(oracle);
        escrow.clawback(campaignId);

        // Brand receives back remaining 50%
        assertEq(usdc.balanceOf(brand), 2_500 * 10**6);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_UnauthorizedOracleRevert() public {
        vm.prank(brand);
        escrow.fundCampaign(campaignId, creator, depositAmount);

        // Random address tries to release funds
        vm.prank(address(0xDEAD));
        vm.expectRevert("Unauthorized: caller not oracle relay");
        escrow.releaseTranche1(campaignId);
    }
}
