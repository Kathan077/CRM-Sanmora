'use client';

import React, { useState, useMemo } from 'react';
import './EnterpriseDashboard.css';
import CrmCalendarWidget from './CrmCalendarWidget';
import {
  Search, Calendar, Download, TrendingUp, TrendingDown,
  Users, DollarSign, Activity, ShieldCheck, Sparkles,
  PieChart, Layers, ArrowUpRight, ArrowRight, Zap, Target,
  AlertTriangle, CheckCircle2, Clock, Filter, Eye, RefreshCw, X
} from 'lucide-react';

export default function EnterpriseDashboard({ leads = [], followups = [], tasks = [], employees = [] }) {
  const [dateRange, setDateRange] = useState('May 1 - May 31');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showAiInsightModal, setShowAiInsightModal] = useState(false);

  // Dynamic AI Insight Analytics derived from real CRM store
  const aiInsightStats = useMemo(() => {
    const totalL = leads.length;
    const wonL = leads.filter(l => (l.status || '').toLowerCase().includes('won') || (l.stage || '').toLowerCase().includes('won')).length;
    const convRate = totalL > 0 ? Math.round((wonL / totalL) * 100) : 36;
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueFups = followups.filter(f => f.nextFollowupDate && f.nextFollowupDate < todayStr).length;
    const hotLeads = leads.filter(l => (l.status || '').toLowerCase().includes('hot') || (l.status || '').toLowerCase().includes('prospect')).length;

    let dynamicText = `Businesses using <strong>Advanced Automation</strong> see <strong>36% higher retention rates</strong>`;
    if (overdueFups > 0) {
      dynamicText = `AI Alert: <strong>${overdueFups} high-priority follow-up${overdueFups > 1 ? 's are' : ' is'} overdue</strong>. Immediate team action recommended to prevent deal slippage.`;
    } else if (hotLeads > 0) {
      dynamicText = `AI Analysis: <strong>${hotLeads} hot pipeline prospect${hotLeads > 1 ? 's are' : ' is'} in active negotiation</strong> with high closing probability.`;
    } else if (totalL > 0) {
      dynamicText = `AI Insights: Active CRM pipeline achieves <strong>${convRate}% lead conversion velocity</strong> across assigned touchpoints.`;
    }

    return { totalL, wonL, convRate, overdueFups, hotLeads, dynamicText };
  }, [leads, followups]);

  // --- MOCK & DYNAMIC CALCULATIONS MATCHING THE REFERENCE IMAGE ---
  const totalRevenueVal = useMemo(() => {
    const sum = leads.reduce((acc, l) => acc + (Number(l.leadValue || l.value) || 0), 0);
    return sum > 0 ? sum : 248420;
  }, [leads]);

  const activeAccountsCount = useMemo(() => {
    return leads.length > 0 ? leads.length * 24 + 1842 : 1842;
  }, [leads]);

  const mrrVal = Math.round(totalRevenueVal * 0.77);
  const conversionRate = 2.74;
  const churnRate = 1.28;
  const healthScore = 89;

  // Accounts at Risk Dataset (matching reference image)
  const accountsAtRisk = [
    { name: 'COOL Corp.', score: 32, trend: [30, 28, 35, 25, 32], lastActive: '7 days ago', usage: 12, value: 1200, risk: 'Low Usage', riskColor: 'red' },
    { name: 'CHEAKY Industries.', score: 48, trend: [40, 45, 42, 50, 48], lastActive: '5 days ago', usage: 25, value: 2400, risk: 'Low Engagement', riskColor: 'amber' },
    { name: 'SNEAKY Enterprises', score: 61, trend: [55, 60, 58, 65, 61], lastActive: '3 days ago', usage: 40, value: 3000, risk: 'Feature Underused', riskColor: 'yellow' },
    { name: 'SUSPICIOUS LLC', score: 61, trend: [50, 52, 60, 58, 61], lastActive: '1 days ago', usage: 55, value: 4800, risk: 'Billing Issue', riskColor: 'cyan' },
    { name: 'CURIOUS Corp', score: 86, trend: [80, 82, 85, 84, 86], lastActive: 'Just now', usage: 80, value: 6000, risk: 'None', riskColor: 'green' }
  ];

  return (
    <div className="enterprise-dash-container">
      
      {/* ── 1. GLOBAL TOP CONTROL BAR (SEARCH, DATE RANGE, EXPORT) ── */}
      <div className="ent-top-bar">
        <div className="ent-search-box">
          <Search size={16} className="search-icn" />
          <input
            type="text"
            placeholder="Search leads, accounts, analytics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd className="cmd-k">⌘K</kbd>
        </div>

        <div className="ent-controls-right">
          <div className="ent-date-picker-btn">
            <Calendar size={15} />
            <span>{dateRange}</span>
          </div>

          <button className="ent-export-btn">
            <Download size={15} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ── 2. TOP 6 EXECUTIVE KPI SPARKLINE CARDS ── */}
      <div className="kpi-sparkline-grid">
        
        {/* CARD 1: TOTAL REVENUE */}
        <div className="kpi-spark-card">
          <div className="kpi-spark-head">
            <span className="kpi-spark-title">Total Revenue</span>
            <span className="live-badge">● LIVE</span>
          </div>
          <div className="kpi-spark-val">${totalRevenueVal.toLocaleString('en-US')}</div>
          <div className="kpi-spark-diff positive">
            <TrendingUp size={12} />
            <span><strong>+18.6%</strong> vs Apr 1 - Apr 30</span>
          </div>
          {/* Wave Graphic SVG */}
          <svg className="spark-svg wave" viewBox="0 0 200 40">
            <path
              d="M0,25 C30,10 60,35 90,15 C120,38 150,5 180,20 L200,10 L200,40 L0,40 Z"
              fill="url(#waveGrad1)"
            />
            <defs>
              <linearGradient id="waveGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* CARD 2: ACTIVE ACCOUNTS */}
        <div className="kpi-spark-card">
          <div className="kpi-spark-head">
            <span className="kpi-spark-title">Active Accounts</span>
          </div>
          <div className="kpi-spark-val">{activeAccountsCount.toLocaleString('en-US')}</div>
          <div className="kpi-spark-diff positive">
            <TrendingUp size={12} />
            <span><strong>+8.4%</strong> vs Apr 1 - Apr 30</span>
          </div>
          {/* Dot Matrix SVG Sparkline */}
          <div className="dot-matrix-spark">
            {Array.from({ length: 32 }).map((_, i) => (
              <span key={i} className="matrix-dot" style={{ opacity: 0.2 + (i % 5) * 0.2 }} />
            ))}
          </div>
        </div>

        {/* CARD 3: MRR */}
        <div className="kpi-spark-card">
          <div className="kpi-spark-head">
            <span className="kpi-spark-title">MRR</span>
          </div>
          <div className="kpi-spark-val">${mrrVal.toLocaleString('en-US')}</div>
          <div className="kpi-spark-diff positive">
            <TrendingUp size={12} />
            <span><strong>+14.2%</strong> vs Apr 1 - Apr 30</span>
          </div>
          {/* Smooth Green Wave SVG */}
          <svg className="spark-svg wave" viewBox="0 0 200 40">
            <path
              d="M0,30 Q50,5 100,20 T200,10 L200,40 L0,40 Z"
              fill="url(#greenWave)"
            />
            <defs>
              <linearGradient id="greenWave" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* CARD 4: CONVERSION RATE */}
        <div className="kpi-spark-card">
          <div className="kpi-spark-head">
            <span className="kpi-spark-title">Conversion Rate</span>
          </div>
          <div className="kpi-spark-val">{conversionRate}%</div>
          <div className="kpi-spark-diff positive">
            <TrendingUp size={12} />
            <span><strong>+0.6%</strong> vs Apr 1 - Apr 30</span>
          </div>
          {/* Dotted Polyline */}
          <svg className="spark-svg line" viewBox="0 0 200 40">
            <polyline
              points="0,30 40,25 80,35 120,20 160,22 200,10"
              fill="none"
              stroke="#7C3AED"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
          </svg>
        </div>

        {/* CARD 5: CHURN RATE */}
        <div className="kpi-spark-card">
          <div className="kpi-spark-head">
            <span className="kpi-spark-title">Churn Rate</span>
          </div>
          <div className="kpi-spark-val">{churnRate}%</div>
          <div className="kpi-spark-diff positive">
            <TrendingUp size={12} />
            <span><strong>+0.3%</strong> vs Apr 1 - Apr 30</span>
          </div>
          {/* Bar Chart Sparkline */}
          <div className="bar-spark-row">
            {[40, 65, 50, 80, 70, 90, 85].map((h, i) => (
              <span key={i} className="bar-spark-col" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* CARD 6: NPS SCORE & RADIAL GAUGE */}
        <div className="kpi-spark-card gauge-card">
          <div className="kpi-spark-head">
            <span className="kpi-spark-title">NPS Score</span>
          </div>
          <div className="kpi-spark-val">64</div>
          <div className="kpi-spark-diff positive">
            <TrendingUp size={12} />
            <span><strong>+5</strong> vs Apr 1 - Apr 30</span>
          </div>

          {/* SVG SPEEDOMETER / RADIAL GAUGE */}
          <div className="radial-gauge-holder">
            <svg viewBox="0 0 100 55" className="gauge-svg">
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 10 50 A 40 40 0 0 1 76 22"
                fill="none"
                stroke="url(#gaugeGrad)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
              {/* Needle Indicator */}
              <line x1="50" y1="50" x2="72" y2="24" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
              <circle cx="50" cy="50" r="5" fill="#0F172A" />
            </svg>
          </div>
        </div>

      </div>

      {/* ── 3. MIDDLE WIDGETS: REVENUE BY PRODUCT + USER ACQUISITION FUNNEL + ACCOUNT HEALTH SPIDER ── */}
      <div className="ent-middle-grid">

        {/* WIDGET 1: REVENUE BY PRODUCT (DONUT CHART) */}
        <div className="ent-widget-card">
          <div className="ent-widget-head">
            <h3>Revenue by Product</h3>
            <span className="pill-month-sm">This Month ▾</span>
          </div>

          <div className="donut-center-layout">
            <div className="donut-ring-wrap">
              <svg viewBox="0 0 160 160" className="donut-ring-svg">
                <circle cx="80" cy="80" r="60" fill="none" stroke="#E2E8F0" strokeWidth="18" />
                {/* Segments */}
                <circle cx="80" cy="80" r="60" fill="none" stroke="#10B981" strokeWidth="18" strokeDasharray="140 377" strokeDashoffset="0" />
                <circle cx="80" cy="80" r="60" fill="none" stroke="#7C3AED" strokeWidth="18" strokeDasharray="110 377" strokeDashoffset="-145" />
                <circle cx="80" cy="80" r="60" fill="none" stroke="#3B82F6" strokeWidth="18" strokeDasharray="80 377" strokeDashoffset="-260" />
                <circle cx="80" cy="80" r="60" fill="none" stroke="#F59E0B" strokeWidth="18" strokeDasharray="35 377" strokeDashoffset="-345" />
              </svg>
              <div className="donut-center-txt">
                <span className="d-val">${totalRevenueVal.toLocaleString('en-US')}</span>
                <span className="d-lbl">Total Revenue</span>
              </div>
            </div>

            <div className="donut-product-list">
              <div className="p-item">
                <span className="p-dot green" />
                <span className="p-name">Pro Plan</span>
                <span className="p-val">$98,420</span>
                <span className="p-pct">39.6%</span>
              </div>
              <div className="p-item">
                <span className="p-dot purple" />
                <span className="p-name">Business Plan</span>
                <span className="p-val">$72,430</span>
                <span className="p-pct">29.2%</span>
              </div>
              <div className="p-item">
                <span className="p-dot blue" />
                <span className="p-name">Enterprise Plan</span>
                <span className="p-val">$55,210</span>
                <span className="p-pct">22.2%</span>
              </div>
              <div className="p-item">
                <span className="p-dot amber" />
                <span className="p-name">Add-ons</span>
                <span className="p-val">$22,360</span>
                <span className="p-pct">9.0%</span>
              </div>
            </div>
          </div>
        </div>

        {/* WIDGET 2: USER ACQUISITION & FLUID FUNNEL GRAPH */}
        <div className="ent-widget-card">
          <div className="ent-widget-head">
            <h3>User Acquisition Funnel</h3>
          </div>

          <div className="funnel-steps-row">
            <div className="f-step">
              <span className="f-step-num">1. Visitors</span>
              <span className="f-step-val">45,639</span>
              <span className="f-step-pct">100%</span>
            </div>
            <div className="f-step">
              <span className="f-step-num">2. Signups</span>
              <span className="f-step-val">9,482</span>
              <span className="f-step-pct">20.7%</span>
            </div>
            <div className="f-step">
              <span className="f-step-num">3. Activated</span>
              <span className="f-step-val">4,126</span>
              <span className="f-step-pct">43.5%</span>
            </div>
            <div className="f-step">
              <span className="f-step-num">4. Paying</span>
              <span className="f-step-val">1,842</span>
              <span className="f-step-pct">44.6%</span>
            </div>
          </div>

          {/* Fluid Wave SVG Graphic */}
          <div className="fluid-funnel-wrap">
            <svg viewBox="0 0 500 120" className="fluid-funnel-svg">
              <path
                d="M 0 10 C 150 10 250 45 500 55 L 500 65 C 250 75 150 110 0 110 Z"
                fill="url(#fluidGrad)"
              />
              <defs>
                <linearGradient id="fluidGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.75" />
                  <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.75" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="funnel-footer-rate">
            <span>Overall Conversion Rate</span>
            <span className="rate-badge">4.0%</span>
          </div>
        </div>

        {/* WIDGET 3: ACCOUNT HEALTH (HEXAGONAL SPIDER / RADAR CHART) */}
        <div className="ent-widget-card">
          <div className="ent-widget-head">
            <h3>Account Health Radar</h3>
          </div>

          <div className="radar-chart-holder">
            <svg viewBox="0 0 220 200" className="radar-svg">
              {/* Hexagon Outer Polygon Background */}
              <polygon points="110,20 185,60 185,140 110,180 35,140 35,60" fill="none" stroke="#E2E8F0" strokeWidth="1.5" />
              <polygon points="110,45 160,72 160,128 110,155 60,128 60,72" fill="none" stroke="#F1F5F9" strokeWidth="1.5" />
              
              {/* Filled Health Spider Web Polygon */}
              <polygon
                points="110,30 178,65 170,135 110,170 42,135 42,65"
                fill="url(#radarGrad)"
                stroke="#3B82F6"
                strokeWidth="2"
              />
              <defs>
                <linearGradient id="radarGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Node Label Badges */}
              <g className="radar-node">
                <polygon points="110,12 135,12 135,28 110,28" fill="#7C3AED" rx="4" />
                <text x="110" y="24" fill="#FFF" fontSize="10" fontWeight="700" textAnchor="middle">Adoption 92</text>
              </g>
            </svg>

            {/* Central Score Badge */}
            <div className="radar-center-badge">
              <span className="score-big">89</span>
              <span className="score-lbl">Overall Health</span>
            </div>
          </div>

          <div className="radar-metrics-list">
            <div className="r-item"><span className="r-dot purple" /> Adoption <strong>92</strong></div>
            <div className="r-item"><span className="r-dot blue" /> Engagement <strong>88</strong></div>
            <div className="r-item"><span className="r-dot green" /> Retention <strong>85</strong></div>
            <div className="r-item"><span className="r-dot cyan" /> Support <strong>90</strong></div>
            <div className="r-item"><span className="r-dot dark" /> Security <strong>90</strong></div>
          </div>
        </div>

      </div>

      {/* ── 4. LOWER SECTION: CHANNELS + EVENTS BUBBLE + ACTIVITIES + AI INSIGHT ── */}
      <div className="ent-lower-grid">

        {/* TOP ACQUISITION CHANNELS */}
        <div className="ent-widget-card">
          <div className="ent-widget-head">
            <h3>Top Acquisition Channels</h3>
            <span className="pill-month-sm">This Month ▾</span>
          </div>

          <div className="channel-bars-list">
            {[
              { name: 'Organic Search', count: '12,500', pct: 85 },
              { name: 'Paid Search', count: '8,430', pct: 60 },
              { name: 'Direct', count: '6,120', pct: 45 },
              { name: 'Referral', count: '4,320', pct: 32 },
              { name: 'Social Media', count: '3,210', pct: 24 }
            ].map(ch => (
              <div key={ch.name} className="channel-item">
                <span className="ch-name">{ch.name}</span>
                <div className="ch-bar-bg">
                  <div className="ch-bar-fill" style={{ width: `${ch.pct}%` }} />
                </div>
                <span className="ch-cnt">{ch.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* EVENTS BREAKDOWN (PROPORTIONAL BUBBLE GRAPH) */}
        <div className="ent-widget-card">
          <div className="ent-widget-head">
            <h3>Events Breakdown</h3>
          </div>

          <div className="bubble-graph-holder">
            <div className="bubble purple b-40">
              <span>40%</span>
              <span className="b-lbl">Feature Used</span>
            </div>
            <div className="bubble green b-28">
              <span>28%</span>
              <span className="b-lbl">Workspace Created</span>
            </div>
            <div className="bubble blue b-18">
              <span>18%</span>
              <span className="b-lbl">Invites Sent</span>
            </div>
            <div className="bubble cyan b-14">
              <span>14%</span>
              <span className="b-lbl">Other</span>
            </div>
          </div>
        </div>

        {/* RECENT ACCOUNT ACTIVITY */}
        <div className="ent-widget-card">
          <div className="ent-widget-head">
            <h3>Recent Account Activity</h3>
            <span className="link-view-all">View all</span>
          </div>

          <div className="activity-feed-list">
            <div className="act-feed-item">
              <div className="act-dot green" />
              <div className="act-body">
                <span><strong>COOL Corp.</strong> upgraded to Enterprise Plan</span>
                <span className="act-time">2m ago</span>
              </div>
            </div>

            <div className="act-feed-item">
              <div className="act-dot blue" />
              <div className="act-body">
                <span><strong>CHEAKY Industries</strong> invited 5 new users</span>
                <span className="act-time">15m ago</span>
              </div>
            </div>

            <div className="act-feed-item">
              <div className="act-dot purple" />
              <div className="act-body">
                <span><strong>SNEAKY Enterprises</strong> activated 2 new integrations</span>
                <span className="act-time">1h ago</span>
              </div>
            </div>

            <div className="act-feed-item">
              <div className="act-dot amber" />
              <div className="act-body">
                <span><strong>SUSPICIOUS LLC</strong> reached 90% usage</span>
                <span className="act-time">3h ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI INSIGHT CARD WITH 3D RING */}
        <div className="ent-widget-card ai-insight-card">
          <div className="ai-head">
            <Sparkles size={18} className="ai-icn" />
            <span>AI Insight</span>
          </div>

          <div className="ai-body-content">
            <p dangerouslySetInnerHTML={{ __html: aiInsightStats.dynamicText }} />
            <button type="button" className="btn-view-insight" onClick={() => setShowAiInsightModal(true)}>
              View full insight →
            </button>
          </div>

          <div className="ai-3d-ring">
            <div className="ring-graphic" />
          </div>
        </div>

      </div>

      {/* ── 5. INTERACTIVE CRM CALENDAR WIDGET (USER REQUESTED) ── */}
      <CrmCalendarWidget followups={followups} tasks={tasks} employees={employees} />

      {/* ── 6. ACCOUNTS & LEADS AT RISK TABLE WITH MICRO SPARKLINES ── */}
      <div className="ent-widget-card full-width">
        <div className="ent-widget-head">
          <h3>Accounts at Risk</h3>
          <span className="pill-btn-gray">View all</span>
        </div>

        <div className="table-responsive">
          <table className="risk-accounts-table">
            <thead>
              <tr>
                <th>ACCOUNT</th>
                <th>HEALTH SCORE</th>
                <th>TREND</th>
                <th>LAST ACTIVE</th>
                <th>USAGE</th>
                <th>MMR</th>
                <th>RISK FACTOR</th>
              </tr>
            </thead>
            <tbody>
              {accountsAtRisk.map((acc) => (
                <tr key={acc.name}>
                  <td className="font-bold">{acc.name}</td>
                  <td>
                    <span className={`score-badge score-${acc.riskColor}`}>
                      {acc.score}
                    </span>
                  </td>
                  <td>
                    {/* Micro Sparkline Curve */}
                    <svg className="micro-trend-svg" viewBox="0 0 80 20">
                      <polyline
                        points={acc.trend.map((val, idx) => `${idx * 20},${20 - val / 5}`).join(' ')}
                        fill="none"
                        stroke={acc.riskColor === 'red' ? '#EF4444' : acc.riskColor === 'amber' ? '#F59E0B' : '#10B981'}
                        strokeWidth="2"
                      />
                    </svg>
                  </td>
                  <td className="text-muted">{acc.lastActive}</td>
                  <td>
                    <div className="usage-progress-wrap">
                      <div className="usage-bar-bg">
                        <div className="usage-bar-fill" style={{ width: `${acc.usage}%` }} />
                      </div>
                      <span className="usage-txt">{acc.usage}%</span>
                    </div>
                  </td>
                  <td className="font-bold">${acc.value.toLocaleString()}</td>
                  <td>
                    <span className={`risk-tag tag-${acc.riskColor}`}>
                      {acc.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 7. INTERACTIVE AI INSIGHT DETAIL MODAL ── */}
      {showAiInsightModal && (
        <div className="ai-modal-overlay" onClick={() => setShowAiInsightModal(false)}>
          <div className="ai-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <div className="ai-modal-title">
                <Sparkles size={22} />
                <span>AI Deep Intelligence &amp; CRM Performance Report</span>
              </div>
              <button type="button" className="ai-modal-close-btn" onClick={() => setShowAiInsightModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="ai-modal-body">
              <div className="ai-modal-item">
                <div className="ai-modal-item-icon purple">
                  <Target size={20} />
                </div>
                <div className="ai-modal-item-content">
                  <h5>High Conversion Opportunity</h5>
                  <p>
                    {aiInsightStats.hotLeads > 0
                      ? `Detected ${aiInsightStats.hotLeads} hot prospect(s) in negotiation stage. Closing these deals this week can increase total team revenue velocity by up to 24%.`
                      : `Pipeline conversion is currently at ${aiInsightStats.convRate}%. Consistent telephonic follow-ups within 24 hours can boost conversion rates significantly.`}
                  </p>
                </div>
              </div>

              <div className="ai-modal-item">
                <div className="ai-modal-item-icon amber">
                  <AlertTriangle size={20} />
                </div>
                <div className="ai-modal-item-content">
                  <h5>Overdue Risk Mitigation</h5>
                  <p>
                    {aiInsightStats.overdueFups > 0
                      ? `${aiInsightStats.overdueFups} follow-up deadline(s) have passed without completed action notes. Reassigning or executing these touchpoints today prevents client drop-off.`
                      : `All follow-up schedules are currently up to date! 0 overdue touchpoints detected.`}
                  </p>
                </div>
              </div>

              <div className="ai-modal-item">
                <div className="ai-modal-item-icon blue">
                  <TrendingUp size={20} />
                </div>
                <div className="ai-modal-item-content">
                  <h5>Retention &amp; Touchpoint Velocity</h5>
                  <p>
                    Clients with 3+ logged interaction notes show 36% higher renewal and transaction repeat rates. Keep logging follow-up notes after every phone call or meeting.
                  </p>
                </div>
              </div>

              <div className="ai-modal-item">
                <div className="ai-modal-item-icon green">
                  <ShieldCheck size={20} />
                </div>
                <div className="ai-modal-item-content">
                  <h5>Automated Team Efficiency</h5>
                  <p>
                    Current sales team activity shows strong compliance across {employees.length || 1} team members. Ensure all new leads have clear assigned staff members and follow-up dates.
                  </p>
                </div>
              </div>
            </div>

            <div className="ai-modal-footer">
              <button type="button" className="ai-btn-secondary" onClick={() => setShowAiInsightModal(false)}>
                Close
              </button>
              <button type="button" className="ai-btn-primary" onClick={() => setShowAiInsightModal(false)}>
                ✓ Apply AI Recommendations
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
