// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SponsorSyncEscrow
 * @notice Production-grade 50/50 staged escrow contract for Creator Economy Sponsorships.
 * @dev Holds USDC deposits on Base/Arbitrum and releases tranches based on GenLayer AI consensus verdicts.
 */
contract SponsorSyncEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdcToken;
    address public oracleRelay;
    address public owner;

    enum EscrowStatus {
        EMPTY,
        FUNDED,
        TRANCHE_1_RELEASED,
        FULLY_SETTLED,
        CLAWED_BACK
    }

    struct EscrowDeposit {
        bytes32 campaignId;
        address brand;
        address creator;
        uint256 totalAmount;
        uint256 tranche1Amount;
        uint256 tranche2Amount;
        EscrowStatus status;
    }

    mapping(bytes32 => EscrowDeposit) public escrows;

    event CampaignFunded(bytes32 indexed campaignId, address indexed brand, address indexed creator, uint256 amount);
    event Tranche1Released(bytes32 indexed campaignId, address indexed creator, uint256 amount);
    event Tranche2Released(bytes32 indexed campaignId, address indexed creator, uint256 amount);
    event EscrowClawedBack(bytes32 indexed campaignId, address indexed brand, uint256 amount);

    modifier onlyOracle() {
        require(msg.sender == oracleRelay || msg.sender == owner, "Unauthorized: caller not oracle relay");
        _;
    }

    constructor(address _usdcToken, address _oracleRelay) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_oracleRelay != address(0), "Invalid oracle address");
        usdcToken = IERC20(_usdcToken);
        oracleRelay = _oracleRelay;
        owner = msg.sender;
    }

    /**
     * @notice Brand deposits USDC for a campaign.
     * @param campaignId Unique campaign ID hash.
     * @param creator Registered creator wallet address.
     * @param amount Total USDC sponsorship amount.
     */
    function fundCampaign(bytes32 campaignId, address creator, uint256 amount) external nonReentrant {
        require(amount > 0, "Deposit amount must be > 0");
        require(creator != address(0), "Invalid creator address");
        require(escrows[campaignId].status == EscrowStatus.EMPTY, "Campaign already funded");

        uint256 half = amount / 2;
        uint256 remainingHalf = amount - half;

        escrows[campaignId] = EscrowDeposit({
            campaignId: campaignId,
            brand: msg.sender,
            creator: creator,
            totalAmount: amount,
            tranche1Amount: half,
            tranche2Amount: remainingHalf,
            status: EscrowStatus.FUNDED
        });

        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        emit CampaignFunded(campaignId, msg.sender, creator, amount);
    }

    /**
     * @notice Releases Tranche 1 (50%) to the creator upon INITIAL_APPROVED verdict from GenLayer.
     */
    function releaseTranche1(bytes32 campaignId) external onlyOracle nonReentrant {
        EscrowDeposit storage dep = escrows[campaignId];
        require(dep.status == EscrowStatus.FUNDED, "Invalid escrow status for Tranche 1");

        dep.status = EscrowStatus.TRANCHE_1_RELEASED;
        uint256 payout = dep.tranche1Amount;
        dep.tranche1Amount = 0;

        usdcToken.safeTransfer(dep.creator, payout);
        emit Tranche1Released(campaignId, dep.creator, payout);
    }

    /**
     * @notice Releases Tranche 2 (remaining 50%) upon FULLY_SETTLED retention verdict.
     */
    function releaseTranche2(bytes32 campaignId) external onlyOracle nonReentrant {
        EscrowDeposit storage dep = escrows[campaignId];
        require(dep.status == EscrowStatus.TRANCHE_1_RELEASED, "Invalid escrow status for Tranche 2");

        dep.status = EscrowStatus.FULLY_SETTLED;
        uint256 payout = dep.tranche2Amount;
        dep.tranche2Amount = 0;

        usdcToken.safeTransfer(dep.creator, payout);
        emit Tranche2Released(campaignId, dep.creator, payout);
    }

    /**
     * @notice Claws back remaining escrow (50%) to the brand if content is deleted during retention.
     */
    function clawback(bytes32 campaignId) external onlyOracle nonReentrant {
        EscrowDeposit storage dep = escrows[campaignId];
        require(dep.status == EscrowStatus.TRANCHE_1_RELEASED, "Only active retention can be clawed back");

        dep.status = EscrowStatus.CLAWED_BACK;
        uint256 refund = dep.tranche2Amount;
        dep.tranche2Amount = 0;

        usdcToken.safeTransfer(dep.brand, refund);
        emit EscrowClawedBack(campaignId, dep.brand, refund);
    }

    function updateOracleRelay(address _newRelay) external {
        require(msg.sender == owner, "Only owner");
        require(_newRelay != address(0), "Invalid relay");
        oracleRelay = _newRelay;
    }
}
