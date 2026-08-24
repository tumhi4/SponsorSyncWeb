# SponsorSync — GenLayer Studio Test Log & Validation Suite

This document records the test cases and execution log for **SponsorSyncCourt** in GenLayer Studio.

---

## 📋 Comprehensive Test Matrix

| Test Case | Description | Target DOM / Evidence | Expected Verdict | Expected Status |
|---|---|---|---|---|
| **TC-01** | Full Compliance Video | `demo/youtube_perfect.html` | `FULL_COMPLIANCE` | `INITIAL_APPROVED` (50% released) |
| **TC-02** | Burner Channel Impersonation | `demo/youtube_burner.html` | `WRONG_CHANNEL` | `INITIAL_REJECTED` |
| **TC-03** | Bot-Farm Fake Comments | `demo/youtube_botfarm.html` | `SUSPECTED_BOT_ACTIVITY` | `INITIAL_REJECTED` |
| **TC-04** | 7-Day Retention Persistence | `demo/youtube_perfect.html` | `FULL_COMPLIANCE` | `FULLY_SETTLED` (100% settled) |
| **TC-05** | Delete & Dash Post-Audit | 404 / Missing URL | `DELETED_OR_PRIVATE` | `CLAWBACK_TRIGGERED` (50% refunded) |

---

## 🛠️ Step-by-Step Studio Execution Template

### 1. Deploy Contract
* **Operator**: `"0x09fae1aafadb0a3b8382e43ed8d2d56ba92171c3"`

---

### 2. TC-01: Full Compliance Execution
1. Call `create_campaign`:
   * `required_handle`: `"@MrBeast"`
   * `platform`: `"YOUTUBE"`
   * `min_subscribers`: `1000000`
   * `min_avg_views`: `500000`
   * `brief_requirements`: `"Feature GenLayer in first 3 minutes and display promo code MRBEAST"`
   * `escrow_amount_usdc`: `5000`
   > *Output: `"SPONSOR_CAMPAIGN_001"`*
2. Call `register_creator("SPONSOR_CAMPAIGN_001")`:
   > *Output: `"GL-VERIFY-8F3K2"`*
3. Call `submit_evidence("SPONSOR_CAMPAIGN_001", "https://sponsor-sync-demo.vercel.app/youtube_perfect.html")`.
4. Call `run_initial_audit("SPONSOR_CAMPAIGN_001")`.
5. Call `get_campaign("SPONSOR_CAMPAIGN_001")`:
   ```json
   {
     "id": "SPONSOR_CAMPAIGN_001",
     "required_handle": "@MrBeast",
     "subscriber_count": 245000000,
     "view_count": 5420890,
     "verdict": "FULL_COMPLIANCE",
     "status": "INITIAL_APPROVED",
     "tranche_1_released": true,
     "tranche_2_released": false
   }
   ```
6. Call `run_retention_audit("SPONSOR_CAMPAIGN_001")`.
7. Call `get_campaign("SPONSOR_CAMPAIGN_001")`:
   ```json
   {
     "id": "SPONSOR_CAMPAIGN_001",
     "status": "FULLY_SETTLED",
     "tranche_1_released": true,
     "tranche_2_released": true
   }
   ```
