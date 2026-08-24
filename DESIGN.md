# SponsorSync — Protocol Design & Security Specification

## 1. Asymmetric Equivalence Principle Design

Consensus in SponsorSync is partitioned into **Strict Deterministic Match** and **Bounded Fuzzy Match** to prevent formatting deadlocks while guaranteeing mathematical consensus safety:

```
Consensus Payload
├── Strict Part (100% Deterministic Agreement Required):
│   ├── extracted_handle: str (Must match exact channel handle)
│   ├── claim_code_present: bool (Must match presence of GL-VERIFY code)
│   ├── sponsor_mentioned: bool (Must match presence of brand mention)
│   ├── comment_sentiment: enum ("ORGANIC" | "GENERIC_SPAM")
│   └── video_is_public: bool (Must match live HTTP/DOM availability)
└── Bounded Fuzzy Part (Allowed Variance Tolerances):
    ├── subscriber_count, view_count, like_count (±5% bounded tolerance)
    ├── quality_score (±12 points tolerance)
    └── mention_timestamp_sec (±30 seconds tolerance)
```

---

## 2. Anti-Hallucination Separation of Concerns

```
Raw Webpage / DOM Evidence
            │
            ▼ (Non-deterministic Extraction)
LLM Extraction Node
(Extracts raw fields: subs, views, comments, claim code)
            │
            ▼ (Deterministic Python Engine)
Python Smart Contract Logic
(Strict mathematical bounds checks & state machine transitions)
            │
            ▼
On-Chain Immutable Verdict (FULL_COMPLIANCE, WRONG_CHANNEL, etc.)
```

The LLM is **never allowed to make decisions**. It only acts as a structured information parser. All critical thresholds (e.g. `subs >= req_min_subs`, `handle == required_handle`, `claim_code in description`) are executed deterministically in Python.

---

## 3. Threat Model & Exploit Mitigation Matrix

| Attack Vector | Attacker Strategy | How SponsorSync Prevents It |
|---|---|---|
| **Burner Accounts** | Creator uploads to a freshly created burner channel with 10 subscribers. | Layer 1 enforces strict `min_subscribers` and `min_avg_views` thresholds; rejects with `INSUFFICIENT_CHANNEL_AUTHORITY`. |
| **Bot Farms & Fake Views** | Creator buys 100k views and bot comments (`"🔥🔥🔥"`, `"Nice"`). | Layer 2 runs semantic LLM comment categorization (`comment_sentiment == GENERIC_SPAM`) and checks like/view ratios; rejects with `SUSPECTED_BOT_ACTIVITY`. |
| **URL Theft / Hijacking** | Creator submits another creator's viral video link. | Layer 3 requires unique `GL-VERIFY-{hash}` claim code in the video description; rejects with `MISSING_CLAIM_CODE`. |
| **Delete & Dash** | Creator deletes video after initial tranche payment. | Layer 4 runs Day 7 retention audit; if 404 or private, triggers `CLAWBACK_TRIGGERED` and refunds remaining 50% to brand. |

---

## 4. State Machine Transitions

```
[ CAMPAIGN_CREATED ]
         │
         ▼ (register_creator)
[ CREATOR_REGISTERED ] (Issues GL-VERIFY Claim Code)
         │
         ▼ (submit_evidence)
[ EVIDENCE_SUBMITTED ]
         │
         ▼ (run_initial_audit)
   ┌─────┴──────────────────────────────────────────────────────┐
   │                                                            │
[ INITIAL_APPROVED ] (Tranche 1: 50% released)         [ INITIAL_REJECTED ]
   │                                                   (WRONG_CHANNEL, BOT_FARM, etc.)
   ▼ (run_retention_audit)
   ├───────────────────────────────┐
   │                               │
[ FULLY_SETTLED ]          [ CLAWBACK_TRIGGERED ]
(Tranche 2: 50% released)  (50% returned to Brand)
```
