#!/usr/bin/env python3
"""
SponsorSync Verified Settlement Relay (GenLayer Court -> EVM Escrow)
====================================================================
Polls GenLayer Intelligent Contract (get_campaign) and authorizes EVM Escrow disbursements
(SponsorSyncEscrow.sol) strictly bound to authenticated on-chain court verdicts.

Production EVM Web3 Pipeline:
1. Connects to GenLayer Court (get_campaign) via JSON-RPC.
2. Reads finalized consensus state:
   - Verifies returned campaign_id matches expected campaign_id.
   - If `tranche_1_released == True` -> Builds, signs, broadcasts, and confirms `releaseTranche1(bytes32)` on EVM.
   - If `tranche_2_released == True` -> Builds, signs, broadcasts, and confirms `releaseTranche2(bytes32)` on EVM.
   - If `status == "CLAWED_BACK"` -> Builds, signs, broadcasts, and confirms `clawback(bytes32)` on EVM.
3. Zero Fabricated Fallbacks: Fails closed on any RPC error or contract discrepancy.
4. Confirms On-Chain EVM Receipts: Polls for transaction receipt and validates status == 1.
"""

import os
import sys
import time
import json
import logging
import requests
from typing import Dict, Any, Optional

try:
    from web3 import Web3
    from eth_account import Account
except ImportError:
    Web3 = None
    Account = None

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("sponsorsync_relay.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)

# Configuration from Environment
GENLAYER_RPC = os.getenv("GENLAYER_RPC", "https://studio.genlayer.com/api")
GENLAYER_COURT_ADDRESS = os.getenv("GENLAYER_COURT_ADDRESS", "0x6FC89A7FcA83401dbe04E502d0053e7074aAB68D")
EVM_RPC_URL = os.getenv("EVM_RPC_URL", "https://sepolia.base.org")
EVM_ESCROW_ADDRESS = os.getenv("EVM_ESCROW_ADDRESS", "0x3Fa9b23f81902c34918239482910394817e12a89")
RELAY_PRIVATE_KEY = os.getenv("RELAY_PRIVATE_KEY", "")
POLL_INTERVAL_SECONDS = int(os.getenv("POLL_INTERVAL_SECONDS", "30"))

# Exact ABI matching SponsorSyncEscrow.sol
ESCROW_ABI = [
    {
        "inputs": [{"internalType": "bytes32", "name": "campaignId", "type": "bytes32"}],
        "name": "releaseTranche1",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "campaignId", "type": "bytes32"}],
        "name": "releaseTranche2",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "campaignId", "type": "bytes32"}],
        "name": "clawback",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]


