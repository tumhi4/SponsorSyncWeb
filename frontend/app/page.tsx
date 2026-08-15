'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Bot, 
  Key, 
  Clock, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';

export default function SponsorSyncApp() {
  const [activeTab, setActiveTab] = useState<'brand' | 'creator' | 'consensus'>('brand');
  const [selectedDemo, setSelectedDemo] = useState<'perfect' | 'burner' | 'botfarm'>('perfect');
  const [auditStep, setAuditStep] = useState<number>(0);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  // Mock Campaign State
  const [campaign, setCampaign] = useState({
    id: 'SPONSOR_CAMPAIGN_001',
    brand: '0x09fa...71c3',
    creator: '0x3ea6...8f3a',
    requiredHandle: '@MrBeast',
    platform: 'YOUTUBE',
    minSubscribers: 1000000,
    minViews: 500000,
    escrowAmountUsdc: 5000,
    claimCode: 'GL-VERIFY-8F3K2',
    videoUrl: 'https://metaremover.github.io/demo/youtube_perfect.html',
    status: 'EVIDENCE_SUBMITTED',
    verdict: 'PENDING',
    tranche1: false,
    tranche2: false,
  });

  const demoUrls = {
    perfect: 'https://metaremover.github.io/demo/youtube_perfect.html',
    burner: 'https://metaremover.github.io/demo/youtube_burner.html',
    botfarm: 'https://metaremover.github.io/demo/youtube_botfarm.html',
  };

  const runAuditSimulation = () => {
    setIsAuditing(true);
    setAuditStep(1);

    setTimeout(() => setAuditStep(2), 1200); // Authority check
    setTimeout(() => setAuditStep(3), 2400); // Bot farm check
    setTimeout(() => setAuditStep(4), 3600); // Claim code check
    setTimeout(() => {
      setAuditStep(5);
      setIsAuditing(false);
      if (selectedDemo === 'perfect') {
        setCampaign(prev => ({
          ...prev,
          status: 'INITIAL_APPROVED',
          verdict: 'FULL_COMPLIANCE',
          tranche1: true,
        }));
      } else if (selectedDemo === 'burner') {
        setCampaign(prev => ({
          ...prev,
          status: 'INITIAL_REJECTED',
          verdict: 'WRONG_CHANNEL',
        }));
      } else {
        setCampaign(prev => ({
          ...prev,
          status: 'INITIAL_REJECTED',
          verdict: 'SUSPECTED_BOT_ACTIVITY',
        }));
      }
    }, 4800);
  };

  const runRetentionSimulation = () => {
    setIsAuditing(true);
    setAuditStep(6);
    setTimeout(() => {
      setIsAuditing(false);
      setCampaign(prev => ({
        ...prev,
        status: 'FULLY_SETTLED',
        tranche2: true,
      }));
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              SponsorSync
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                GenLayer Intelligent Contract
              </span>
            </h1>
            <p className="text-xs text-slate-400">Sponsorship payouts released on proof, not promises.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('brand')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'brand' ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Brand Portal
          </button>
          <button 
            onClick={() => setActiveTab('creator')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'creator' ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Creator Portal
          </button>
          <button 
            onClick={() => setActiveTab('consensus')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'consensus' ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Consensus Inspector
          </button>
        </div>
      </header>

      {/* 4 Anti-Fraud Layers Hero Banner */}
      <section className="px-6 py-6 border-b border-slate-800/80 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm mb-1">
                <ShieldCheck className="w-4 h-4" /> Layer 1: Authority Gate
              </div>
              <p className="text-xs text-slate-400">Enforces min subscribers & 30-day views to eliminate burner accounts.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm mb-1">
                <Bot className="w-4 h-4" /> Layer 2: Bot-Farm Detection
              </div>
              <p className="text-xs text-slate-400">Semantic AI analysis flags generic emoji spam comments and anomalous ratios.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm mb-1">
                <Key className="w-4 h-4" /> Layer 3: Claim Code Binding
              </div>
              <p className="text-xs text-slate-400">Unique cryptographic token binds the creator wallet to the video description.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm mb-1">
                <Clock className="w-4 h-4" /> Layer 4: Temporal Clawback
              </div>
              <p className="text-xs text-slate-400">50% Day 0 + 50% Day 7 retention audit prevents delete-and-dash fraud.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
        {/* Interactive Studio Demo Runner Bar */}
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-700 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Interactive Consensus Demo Runner
            </span>
            <h2 className="text-lg font-bold text-white">Test Anti-Fraud Scenarios Live</h2>
            <p className="text-xs text-slate-400">Select a mock DOM test case to evaluate GenLayer AI consensus behavior:</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedDemo}
              onChange={(e) => {
                const val = e.target.value as any;
                setSelectedDemo(val);
                setCampaign(prev => ({
                  ...prev,
                  videoUrl: demoUrls[val],
                  status: 'EVIDENCE_SUBMITTED',
                  verdict: 'PENDING',
                  tranche1: false,
                  tranche2: false,
                }));
                setAuditStep(0);
              }}
              className="bg-slate-950 border border-slate-700 text-sm rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="perfect">TC-01: Full Compliance (@MrBeast)</option>
              <option value="burner">TC-02: Burner Channel Fraud</option>
              <option value="botfarm">TC-03: Bot-Farm Comment Spam</option>
            </select>

            <button
              onClick={runAuditSimulation}
              disabled={isAuditing}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20"
            >
              <Play className="w-4 h-4 fill-slate-950" /> Run AI Audit
            </button>
          </div>
        </div>

        {/* Dynamic View: Brand / Creator / Consensus */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Campaign Details & Escrow Vesting */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" /> Active Campaign Escrow
              </h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Campaign ID</span>
                  <span className="font-mono text-cyan-300 font-medium">{campaign.id}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Required Handle</span>
                  <span className="font-semibold text-white">{campaign.requiredHandle}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Locked Escrow</span>
                  <span className="font-bold text-green-400">${campaign.escrowAmountUsdc.toLocaleString()} USDC</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Claim Code</span>
                  <span className="font-mono text-amber-400 font-semibold">{campaign.claimCode}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Status</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-cyan-400 border border-cyan-500/30">
                    {campaign.status}
                  </span>
                </div>
              </div>

              {/* 50/50 Staged Vesting Progress */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-300">Staged 50/50 Vesting Engine:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-3 rounded-lg border text-center ${campaign.tranche1 ? 'bg-green-500/10 border-green-500/40 text-green-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                    <div className="text-[10px] font-semibold uppercase">Tranche 1 (50%)</div>
                    <div className="text-sm font-bold mt-1">$2,500 USDC</div>
                    <div className="text-[10px] mt-1">{campaign.tranche1 ? '✓ Released' : 'Locked'}</div>
                  </div>
                  <div className={`p-3 rounded-lg border text-center ${campaign.tranche2 ? 'bg-green-500/10 border-green-500/40 text-green-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                    <div className="text-[10px] font-semibold uppercase">Tranche 2 (50%)</div>
                    <div className="text-sm font-bold mt-1">$2,500 USDC</div>
                    <div className="text-[10px] mt-1">{campaign.tranche2 ? '✓ Settled' : '7-Day Retention'}</div>
                  </div>
                </div>

                {campaign.tranche1 && !campaign.tranche2 && (
                  <button
                    onClick={runRetentionSimulation}
                    disabled={isAuditing}
                    className="w-full mt-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold border border-cyan-500/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" /> Execute Day 7 Retention Audit
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right 2 Columns: Live Consensus Verification Pipeline */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" /> GenLayer AI Consensus Pipeline
                  </h3>
                  <p className="text-xs text-slate-400">Independent optimistic democracy validator execution steps:</p>
                </div>
                {campaign.verdict !== 'PENDING' && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    campaign.verdict === 'FULL_COMPLIANCE' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}>
                    Verdict: {campaign.verdict}
                  </span>
                )}
              </div>

              {/* Step Flow */}
              <div className="space-y-3">
                {/* Step 1 */}
                <div className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                  auditStep >= 1 ? 'bg-slate-950 border-cyan-500/50' : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      auditStep >= 1 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      1
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Live Webpage / DOM Render</div>
                      <div className="text-xs text-slate-400 font-mono">{campaign.videoUrl}</div>
                    </div>
                  </div>
                  {auditStep >= 1 && <CheckCircle2 className="w-5 h-5 text-cyan-400" />}
                </div>

                {/* Step 2 */}
                <div className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                  auditStep >= 2 ? (selectedDemo === 'burner' ? 'bg-rose-950/20 border-rose-500/50' : 'bg-slate-950 border-cyan-500/50') : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      auditStep >= 2 ? (selectedDemo === 'burner' ? 'bg-rose-500 text-white' : 'bg-cyan-500 text-slate-950') : 'bg-slate-800 text-slate-400'
                    }`}>
                      2
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Layer 1: Channel Authority & Handle Match</div>
                      <div className="text-xs text-slate-400">
                        {selectedDemo === 'burner' ? 'FAIL: Handle mismatch (@MrBeastBurner99) & <50k subs' : 'PASS: Handle verified (@MrBeast) & 245M subs'}
                      </div>
                    </div>
                  </div>
                  {auditStep >= 2 && (selectedDemo === 'burner' ? <XCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-cyan-400" />)}
                </div>

                {/* Step 3 */}
                <div className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                  auditStep >= 3 ? (selectedDemo === 'botfarm' ? 'bg-rose-950/20 border-rose-500/50' : 'bg-slate-950 border-cyan-500/50') : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      auditStep >= 3 ? (selectedDemo === 'botfarm' ? 'bg-rose-500 text-white' : 'bg-cyan-500 text-slate-950') : 'bg-slate-800 text-slate-400'
                    }`}>
                      3
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Layer 2: Semantic Comment & Bot-Farm Analysis</div>
                      <div className="text-xs text-slate-400">
                        {selectedDemo === 'botfarm' ? 'FAIL: 95% generic bot spam comments detected' : 'PASS: Organic contextual discussion verified'}
                      </div>
                    </div>
                  </div>
                  {auditStep >= 3 && (selectedDemo === 'botfarm' ? <XCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-cyan-400" />)}
                </div>

                {/* Step 4 */}
                <div className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                  auditStep >= 4 ? 'bg-slate-950 border-cyan-500/50' : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      auditStep >= 4 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      4
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Layer 3: Cryptographic Claim Code Validation</div>
                      <div className="text-xs text-slate-400 font-mono">Found: GL-VERIFY-8F3K2 (Proof of Channel Control)</div>
                    </div>
                  </div>
                  {auditStep >= 4 && <CheckCircle2 className="w-5 h-5 text-cyan-400" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-500">
        SponsorSync · Built on GenLayer Intelligent Contracts · Asymmetric Equivalence & Deterministic Anti-Fraud Engine
      </footer>
    </div>
  );
}
