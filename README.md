# SponsorSync — Creator Economy Sponsorship Verification Protocol

> **"Eliminating creator fraud and automating milestone escrow payouts using GenLayer AI consensus and staged EVM escrow."**

---

## 🔗 Verified Deployments & Links
- **GenLayer Explorer Contract**: [`0x6FC89A7FcA83401dbe04E502d0053e7074aAB68D`](https://explorer-studio.genlayer.com/address/0x6FC89A7FcA83401dbe04E502d0053e7074aAB68D)
- **GitHub Repository**: [`https://github.com/tumhi4/sponsorsync`](https://github.com/tumhi4/sponsorsync)
- **Live DApp Dashboard**: [`https://sponsorsyncweb.vercel.app/`](https://sponsorsyncweb.vercel.app/)

---

## 🛡️ Staged Escrow Architecture & Anti-Fraud Invariants

1. **Strict Finalized Contract Readback (Zero Local Mock Fallbacks)**:
   - Dashboard initializes from on-chain storage via `gen_callView("get_campaign")` and only updates upon verified transaction confirmations with strict fail-closed handling.
2. **Bound Campaign ID Verification**:
   - `relay/SponsorSyncRelay.py` strictly verifies that `returned_campaign_id == expected_campaign_id` before authorizing any tranche disbursement.
3. **Production Signed Web3 EVM Escrow Relay**:
   - Constructs, signs with ECDSA private keys (`Account.sign_transaction`), broadcasts raw transactions (`send_raw_transaction`), and confirms on-chain receipts (`receipt.status == 1`) against `SponsorSyncEscrow.sol` (`releaseTranche1`, `releaseTranche2`, `clawback`).
4. **4-Tier Anti-Fraud Verification Engine**:
   - **Channel Authority Gate**: Rejects channels <30d old or <1M subs (`INSUFFICIENT_CHANNEL_AUTHORITY`).
   - **Bot-Farm Sentiment Filter**: Detects unnatural comment clusters (`SUSPECTED_BOT_ACTIVITY`).
   - **Cryptographic Claim Code**: Validates `GL-VERIFY-XXXXXX` in description (`MISSING_CLAIM_CODE`).
   - **Delete-&-Dash Clawback**: 50% Day 0 release + 50% Day 7 retention verification.