class GenLayerCourtClient:
    """Reads campaign verdicts and tranche release signals from GenLayer with strict fail-closed safety."""

    def __init__(self, rpc_url: str, contract_address: str):
        self.rpc_url = rpc_url
        self.contract_address = contract_address

    def get_campaign(self, campaign_id: str) -> Optional[Dict[str, Any]]:
        """Queries get_campaign(campaign_id) via GenLayer JSON-RPC."""
        payload = {
            "jsonrpc": "2.0",
            "method": "gen_callView",
            "params": {
                "address": self.contract_address,
                "function_name": "get_campaign",
                "args": [campaign_id]
            },
            "id": int(time.time())
        }
        try:
            resp = requests.post(self.rpc_url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if "error" in data:
                    logging.error(f"[FAIL-CLOSED] GenLayer JSON-RPC error: {data['error']}")
                    return None
                result = data.get("result")
                if isinstance(result, str):
                    try:
                        return json.loads(result)
                    except Exception:
                        pass
                if isinstance(result, dict):
                    return result
            else:
                logging.error(f"[FAIL-CLOSED] GenLayer RPC returned HTTP {resp.status_code}")
                return None
        except Exception as e:
            logging.error(f"[FAIL-CLOSED] Error querying GenLayer Court: {e}")
            return None
        return None


class EvmSettlementRelay:
    """Constructs, signs, broadcasts, and confirms on-chain fund disbursements on EVM Escrow."""

    def __init__(self, rpc_url: str, escrow_address: str, private_key: str):
        self.rpc_url = rpc_url
        self.escrow_address = escrow_address
        self.private_key = private_key
        self.settled_tranches = {}

        if Web3:
            self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
            if self.private_key:
                self.account = Account.from_key(self.private_key)
                self.sender_address = self.account.address
            else:
                self.account = None
                self.sender_address = None
        else:
            self.w3 = None
            self.account = None
            self.sender_address = None

    def to_bytes32(self, text: str) -> bytes:
        raw_bytes = text.encode("utf-8")
        return raw_bytes.ljust(32, b'\0')[:32]

    def execute_tranche_1_release(self, campaign_id: str) -> bool:
        cache_key = f"{campaign_id}_T1"
        if self.settled_tranches.get(cache_key):
            return True

        if not self.w3 or not self.account:
            logging.error("[FAIL-CLOSED] EVM Web3 or RELAY_PRIVATE_KEY not configured. Cannot sign Tranche 1 transaction.")
            return False

        try:
            contract = self.w3.eth.contract(address=Web3.to_checksum_address(self.escrow_address), abi=ESCROW_ABI)
            c_bytes32 = self.to_bytes32(campaign_id)

            nonce = self.w3.eth.get_transaction_count(self.sender_address)
            gas_price = self.w3.eth.gas_price

            tx = contract.functions.releaseTranche1(
                c_bytes32
            ).build_transaction({
                'from': self.sender_address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': gas_price
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            logging.info(f"⚡ [EVM BROADCAST] Sent releaseTranche1 tx: {tx_hash.hex()}. Awaiting confirmation...")

            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
            if receipt.status == 1:
                logging.info(f"✅ [EVM CONFIRMED] Tranche 1 released on block {receipt.blockNumber} (tx: {tx_hash.hex()}).")
                self.settled_tranches[cache_key] = True
                return True
            else:
                logging.error(f"🚨 [FAIL-CLOSED] Tranche 1 transaction reverted: {tx_hash.hex()}")
                return False
        except Exception as e:
            logging.error(f"[FAIL-CLOSED] Error broadcasting Tranche 1: {e}")
            return False

    def execute_tranche_2_release(self, campaign_id: str) -> bool:
        cache_key = f"{campaign_id}_T2"
        if self.settled_tranches.get(cache_key):
            return True

        if not self.w3 or not self.account:
            logging.error("[FAIL-CLOSED] EVM Web3 or RELAY_PRIVATE_KEY not configured. Cannot sign Tranche 2 transaction.")
            return False

        try:
            contract = self.w3.eth.contract(address=Web3.to_checksum_address(self.escrow_address), abi=ESCROW_ABI)
            c_bytes32 = self.to_bytes32(campaign_id)

            nonce = self.w3.eth.get_transaction_count(self.sender_address)
            gas_price = self.w3.eth.gas_price

            tx = contract.functions.releaseTranche2(
                c_bytes32
            ).build_transaction({
                'from': self.sender_address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': gas_price
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            logging.info(f"⚡ [EVM BROADCAST] Sent releaseTranche2 tx: {tx_hash.hex()}. Awaiting confirmation...")

            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
            if receipt.status == 1:
                logging.info(f"✅ [EVM CONFIRMED] Tranche 2 released on block {receipt.blockNumber} (tx: {tx_hash.hex()}).")
                self.settled_tranches[cache_key] = True
                return True
            else:
                logging.error(f"🚨 [FAIL-CLOSED] Tranche 2 transaction reverted: {tx_hash.hex()}")
                return False
        except Exception as e:
            logging.error(f"[FAIL-CLOSED] Error broadcasting Tranche 2: {e}")
            return False

    def execute_clawback(self, campaign_id: str) -> bool:
        cache_key = f"{campaign_id}_CLAWBACK"
        if self.settled_tranches.get(cache_key):
            return True

        if not self.w3 or not self.account:
            logging.error("[FAIL-CLOSED] EVM Web3 or RELAY_PRIVATE_KEY not configured. Cannot sign clawback transaction.")
            return False

        try:
            contract = self.w3.eth.contract(address=Web3.to_checksum_address(self.escrow_address), abi=ESCROW_ABI)
            c_bytes32 = self.to_bytes32(campaign_id)

            nonce = self.w3.eth.get_transaction_count(self.sender_address)
            gas_price = self.w3.eth.gas_price

            tx = contract.functions.clawback(
                c_bytes32
            ).build_transaction({
                'from': self.sender_address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': gas_price
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            logging.info(f"🚨 [EVM BROADCAST] Sent clawback tx: {tx_hash.hex()}. Awaiting confirmation...")

            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
            if receipt.status == 1:
                logging.info(f"✅ [EVM CONFIRMED] Retention clawback finalized on block {receipt.blockNumber}.")
                self.settled_tranches[cache_key] = True
                return True
            else:
                logging.error(f"🚨 [FAIL-CLOSED] Clawback transaction reverted: {tx_hash.hex()}")
                return False
        except Exception as e:
            logging.error(f"[FAIL-CLOSED] Error broadcasting clawback: {e}")
            return False


def run_settlement_relay(tracked_campaigns: list):
    logging.info("=" * 75)
    logging.info("   SPONSORSYNC VERIFIED SETTLEMENT RELAY (GENLAYER -> EVM ESCROW)")
    logging.info("=" * 75)
    logging.info(f"GenLayer Court: {GENLAYER_COURT_ADDRESS}")
    logging.info(f"EVM Escrow: {EVM_ESCROW_ADDRESS}")
    logging.info(f"Tracked Campaigns: {tracked_campaigns}")
    logging.info("Starting real-time creator sponsorship settlement loop...\n")

    court_client = GenLayerCourtClient(GENLAYER_RPC, GENLAYER_COURT_ADDRESS)
    evm_relay = EvmSettlementRelay(EVM_RPC_URL, EVM_ESCROW_ADDRESS, RELAY_PRIVATE_KEY)

    while True:
        for c_id in tracked_campaigns:
            try:
                logging.info(f"Checking GenLayer Court verdict for campaign {c_id}...")
                c_data = court_client.get_campaign(c_id)
                if not c_data:
                    logging.warning(f"[FAIL-CLOSED] Campaign {c_id} not found or inaccessible.")
                    continue

                # INVARIANT: Verify returned campaign ID matches target campaign ID
                returned_id = c_data.get("id")
                if returned_id != c_id:
                    logging.error(f"[FAIL-CLOSED] Campaign ID mismatch: expected {c_id}, received {returned_id}")
                    continue

                status = c_data.get("status", "NONE")
                verdict = c_data.get("verdict", "NONE")
                t1_released = c_data.get("tranche_1_released", False)
                t2_released = c_data.get("tranche_2_released", False)

                logging.info(f"Campaign {c_id}: Status={status} | Verdict={verdict} | T1={t1_released} | T2={t2_released}")

                if t1_released and not t2_released and status != "CLAWED_BACK":
                    evm_relay.execute_tranche_1_release(c_id)
                elif t2_released or status == "FULLY_SETTLED":
                    evm_relay.execute_tranche_2_release(c_id)
                elif status == "CLAWED_BACK":
                    evm_relay.execute_clawback(c_id)

            except Exception as e:
                logging.error(f"[FAIL-CLOSED] Error in settlement cycle for {c_id}: {e}")

        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    test_campaigns = ["SPONSOR_CAMPAIGN_001", "SPONSOR_CAMPAIGN_002", "SPONSOR_CAMPAIGN_003"]
    try:
        run_settlement_relay(test_campaigns)
    except KeyboardInterrupt:
        logging.info("\nRelay stopped by operator.")
