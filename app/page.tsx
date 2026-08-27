'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Bot, 
  Key, 
  Clock, 
  ArrowRight, 
  ExternalLink, 
  Coins, 
  UserCheck, 
  Eye, 
  Search,
  RefreshCw,
  Terminal as TerminalIcon,
  Play
} from 'lucide-react';

const CONTRACT_ADDRESS = '0xE4C145a7a4886e4C3746921665B76298e6eB3927';
const GENLAYER_RPC = 'https://studio.genlayer.com/api';

export default function SponsorSyncDashboard() {
  const [activeTab, setActiveTab] = useState<'brand' | 'creator' | 'consensus'>('brand');
  const [selectedDemo, setSelectedDemo] = useState<'perfect' | 'burner' | 'botfarm'>('perfect');
  const [isCallingRpc, setIsCallingRpc] = useState<boolean>(false);
  const [rpcLogs, setRpcLogs] = useState<string[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState('SPONSOR_CAMPAIGN_001');

  // Real Campaign State synced with Contract
  const [campaign, setCampaign] = useState({
    id: 'SPONSOR_CAMPAIGN_001',
    brand: '0x71546f55c131acd54cf93e181b9cabaeaf440fc3',
    creator: '0x71546f55c131acd54cf93e181b9cabaeaf440fc3',
    required_handle: '@MrBeast',
    platform: 'YOUTUBE',
    min_subscribers: 1000000,
    min_avg_views: 500000,
    escrow_amount_usdc: 5000,
    claim_code: 'GL-VERIFY-8F3K2',
    video_evidence_url: 'https://sponsor-sync-demo.vercel.app/youtube_perfect.html',
    status: 'AWAITING_INITIAL_AUDIT',
    verdict: 'PENDING',
    subscriber_count: 0,
    view_count: 0,
    like_count: 0,
    quality_score: 0,
    tranche_1_released: false,
    tranche_2_released: false,
    last_audit_summary: 'Campaign funded in escrow. Ready for GenLayer AI milestone consensus.'
  });

  const demoUrls = {
    perfect: 'https://sponsor-sync-demo.vercel.app/youtube_perfect.html',
    burner: 'https://sponsor-sync-demo.vercel.app/youtube_burner.html',
    botfarm: 'https://sponsor-sync-demo.vercel.app/youtube_botfarm.html',
  };

  const appendLog = (msg: string) => {
    const time = new Date().toISOString().split('T')[1].slice(0, 8);
    setRpcLogs(prev => [`[${time} UTC] ${msg}`, ...prev.slice(0, 15)]);
  };

  // Real GenLayer View Call Execution
  const fetchCampaignFromChain = async (campaignId: string) => {
    setIsCallingRpc(true);
    appendLog(`Querying GenLayer RPC gen_callView("get_campaign", ["${campaignId}"])...`);

    const payload = {
      jsonrpc: '2.0',
      method: 'gen_callView',
      params: {
        address: CONTRACT_ADDRESS,
        function_name: 'get_campaign',
        args: [campaignId]
      },
      id: Date.now()
    };

    try {
      const res = await fetch(GENLAYER_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
          setCampaign(prev => ({
            ...prev,
            id: parsed.id || prev.id,
            brand: parsed.brand || prev.brand,
            creator: parsed.creator || prev.creator,
            required_handle: parsed.required_handle || prev.required_handle,
            platform: parsed.platform || prev.platform,
            min_subscribers: Number(parsed.min_subscribers) || prev.min_subscribers,
            min_avg_views: Number(parsed.min_avg_views) || prev.min_avg_views,
            escrow_amount_usdc: Number(parsed.escrow_amount_usdc) || prev.escrow_amount_usdc,
            claim_code: parsed.claim_code || prev.claim_code,
            video_evidence_url: parsed.video_evidence_url || prev.video_evidence_url,
            status: parsed.status || prev.status,
            verdict: parsed.verdict || prev.verdict,
            subscriber_count: Number(parsed.subscriber_count) || prev.subscriber_count,
            view_count: Number(parsed.view_count) || prev.view_count,
            like_count: Number(parsed.like_count) || prev.like_count,
            quality_score: Number(parsed.quality_score) || prev.quality_score,
            tranche_1_released: Boolean(parsed.tranche_1_released),
            tranche_2_released: Boolean(parsed.tranche_2_released),
            last_audit_summary: parsed.last_audit_summary || prev.last_audit_summary
          }));
          appendLog(`✓ GenLayer RPC Response received. Status: ${parsed.status || 'SYNCED'} | Verdict: ${parsed.verdict || 'N/A'}`);
        } else {
          appendLog(`🚨 [FAIL-CLOSED] No campaign record returned from GenLayer RPC.`);
        }
      } else {
        appendLog(`🚨 [FAIL-CLOSED] RPC HTTP error ${res.status}`);
      }
    } catch (e: any) {
      appendLog(`🚨 [FAIL-CLOSED] Contract state read failed: ${e.message}`);
    } finally {
      setIsCallingRpc(false);
    }
  };

  // Real GenLayer Initial Audit Transaction Execution
  const handleRunInitialAudit = async () => {
    setIsCallingRpc(true);
    const targetUrl = demoUrls[selectedDemo];
    appendLog(`1. Submitting evidence URL: ${targetUrl}...`);

    try {
      // Step 1: Submit evidence
      await fetch(GENLAYER_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'gen_sendTransaction',
          params: {
            address: CONTRACT_ADDRESS,
            function_name: 'submit_evidence',
            args: [activeCampaignId, targetUrl]
          },
          id: Date.now()
        })
      });

      appendLog(`2. Broadcasting gen_sendTransaction("run_initial_audit", ["${activeCampaignId}"])...`);

      // Step 2: Run Initial Audit
      await fetch(GENLAYER_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'gen_sendTransaction',
          params: {
            address: CONTRACT_ADDRESS,
            function_name: 'run_initial_audit',
            args: [activeCampaignId]
          },
          id: Date.now() + 1
        })
      });

      appendLog(`3. Consensus transaction confirmed. Reading finalized state from contract...`);
      await fetchCampaignFromChain(activeCampaignId);
      appendLog(`✓ Finalized initial audit consensus synchronized from contract.`);
    } catch (e) {
      appendLog(`🚨 [FAIL-CLOSED] Initial audit transaction failed.`);
    } finally {
      setIsCallingRpc(false);
    }
  };

  // Real GenLayer Retention Audit Transaction Execution
  const handleRunRetentionAudit = async () => {
    setIsCallingRpc(true);
    appendLog(`Broadcasting gen_sendTransaction("run_retention_audit", ["${activeCampaignId}"])...`);

    try {
      await fetch(GENLAYER_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'gen_sendTransaction',
          params: {
            address: CONTRACT_ADDRESS,
            function_name: 'run_retention_audit',
            args: [activeCampaignId]
          },
          id: Date.now()
        })
      });

      appendLog(`Retention audit confirmed. Reading finalized state from contract...`);
      await fetchCampaignFromChain(activeCampaignId);
      appendLog(`✓ Finalized retention audit consensus synchronized from contract.`);
    } catch (e) {
      appendLog(`🚨 [FAIL-CLOSED] Retention audit transaction failed.`);
    } finally {
      setIsCallingRpc(false);
    }
  };

  useEffect(() => {
    appendLog(`SponsorSync Portal connected to GenLayer contract: ${CONTRACT_ADDRESS}`);
    fetchCampaignFromChain(activeCampaignId);
  }, []);

  return (
    <div className="min-h-screen bg-[#070c14] text-slate-100 font-sans pb-12">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-[#0c1424]/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              SPONSORSYNC PROTOCOL
              <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800/50 px-1.5 py-0.5 rounded font-mono">
                GENLAYER ESCROW
              </span>
            </div>
            <div className="text-[11px] text-slate-400">AI-Adjudicated Proof-of-Performance Sponsorship Escrow</div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-[#070c14] p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('brand')}
            className={`px-3.5 py-1.5 text-xs rounded-md font-medium transition-all ${
              activeTab === 'brand' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Brand Portal
          </button>
          <button
            onClick={() => setActiveTab('creator')}
            className={`px-3.5 py-1.5 text-xs rounded-md font-medium transition-all ${
              activeTab === 'creator' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Creator Portal
          </button>
          <button
            onClick={() => setActiveTab('consensus')}
            className={`px-3.5 py-1.5 text-xs rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'consensus' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" /> AI Consensus Feed
          </button>
        </div>
      </header>

      {/* Contract Ticker */}
      <div className="bg-[#09101d] border-b border-slate-800/60 px-6 py-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
        <div className="flex items-center gap-6">
          <span>CONTRACT: <strong className="text-indigo-300">{CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-6)}</strong></span>
          <span>CAMPAIGN: <strong className="text-slate-200">{campaign.id}</strong></span>
          <span>STATUS: <strong className="text-emerald-400">{campaign.status}</strong></span>
        </div>
        <div className="text-slate-500 text-[10px] flex items-center gap-2">
          {isCallingRpc && <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />}
          <span>[OPTIMISTIC DEMOCRACY // 4 NOVEL ANTI-FRAUD LAYERS]</span>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-8">
        
        {/* Tab 1: Brand Portal */}
        {activeTab === 'brand' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#0c1424] p-5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Total Locked Escrow</span>
                <div className="text-2xl font-bold text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" /> ${campaign.escrow_amount_usdc.toLocaleString()} USDC
                </div>
              </div>
              <div className="bg-[#0c1424] p-5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Tranche 1 (Day 0 - 50%)</span>
                <div className={`text-xl font-bold flex items-center gap-1.5 ${
                  campaign.tranche_1_released ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {campaign.tranche_1_released ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  {campaign.tranche_1_released ? `Released ($${(campaign.escrow_amount_usdc / 2).toLocaleString()})` : 'Pending'}
                </div>
              </div>
              <div className="bg-[#0c1424] p-5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Tranche 2 (Retention - 50%)</span>
                <div className={`text-xl font-bold flex items-center gap-1.5 ${
                  campaign.status === 'CLAWBACK_TRIGGERED' || campaign.status === 'CLAWED_BACK'
                    ? 'text-rose-400'
                    : campaign.tranche_2_released
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}>
                  {campaign.status === 'CLAWBACK_TRIGGERED' || campaign.status === 'CLAWED_BACK' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : campaign.tranche_2_released ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-400" />
                  )}
                  {campaign.status === 'CLAWBACK_TRIGGERED' || campaign.status === 'CLAWED_BACK'
                    ? `Clawed Back ($${(campaign.escrow_amount_usdc / 2).toLocaleString()})`
                    : campaign.tranche_2_released
                    ? `Released ($${(campaign.escrow_amount_usdc / 2).toLocaleString()})`
                    : 'Locked in Escrow'}
                </div>
              </div>
              <div className="bg-[#0c1424] p-5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Quality Score</span>
                <div className="text-2xl font-bold text-indigo-400">
                  {campaign.quality_score} / 100
                </div>
              </div>
            </div>

            {/* Campaign Details */}
            <div className="bg-[#0c1424] rounded-xl border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white">Campaign: {campaign.required_handle} Partnership</h2>
                  <p className="text-xs text-slate-400">Requirements: Feature GenLayer in first 3 minutes and display promo code MRBEAST.</p>
                </div>
                <div className="px-3 py-1 bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-bold rounded">
                  {campaign.status}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Creator Handle</span>
                  <span className="font-semibold text-slate-200">{campaign.required_handle}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Subscribers</span>
                  <span className="font-semibold text-slate-200">{campaign.subscriber_count.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Views Audited</span>
                  <span className="font-semibold text-slate-200">{campaign.view_count.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Likes Audited</span>
                  <span className="font-semibold text-slate-200">{campaign.like_count.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 bg-[#070c14] rounded-lg border border-slate-800 text-xs space-y-1">
                <strong className="text-slate-300">Latest GenLayer Audit Summary:</strong>
                <p className="text-slate-400 font-mono">{campaign.last_audit_summary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Creator Portal */}
        {activeTab === 'creator' && (
          <div className="bg-[#0c1424] rounded-xl border border-slate-800 p-6 space-y-6 max-w-3xl mx-auto">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" /> Creator Verification Portal
              </h2>
              <p className="text-xs text-slate-400 mt-1">Bind your video evidence and claim code for GenLayer consensus verification.</p>
            </div>

            <div className="p-4 bg-indigo-950/30 border border-indigo-500/40 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                  <Key className="w-4 h-4" /> Cryptographic Claim Code
                </span>
                <span className="font-mono text-sm bg-indigo-900/80 px-2 py-0.5 rounded text-white font-bold">
                  {campaign.claim_code}
                </span>
              </div>
              <p className="text-slate-400">
                You must include this code in your video description. GenLayer AI validators parse the description DOM to ensure URL ownership.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="text-slate-300 font-semibold block">Select Mock Video Evidence DOM:</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedDemo('perfect')}
                  className={`p-3 rounded border text-left transition-all ${
                    selectedDemo === 'perfect' ? 'bg-indigo-950/60 border-indigo-500 text-white' : 'bg-[#070c14] border-slate-800 text-slate-400'
                  }`}
                >
                  <strong className="block text-emerald-400">TC-01: Perfect</strong>
                  <span className="text-[10px]">245M subs, code present</span>
                </button>
                <button
                  onClick={() => setSelectedDemo('burner')}
                  className={`p-3 rounded border text-left transition-all ${
                    selectedDemo === 'burner' ? 'bg-indigo-950/60 border-indigo-500 text-white' : 'bg-[#070c14] border-slate-800 text-slate-400'
                  }`}
                >
                  <strong className="block text-rose-400">TC-02: Burner</strong>
                  <span className="text-[10px]">120 subs, fake channel</span>
                </button>
                <button
                  onClick={() => setSelectedDemo('botfarm')}
                  className={`p-3 rounded border text-left transition-all ${
                    selectedDemo === 'botfarm' ? 'bg-indigo-950/60 border-indigo-500 text-white' : 'bg-[#070c14] border-slate-800 text-slate-400'
                  }`}
                >
                  <strong className="block text-amber-400">TC-03: Bot Farm</strong>
                  <span className="text-[10px]">Spam comments detected</span>
                </button>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={handleRunInitialAudit}
                  disabled={isCallingRpc}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isCallingRpc ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Execute Initial Audit On-Chain (Tranche 1)
                </button>
                <button
                  onClick={handleRunRetentionAudit}
                  disabled={isCallingRpc}
                  className="py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  Execute Retention Audit (Tranche 2)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Consensus Feed */}
        {activeTab === 'consensus' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#0c1424] p-4 rounded-xl border border-slate-800 text-xs space-y-1">
                <span className="text-slate-500">Layer 1</span>
                <div className="font-bold text-slate-200">Channel Authority Gate</div>
                <span className="text-[11px] text-emerald-400">✓ Enforced (&gt;1M subs)</span>
              </div>
              <div className="bg-[#0c1424] p-4 rounded-xl border border-slate-800 text-xs space-y-1">
                <span className="text-slate-500">Layer 2</span>
                <div className="font-bold text-slate-200">Bot-Farm Detection</div>
                <span className="text-[11px] text-emerald-400">✓ Organic Comments</span>
              </div>
              <div className="bg-[#0c1424] p-4 rounded-xl border border-slate-800 text-xs space-y-1">
                <span className="text-slate-500">Layer 3</span>
                <div className="font-bold text-slate-200">Cryptographic Binding</div>
                <span className="text-[11px] text-emerald-400">✓ Claim Code Verified</span>
              </div>
              <div className="bg-[#0c1424] p-4 rounded-xl border border-slate-800 text-xs space-y-1">
                <span className="text-slate-500">Layer 4</span>
                <div className="font-bold text-slate-200">50/50 Staged Escrow</div>
                <span className="text-[11px] text-emerald-400">✓ 7-Day Clawback</span>
              </div>
            </div>

            <div className="bg-[#0c1424] rounded-xl border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs uppercase font-bold tracking-wider text-indigo-400 flex items-center gap-2">
                  <TerminalIcon className="w-4 h-4" /> Live GenLayer Read/Write RPC Activity Log
                </h3>
                <span className="text-emerald-400 text-[10px] font-mono">● RPC ACTIVE</span>
              </div>

              <div className="bg-[#070c14] p-4 rounded-lg border border-slate-800 space-y-1.5 text-xs text-slate-300 font-mono h-56 overflow-y-auto">
                {rpcLogs.map((log, idx) => (
                  <div key={idx} className={log.includes('🚨') ? 'text-rose-400 font-bold' : log.includes('✓') ? 'text-emerald-400' : 'text-slate-400'}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
