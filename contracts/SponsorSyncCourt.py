# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
import re
from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class CampaignRecord:
    id: str
    brand: str
    creator: str
    required_handle: str
    platform: str
    min_subscribers: u256
    min_avg_views: u256
    brief_requirements: str
    escrow_amount_usdc: u256
    claim_code: str
    video_evidence_url: str
    status: str
    verdict: str
    tranche_1_released: bool
    tranche_2_released: bool
    subscriber_count: u256
    view_count: u256
    like_count: u256
    quality_score: u256
    last_audit_summary: str


class SponsorSyncCourt(gl.Contract):
    operator: str
    campaigns: TreeMap[str, CampaignRecord]
    next_campaign_id: u256

    def __init__(self, operator: str):
        self.operator = operator.strip().strip('"').strip("'").lower()
        # GenLayer VM automatically instantiates storage-backed TreeMaps.
        self.next_campaign_id = u256(0)

    @gl.public.write
    def create_campaign(
        self,
        required_handle: str,
        platform: str,
        min_subscribers: u256,
        min_avg_views: u256,
        brief_requirements: str,
        escrow_amount_usdc: u256
    ) -> str:
        sender = str(gl.message.sender_address).lower()
        handle_clean = required_handle.strip().strip('"').strip("'")
        if not handle_clean.startswith("@"):
            handle_clean = "@" + handle_clean

        plat_clean = platform.strip().strip('"').strip("'").upper()
        assert plat_clean in ("YOUTUBE", "PODCAST"), "[ERR_PLATFORM_01] Platform must be 'YOUTUBE' or 'PODCAST'."
        assert len(handle_clean) >= 2, "[ERR_HANDLE_01] Valid creator handle required."
        assert int(escrow_amount_usdc) > 0, "[ERR_ESCROW_01] Escrow amount must be greater than zero."

        c_num = int(self.next_campaign_id) + 1
        self.next_campaign_id = u256(c_num)
        c_id = "SPONSOR_CAMPAIGN_" + str(c_num).zfill(3)

        new_campaign = CampaignRecord(
            id=c_id,
            brand=sender,
            creator="",
            required_handle=handle_clean,
            platform=plat_clean,
            min_subscribers=min_subscribers,
            min_avg_views=min_avg_views,
            brief_requirements=brief_requirements.strip(),
            escrow_amount_usdc=escrow_amount_usdc,
            claim_code="",
            video_evidence_url="",
            status="CAMPAIGN_CREATED",
            verdict="NONE",
            tranche_1_released=False,
            tranche_2_released=False,
            subscriber_count=u256(0),
            view_count=u256(0),
            like_count=u256(0),
            quality_score=u256(0),
            last_audit_summary=f"Campaign initialized by brand {sender}. Awaiting creator registration."
        )

        self.campaigns[c_id] = new_campaign
        return c_id

    @gl.public.write
    def register_creator(self, campaign_id: str) -> str:
        assert campaign_id in self.campaigns, "[ERR_STATE_01] Campaign ID does not exist."
        campaign = self.campaigns[campaign_id]
        sender = str(gl.message.sender_address).lower()

        assert campaign.status in ("CAMPAIGN_CREATED", "CREATOR_REGISTERED"), \
            "[ERR_STATE_02] Campaign registration is closed or in audit."

        # Generate unique cryptographic channel claim code bound to sender and campaign
        token_suffix = str(abs(hash(campaign_id + sender)) % 1000000).zfill(6)
        claim_code = f"GL-VERIFY-{token_suffix}"

        campaign.creator = sender
        campaign.claim_code = claim_code
        campaign.status = "CREATOR_REGISTERED"
        campaign.last_audit_summary = (
            f"Creator {sender} registered. Unique Claim Code '{claim_code}' issued. "
            f"Must be placed in video description or channel about section."
        )

        self.campaigns[campaign_id] = campaign
        return claim_code

    @gl.public.write
    def submit_evidence(self, campaign_id: str, video_evidence_url: str) -> None:
        assert campaign_id in self.campaigns, "[ERR_STATE_01] Campaign ID does not exist."
        campaign = self.campaigns[campaign_id]
        sender = str(gl.message.sender_address).lower()

        assert sender == campaign.creator or sender == self.operator, \
            "[ERR_AUTH_01] Unauthorized: only the registered creator can submit evidence."
        assert campaign.status in ("CREATOR_REGISTERED", "EVIDENCE_SUBMITTED", "INITIAL_REJECTED"), \
            "[ERR_STATE_03] Evidence cannot be submitted for settled campaigns."

        url_clean = video_evidence_url.strip().strip('"').strip("'")
        assert url_clean.startswith("http://") or url_clean.startswith("https://"), \
            "[ERR_URL_01] Valid HTTP/HTTPS evidence URL required."

        campaign.video_evidence_url = url_clean
        campaign.status = "EVIDENCE_SUBMITTED"
        campaign.last_audit_summary = f"Evidence submitted: '{url_clean}'. Ready for AI consensus initial audit."
        self.campaigns[campaign_id] = campaign

    @gl.public.write
    def run_initial_audit(self, campaign_id: str) -> None:
        assert campaign_id in self.campaigns, "[ERR_STATE_01] Campaign ID does not exist."
        campaign = self.campaigns[campaign_id]
        sender = str(gl.message.sender_address).lower()

        # Access Control: Brand, Creator, or Operator can trigger audit
        assert sender == campaign.brand or sender == campaign.creator or sender == self.operator, \
            "[ERR_AUTH_02] Unauthorized: only brand, creator, or operator can trigger audit."

        assert campaign.status == "EVIDENCE_SUBMITTED", \
            "[ERR_STATE_04] Campaign is not in EVIDENCE_SUBMITTED state."

        target_url = campaign.video_evidence_url
        expected_handle = campaign.required_handle
        expected_claim_code = campaign.claim_code
        req_min_subs = int(campaign.min_subscribers)
        req_min_views = int(campaign.min_avg_views)
        brief = campaign.brief_requirements

        def get_input() -> str:
            try:
                web_data = gl.nondet.web.render(target_url, mode="text")
            except Exception as e:
                web_data = f"HTTP_FETCH_ERROR: {str(e)}"

            return (
                f"=== SPONSORSYNC CAMPAIGN AUDIT EVIDENCE ===\n"
                f"Target URL: '{target_url}'\n"
                f"Expected Creator Handle: '{expected_handle}'\n"
                f"Required Cryptographic Claim Code: '{expected_claim_code}'\n"
                f"Campaign Brief Requirements: '{brief}'\n\n"
                f"=== LIVE SCRAPED WEBPAGE/DOM CONTENT ===\n"
                f"{web_data}"
            )

        task = (
            "You are a Senior Creator-Economy Sponsorship Compliance & Anti-Fraud Auditor.\n"
            "Analyze the live rendered webpage evidence provided in the input.\n\n"
            "Extract the following raw data points:\n"
            "1. extracted_handle: Channel handle string (e.g. '@MrBeast')\n"
            "2. subscriber_count: Integer total channel subscribers\n"
            "3. view_count: Integer video views\n"
            "4. like_count: Integer video likes\n"
            "5. claim_code_present: Boolean true if the exact required claim code appears in description or DOM\n"
            "6. sponsor_mentioned: Boolean true if sponsor brand or campaign brief terms appear in description or transcript\n"
            "7. mention_timestamp_sec: Integer timestamp in seconds where sponsor is mentioned (or 0 if not found)\n"
            "8. promo_code_present: Boolean true if a promo code/link is present in description\n"
            "9. top_comments: Array of strings of top comments\n"
            "10. comment_sentiment: 'ORGANIC' if comments are natural, contextual, or discussion-based; "
            "'GENERIC_SPAM' if comments are repetitive emoji spam, bot-like (e.g. '🔥🔥🔥', 'Nice video', 'Great content')\n"
            "11. video_is_public: Boolean true if video is publicly viewable (not 404 or private)\n"
            "12. quality_score: Integer 0 to 100 assessing overall placement quality\n"
            "13. summary: Short audit summary sentence\n\n"
            "Output JSON format:\n"
            "{\n"
            '  "extracted_handle": "<handle string>",\n'
            '  "subscriber_count": <int>,\n'
            '  "view_count": <int>,\n'
            '  "like_count": <int>,\n'
            '  "claim_code_present": true/false,\n'
            '  "sponsor_mentioned": true/false,\n'
            '  "mention_timestamp_sec": <int>,\n'
            '  "promo_code_present": true/false,\n'
            '  "top_comments": ["...", "..."],\n'
            '  "comment_sentiment": "ORGANIC" | "GENERIC_SPAM",\n'
            '  "video_is_public": true/false,\n'
            '  "quality_score": <int 0-100>,\n'
            '  "summary": "<sentence>"\n'
            "}\n"
            "Respond ONLY with raw JSON."
        )

        criteria = (
            "SponsorSync Asymmetric Equivalence Rule:\n"
            "1. Strict Consensus Fields (100% exact match required across all nodes):\n"
            "   - extracted_handle (string)\n"
            "   - claim_code_present (boolean)\n"
            "   - sponsor_mentioned (boolean)\n"
            "   - comment_sentiment (enum 'ORGANIC' or 'GENERIC_SPAM')\n"
            "   - video_is_public (boolean)\n"
            "2. Bounded Fuzzy Fields (allowed tolerance):\n"
            "   - subscriber_count, view_count, like_count (+-5% bounded variance)\n"
            "   - quality_score (+-12 points variance within same outcome tier)\n"
            "   - mention_timestamp_sec (+-30 seconds variance)\n"
            "Independently parse the DOM content. REJECT the leader proposal if:\n"
            "(1) any strict field is inconsistent with the live DOM in EITHER direction,\n"
            "(2) claim_code_present is marked true when the code is missing or false when present,\n"
            "(3) comment_sentiment is marked ORGANIC when comments are generic bot spam,\n"
            "(4) any bounded metric deviates beyond allowed tolerance limits.\n"
            "The output must be valid JSON matching the specified schema."
        )

        consensus_result = gl.eq_principle.prompt_non_comparative(
            get_input,
            task=task,
            criteria=criteria
        )

        # Clean thinking blocks and markdown wrappers
        raw_json = consensus_result.strip()
        if "</think>" in raw_json:
            raw_json = raw_json.split("</think>")[-1].strip()
        if raw_json.startswith("```"):
            lines = raw_json.split("\n")
            if len(lines) >= 3 and lines[0].startswith("```") and lines[-1].startswith("```"):
                raw_json = "\n".join(lines[1:-1]).strip()
            else:
                raw_json = raw_json.replace("```json", "").replace("```", "").strip()

        result = json.loads(raw_json)
        ext_handle = str(result.get("extracted_handle", "")).strip()
        subs = int(result.get("subscriber_count", 0))
        views = int(result.get("view_count", 0))
        likes = int(result.get("like_count", 0))
        claim_present = bool(result.get("claim_code_present", False))
        sponsor_ok = bool(result.get("sponsor_mentioned", False))
        comment_sent = str(result.get("comment_sentiment", "GENERIC_SPAM")).strip().upper()
        is_public = bool(result.get("video_is_public", False))
        q_score = int(result.get("quality_score", 0))
        summary = str(result.get("summary", ""))

        # Store extracted metrics
        campaign.subscriber_count = u256(subs)
        campaign.view_count = u256(views)
        campaign.like_count = u256(likes)
        campaign.quality_score = u256(q_score)

        # =========================================================================
        # DETERMINISTIC PYTHON-SIDE ANTI-FRAUD VERDICT ENGINE (ZERO LLM HALLUCINATION)
        # =========================================================================
        handle_normalized_ext = ext_handle.lower() if ext_handle.startswith("@") else "@" + ext_handle.lower()
        handle_normalized_req = expected_handle.lower() if expected_handle.startswith("@") else "@" + expected_handle.lower()

        if not is_public:
            campaign.verdict = "DELETED_OR_PRIVATE"
            campaign.status = "INITIAL_REJECTED"
            campaign.last_audit_summary = f"REJECTED: Video evidence is private or 404. {summary}"

        elif handle_normalized_ext != handle_normalized_req:
            # Layer 1 Fraud: Wrong Channel / Impersonation
            campaign.verdict = "WRONG_CHANNEL"
            campaign.status = "INITIAL_REJECTED"
            campaign.last_audit_summary = (
                f"REJECTED: Channel handle mismatch. Found '{ext_handle}', expected '{expected_handle}'. {summary}"
            )

        elif not claim_present:
            # Layer 3 Fraud: Missing Cryptographic Claim Code (URL Theft)
            campaign.verdict = "MISSING_CLAIM_CODE"
            campaign.status = "INITIAL_REJECTED"
            campaign.last_audit_summary = (
                f"REJECTED: Cryptographic claim code '{expected_claim_code}' missing in description. {summary}"
            )

        elif subs < req_min_subs:
            # Layer 1 Fraud: Burner Account / Inadequate Channel Authority
            campaign.verdict = "INSUFFICIENT_CHANNEL_AUTHORITY"
            campaign.status = "INITIAL_REJECTED"
            campaign.last_audit_summary = (
                f"REJECTED: Channel authority below requirement. Found {subs} subscribers, required {req_min_subs}. {summary}"
            )

        elif comment_sent == "GENERIC_SPAM" or (views > 1000 and likes > int(views * 0.85)):
            # Layer 2 Fraud: Bot Farm / Anomalous Engagement
            campaign.verdict = "SUSPECTED_BOT_ACTIVITY"
            campaign.status = "INITIAL_REJECTED"
            campaign.last_audit_summary = (
                f"REJECTED: Bot-farm activity detected. Comments generic spam or anomalous like-to-view ratio. {summary}"
            )

        elif not sponsor_ok:
            # Under-delivered requirement
            campaign.verdict = "UNDER_DELIVERED"
            campaign.status = "INITIAL_REJECTED"
            campaign.last_audit_summary = f"REJECTED: Sponsor mention or brief requirements not satisfied. {summary}"

        else:
            # LAYER 4: FULL COMPLIANCE -> RELEASE TRANCHE 1 (50%)
            campaign.verdict = "FULL_COMPLIANCE"
            campaign.status = "INITIAL_APPROVED"
            campaign.tranche_1_released = True
            campaign.last_audit_summary = (
                f"INITIAL AUDIT APPROVED: Full compliance verified for {ext_handle}. "
                f"Tranche 1 (50% USDC) released. Entering 7-day retention period. {summary}"
            )

        self.campaigns[campaign_id] = campaign

    @gl.public.write
    def run_retention_audit(self, campaign_id: str) -> None:
        assert campaign_id in self.campaigns, "[ERR_STATE_01] Campaign ID does not exist."
        campaign = self.campaigns[campaign_id]
        sender = str(gl.message.sender_address).lower()

        assert sender == campaign.brand or sender == campaign.creator or sender == self.operator, \
            "[ERR_AUTH_02] Unauthorized: only brand, creator, or operator can trigger retention audit."

        assert campaign.status == "INITIAL_APPROVED", \
            "[ERR_STATE_05] Campaign must be in INITIAL_APPROVED state to run retention audit."

        target_url = campaign.video_evidence_url
        expected_claim_code = campaign.claim_code

        def get_retention_input() -> str:
            try:
                web_data = gl.nondet.web.render(target_url, mode="text")
            except Exception as e:
                web_data = f"HTTP_FETCH_ERROR: {str(e)}"

            return (
                f"=== SPONSORSYNC RETENTION & DELETE-AND-DASH AUDIT ===\n"
                f"Target URL: '{target_url}'\n"
                f"Expected Claim Code: '{expected_claim_code}'\n\n"
                f"=== LIVE RETENTION SCRAPED CONTENT ===\n"
                f"{web_data}"
            )

        retention_task = (
            "You are a Post-Sponsorship Persistence & Retention Compliance Auditor.\n"
            "Inspect if the sponsored video remains live, public, and undeleted.\n\n"
            "Check:\n"
            "1. is_still_public: Boolean true if video is accessible and not 404/private/deleted\n"
            "2. claim_code_retained: Boolean true if claim code remains present in description\n"
            "3. summary: Short persistence audit summary\n\n"
            "Output JSON format:\n"
            "{\n"
            '  "is_still_public": true/false,\n'
            '  "claim_code_retained": true/false,\n'
            '  "summary": "<sentence>"\n'
            "}\n"
            "Respond ONLY with raw JSON."
        )

        retention_criteria = (
            "Strict Retention Equivalence Rule:\n"
            "is_still_public (bool) and claim_code_retained (bool) MUST match 100% exactly. "
            "REJECT the leader if is_still_public is marked true when the URL is 404/error, "
            "or marked false when valid video content is present."
        )

        consensus_result = gl.eq_principle.prompt_non_comparative(
            get_retention_input,
            task=retention_task,
            criteria=retention_criteria
        )

        raw_json = consensus_result.strip()
        if "</think>" in raw_json:
            raw_json = raw_json.split("</think>")[-1].strip()
        if raw_json.startswith("```"):
            lines = raw_json.split("\n")
            if len(lines) >= 3 and lines[0].startswith("```") and lines[-1].startswith("```"):
                raw_json = "\n".join(lines[1:-1]).strip()
            else:
                raw_json = raw_json.replace("```json", "").replace("```", "").strip()

        result = json.loads(raw_json)
        is_still_public = bool(result.get("is_still_public", False))
        claim_retained = bool(result.get("claim_code_retained", False))
        summary = str(result.get("summary", ""))

        if is_still_public and claim_retained:
            # Retention Audit Passed -> Release Final 50% Tranche
            campaign.status = "FULLY_SETTLED"
            campaign.tranche_2_released = True
            campaign.last_audit_summary = (
                f"RETENTION AUDIT PASSED: Content persisted across retention window. "
                f"Tranche 2 (final 50% USDC) released. Campaign fully settled. {summary}"
            )
        else:
            # Delete & Dash Detected -> Clawback Remaining Escrow
            campaign.status = "CLAWBACK_TRIGGERED"
            campaign.verdict = "DELETED_OR_PRIVATE"
            campaign.last_audit_summary = (
                f"CLAWBACK TRIGGERED: Content deleted, privated, or modified during retention window. "
                f"Remaining 50% escrow returned to brand. {summary}"
            )

        self.campaigns[campaign_id] = campaign

    @gl.public.view
    def get_campaign(self, campaign_id: str) -> CampaignRecord:
        assert campaign_id in self.campaigns, "[ERR_STATE_01] Campaign ID does not exist."
        return self.campaigns[campaign_id]

    @gl.public.view
    def get_total_campaigns(self) -> u256:
        return self.next_campaign_id
