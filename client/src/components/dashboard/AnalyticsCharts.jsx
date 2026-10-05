'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import './AnalyticsCharts.css';
import { getStoredLedgerAccounts, getStoredLeads, getStoredFollowups, getStoredTasks, getUserMonthlyTargetAmount, isAdminUser, getSubordinateUsers, filterByRole } from '../../utils/crmStore';
import {
  TrendingUp, PieChart, Users, Sparkles, Layers,
  CheckCircle2, Flame, Award, Target, PhoneCall,
  DollarSign, Zap, ArrowUpRight, Search, Filter,
  LayoutGrid, List, TrendingDown, Briefcase, Calendar,
  CalendarDays, ChevronRight, Activity, Phone, SlidersHorizontal, Sliders,
  Globe, Trophy, AlertTriangle, ShieldCheck, UserCheck, Crown, Medal, Minus, ChevronDown
} from 'lucide-react';

/* ─────────────────────────────────────
   Count-up animation
───────────────────────────────────── */
function useCountUp(target, duration = 1100) {
  const [val, setVal] = useState(target);
  const prevTargetRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!target) {
      setVal(0);
      prevTargetRef.current = 0;
      return;
    }
    if (prevTargetRef.current === target && val === target) {
      return;
    }
    const startVal = val;
    prevTargetRef.current = target;
    const t0 = performance.now();
    const run = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const currentVal = Math.floor(startVal + (target - startVal) * (1 - Math.pow(1 - p, 3)));
      setVal(currentVal);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(run);
      }
    };
    rafRef.current = requestAnimationFrame(run);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return val;
}

/* ─────────────────────────────────────
   Smooth monotone-cubic spline
   (avoids overshooting, always ultra-smooth)
───────────────────────────────────── */
function monotonePath(pts) {
  if (!pts || !pts.length) return '';
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

  const n = pts.length;
  const dx = [], dy = [], slope = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) {
    dx[i]    = pts[i+1].x - pts[i].x;
    dy[i]    = pts[i+1].y - pts[i].y;
    slope[i] = dx[i] === 0 ? 0 : dy[i] / dx[i];
  }
  m[0]     = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) m[i] = 0;
    else m[i] = (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slope[i]) < 1e-9) { m[i] = m[i+1] = 0; continue; }
    const a = m[i] / slope[i];
    const b = m[i+1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] *= t; m[i+1] *= t; }
  }

  let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const x1 = pts[i].x   + dx[i] / 3;
    const y1 = pts[i].y   + m[i]  * dx[i] / 3;
    const x2 = pts[i+1].x - dx[i] / 3;
    const y2 = pts[i+1].y - m[i+1] * dx[i] / 3;
    d += ` C ${x1.toFixed(2)},${y1.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)} ${pts[i+1].x.toFixed(2)},${pts[i+1].y.toFixed(2)}`;
  }
  return d;
}

/* ─────────────────────────────────────
   Demo data — multi-point organic wave
   matching user reference photo
───────────────────────────────────── */
const DEMO = {
  '30D': [
    { label: 'Day 3',  l: 24, t: 18 },
    { label: 'Day 6',  l: 38, t: 28 },
    { label: 'Day 9',  l: 32, t: 22 },
    { label: 'Day 12', l: 54, t: 40 },
    { label: 'Day 15', l: 62, t: 48 },
    { label: 'Day 18', l: 78, t: 60 },
    { label: 'Day 21', l: 68, t: 52 },
    { label: 'Day 24', l: 96, t: 78 },
    { label: 'Day 27', l: 112, t: 90 },
    { label: 'Day 30', l: 128, t: 106 },
  ],
  '6M': [
    { label: 'Mar W1', l: 32, t: 22 },
    { label: 'Mar W3', l: 48, t: 34 },
    { label: 'Apr W1', l: 40, t: 28 },
    { label: 'Apr W3', l: 68, t: 50 },
    { label: 'May W1', l: 76, t: 58 },
    { label: 'May W3', l: 94, t: 74 },
    { label: 'Jun W1', l: 82, t: 62 },
    { label: 'Jun W3', l: 114, t: 92 },
    { label: 'Jul W1', l: 126, t: 104 },
    { label: 'Jul W3', l: 148, t: 126 },
  ],
  '1Y': [
    { label: 'Jan', l: 28, t: 18 },
    { label: 'Feb', l: 42, t: 28 },
    { label: 'Mar', l: 36, t: 24 },
    { label: 'Apr', l: 60, t: 44 },
    { label: 'May', l: 70, t: 54 },
    { label: 'Jun', l: 88, t: 70 },
    { label: 'Jul', l: 78, t: 60 },
    { label: 'Aug', l: 108, t: 86 },
    { label: 'Sep', l: 122, t: 98 },
    { label: 'Oct', l: 144, t: 118 },
    { label: 'Nov', l: 168, t: 140 },
    { label: 'Dec', l: 192, t: 162 },
  ],
};

/* ─────────────────────────────────────
   Helpers
───────────────────────────────────── */
const fmtVal = (v) => {
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `${(v / 1000).toFixed(1)}k`;
  return `${Math.round(v)}`;
};

/* ─────────────────────────────────────
   CHART CANVAS — pure SVG Dual Wave Chart
   Ultra-sleek, thin vector lines, widescreen ribbon profile
───────────────────────────────────── */
const CHART_W = 900;
const CHART_H = 190;
const PAD = { l: 52, r: 24, t: 20, b: 28 };

const AreaChart = React.memo(function AreaChart({ data, hoveredIdx, onHover }) {
  const maxV = useMemo(() => {
    const top = Math.max(...data.map(d => Math.max(d.l, d.t)), 10);
    return Math.ceil(top * 1.18 / 10) * 10;
  }, [data]);

  const px = (i) => PAD.l + (data.length < 2 ? (CHART_W - PAD.l - PAD.r) / 2 : (i / (data.length - 1)) * (CHART_W - PAD.l - PAD.r));
  const py = (v) => PAD.t + (1 - v / maxV) * (CHART_H - PAD.t - PAD.b);

  const lPts = data.map((d, i) => ({ x: px(i), y: py(d.l) }));
  const tPts = data.map((d, i) => ({ x: px(i), y: py(d.t) }));

  const lLine = monotonePath(lPts);
  const tLine = monotonePath(tPts);

  const baseline = CHART_H - PAD.b;
  const lArea = `${lLine} L ${lPts[lPts.length-1].x},${baseline} L ${lPts[0].x},${baseline} Z`;
  const tArea = `${tLine} L ${tPts[tPts.length-1].x},${baseline} L ${tPts[0].x},${baseline} Z`;

  const yTicks = [0, 0.33, 0.66, 1];

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
    >
      <defs>
        {/* Subtle, airy Purple gradient fill for Total Leads */}
        <linearGradient id="lgPurpleRef" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#8B5CF6" stopOpacity="0.12" />
          <stop offset="60%"  stopColor="#A78BFA" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
        </linearGradient>

        {/* Subtle, airy Emerald gradient fill for Target Completed */}
        <linearGradient id="lgGreenRef" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#10B981" stopOpacity="0.12" />
          <stop offset="60%"  stopColor="#34D399" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* ── Grid lines + Y labels (light dashed) ── */}
      {yTicks.map((pct, i) => {
        const y = py(maxV * pct);
        return (
          <g key={i}>
            <line
              x1={PAD.l} y1={y} x2={CHART_W - PAD.r} y2={y}
              stroke={pct === 0 ? '#E2E8F0' : '#F1F5F9'}
              strokeWidth={pct === 0 ? '1' : '0.8'}
              strokeDasharray={pct === 0 ? '0' : '4 6'}
            />
            <text
              x={PAD.l - 10} y={y + 3.5}
              textAnchor="end"
              fontSize="10"
              fontWeight="500"
              fill="#94A3B8"
              fontFamily="inherit"
            >
              {fmtVal(maxV * pct)}
            </text>
          </g>
        );
      })}

      {/* ── Gradient area fills ── */}
      <path d={lArea} fill="url(#lgPurpleRef)" />
      <path d={tArea} fill="url(#lgGreenRef)" />

      {/* ── Soft ambient glow stroke ── */}
      <path
        d={lLine}
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="4"
        strokeOpacity="0.12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={tLine}
        fill="none"
        stroke="#10B981"
        strokeWidth="4"
        strokeOpacity="0.12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Sleek thin main strokes (2px) ── */}
      <path
        d={lLine}
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={tLine}
        fill="none"
        stroke="#10B981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Hover guide + Refined Node Circles ── */}
      {data.map((d, i) => {
        const isHov = hoveredIdx === i;
        const pxPos = lPts[i].x;

        return (
          <g key={i}>
            {/* Hit area for smooth mouse hover */}
            <rect
              x={pxPos - (CHART_W / data.length / 2)}
              y={PAD.t}
              width={CHART_W / data.length}
              height={CHART_H - PAD.t - PAD.b}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
            />

            {/* Vertical guide line on hover */}
            {isHov && (
              <line
                x1={pxPos} y1={PAD.t - 4}
                x2={pxPos} y2={CHART_H - PAD.b}
                stroke="#8B5CF6"
                strokeOpacity="0.22"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
            )}

            {/* ── Top Line Node (Purple - Total Leads) ── */}
            <circle
              cx={lPts[i].x}
              cy={lPts[i].y}
              r={isHov ? 5.5 : 3.2}
              fill="#FFFFFF"
              stroke="#8B5CF6"
              strokeWidth={isHov ? '2.5' : '1.8'}
              style={{ transition: 'all 0.16s ease' }}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
            />

            {/* ── Bottom Line Node (Teal - Target Completed) ── */}
            <circle
              cx={tPts[i].x}
              cy={tPts[i].y}
              r={isHov ? 5.5 : 3.2}
              fill="#FFFFFF"
              stroke="#10B981"
              strokeWidth={isHov ? '2.5' : '1.8'}
              style={{ transition: 'all 0.16s ease' }}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
            />
          </g>
        );
      })}
    </svg>
  );
});

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
function AnalyticsCharts({ leads = [], followups = [], tasks = [], employees = [], currentUser = null }) {
  const [timeRange, setTimeRange]         = useState('6M');
  const [activeSegment, setActiveSegment] = useState(null);
  const [hoveredIdx, setHoveredIdx]       = useState(null);

  /* ── Role Hierarchy Scoped Employees List ── */
  const effectiveEmployeesList = useMemo(() => {
    if (!currentUser) return employees;
    if (isAdminUser(currentUser)) {
      return employees;
    }
    const team = getSubordinateUsers(currentUser, employees);
    return team && team.length > 0 ? team : [currentUser];
  }, [currentUser, employees]);

  /* ── Leads & Target totals ── */
  const { totalLeadsReal, totalTargetReal, hasRealValues } = useMemo(() => {
    if (!leads || leads.length === 0) {
      return { totalLeadsReal: 0, totalTargetReal: 0, hasRealValues: false };
    }
    let totalL = leads.length;
    let totalT = 0;
    for (let i = 0; i < leads.length; i++) {
      const l = leads[i];
      const st = (l.status || l.stage || '').toLowerCase();
      if (st.includes('won') || st.includes('closed') || st.includes('converted')) {
        totalT++;
      }
    }
    return {
      totalLeadsReal: totalL,
      totalTargetReal: totalT,
      hasRealValues: totalL > 0
    };
  }, [leads]);

  /* ── Trend data — 100% REAL date-based bucketing directly from leads ── */
  const trendData = useMemo(() => {
    // Helper: get a Date from a lead's timestamp field with ultra-robust parsing
    const getLeadDate = (lead) => {
      if (!lead) return new Date();
      const raw = lead.createdAt || lead.date || lead.createdAtDate || lead.inquiryDate || lead.createdDate || lead.followupDate || lead.timestamp || lead.updatedAt;
      if (!raw) return new Date();

      if (typeof raw === 'number') return new Date(raw);

      if (typeof raw === 'string') {
        let d = new Date(raw);
        if (!isNaN(d.getTime())) return d;

        // Try DD/MM/YYYY or DD-MM-YYYY
        const ddmmyyyy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (ddmmyyyy) {
          d = new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));
          if (!isNaN(d.getTime())) return d;
        }

        // Try YYYY/MM/DD or YYYY-MM-DD
        const yyyymmdd = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        if (yyyymmdd) {
          d = new Date(Number(yyyymmdd[1]), Number(yyyymmdd[2]) - 1, Number(yyyymmdd[3]));
          if (!isNaN(d.getTime())) return d;
        }
      }

      return new Date();
    };

    // Helper: is this lead "won/completed"?
    const isWon = (lead) => {
      if (!lead) return false;
      const st = String(lead.status || lead.stage || lead.leadStatus || '').toLowerCase();
      const isWonStatus = st.includes('won') || st.includes('closed') || st.includes('converted') || st.includes('deal') || st.includes('completed');
      const hasValue = Number(lead.saleAmount || lead.dealValue || lead.amount || 0) > 0;
      return isWonStatus || hasValue;
    };

    const now = new Date();

    if (timeRange === 'Today') {
      const slots = [
        { label: '9 AM', hourStart: 0, hourEnd: 9, l: 0, t: 0 },
        { label: '11 AM', hourStart: 10, hourEnd: 11, l: 0, t: 0 },
        { label: '1 PM', hourStart: 12, hourEnd: 13, l: 0, t: 0 },
        { label: '3 PM', hourStart: 14, hourEnd: 15, l: 0, t: 0 },
        { label: '5 PM', hourStart: 16, hourEnd: 17, l: 0, t: 0 },
        { label: '7 PM', hourStart: 18, hourEnd: 23, l: 0, t: 0 },
      ];

      (leads || []).forEach(lead => {
        const d = getLeadDate(lead);
        if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          const hr = d.getHours();
          const si = slots.findIndex(s => hr >= s.hourStart && hr <= s.hourEnd);
          if (si >= 0) {
            slots[si].l++;
            if (isWon(lead)) slots[si].t++;
          }
        }
      });
      return slots.map(s => ({ label: s.label, l: s.l, t: s.t }));
    }

    if (timeRange === '30D') {
      // 10 buckets covering last 30 days (3 days per bucket ending today)
      const monthAbbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const buckets = [];
      for (let i = 9; i >= 0; i--) {
        const endDaysAgo = i * 3;
        const startDaysAgo = (i + 1) * 3;
        const dEnd = new Date(now.getTime() - endDaysAgo * 86400000);
        const label = `${monthAbbr[dEnd.getMonth()]} ${dEnd.getDate()}`;
        buckets.push({ label, startDaysAgo, endDaysAgo, l: 0, t: 0 });
      }

      (leads || []).forEach(lead => {
        const d = getLeadDate(lead);
        const daysAgo = Math.floor((now - d) / 86400000);
        const bi = buckets.findIndex(b => daysAgo < b.startDaysAgo && daysAgo >= b.endDaysAgo);
        if (bi >= 0) {
          buckets[bi].l++;
          if (isWon(lead)) buckets[bi].t++;
        }
      });
      return buckets.map(b => ({ label: b.label, l: b.l, t: b.t }));
    }

    if (timeRange === '6M') {
      // Last 6 months (12 bi-weekly slots W1/W3)
      const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const slots = [];
      for (let m = 5; m >= 0; m--) {
        const slotDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const mo = slotDate.getMonth();
        const yr = slotDate.getFullYear();
        slots.push({ label: `${MONTH_ABBR[mo]} W1`, mo, yr, half: 1, l: 0, t: 0 });
        slots.push({ label: `${MONTH_ABBR[mo]} W3`, mo, yr, half: 2, l: 0, t: 0 });
      }

      (leads || []).forEach(lead => {
        const d = getLeadDate(lead);
        const mo = d.getMonth();
        const yr = d.getFullYear();
        const half = d.getDate() <= 15 ? 1 : 2;
        const si = slots.findIndex(s => s.mo === mo && s.yr === yr && s.half === half);
        if (si >= 0) {
          slots[si].l++;
          if (isWon(lead)) slots[si].t++;
        }
      });
      return slots.map(s => ({ label: s.label, l: s.l, t: s.t }));
    }

    // 1Y — 12 months for current year/last 12 months
    const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthBuckets = [];
    for (let m = 11; m >= 0; m--) {
      const slotDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const mo = slotDate.getMonth();
      const yr = slotDate.getFullYear();
      monthBuckets.push({ label: `${MONTH_ABBR[mo]}`, mo, yr, l: 0, t: 0 });
    }

    (leads || []).forEach(lead => {
      const d = getLeadDate(lead);
      const mo = d.getMonth();
      const yr = d.getFullYear();
      const bi = monthBuckets.findIndex(b => b.mo === mo && b.yr === yr);
      if (bi >= 0) {
        monthBuckets[bi].l++;
        if (isWon(lead)) monthBuckets[bi].t++;
      }
    });

    return monthBuckets.map(b => ({ label: b.label, l: b.l, t: b.t }));
  }, [timeRange, leads]);

  /* ── Derived totals ── */
  const chartTotalLeads = useMemo(() => totalLeadsReal, [totalLeadsReal]);
  const chartTargetCompleted = useMemo(() => totalTargetReal, [totalTargetReal]);

  // Lead Stage Breakdown Date Filters State
  const [stagePeriodPreset, setStagePeriodPreset] = useState('ALL'); // 'ALL' | 'TODAY' | 'MONTH' | 'YEAR' | 'CUSTOM'
  const [stageYear, setStageYear]                 = useState('ALL'); // 'ALL' | 2024 | 2025 | 2026 | 2027 | 2028
  const [stageMonth, setStageMonth]               = useState('ALL'); // 'ALL' | 1 .. 12
  const [stageDay, setStageDay]                 = useState('ALL'); // 'ALL' | 1 .. 31

  /* ── Filtered Leads for Lead Stage Breakdown (Day, Month, Year Filters) ── */
  const filteredLeadsForStage = useMemo(() => {
    if (!leads || leads.length === 0) return [];
    return leads.filter(l => {
      const dateVal = l.createdAt || l.date || l.createdAtDate || l.updatedAt || l.timestamp;
      if (!dateVal) return true;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return true;

      const now = new Date();

      if (stagePeriodPreset === 'TODAY') {
        return d.getDate() === now.getDate() &&
               d.getMonth() === now.getMonth() &&
               d.getFullYear() === now.getFullYear();
      }
      if (stagePeriodPreset === 'MONTH') {
        return d.getMonth() === now.getMonth() &&
               d.getFullYear() === now.getFullYear();
      }
      if (stagePeriodPreset === 'YEAR') {
        return d.getFullYear() === now.getFullYear();
      }
      if (stagePeriodPreset === 'CUSTOM' || stagePeriodPreset === 'ALL') {
        if (stageYear !== 'ALL' && d.getFullYear() !== Number(stageYear)) return false;
        if (stageMonth !== 'ALL' && (d.getMonth() + 1) !== Number(stageMonth)) return false;
        if (stageDay !== 'ALL' && d.getDate() !== Number(stageDay)) return false;
        return true;
      }
      return true;
    });
  }, [leads, stagePeriodPreset, stageYear, stageMonth, stageDay]);

  /* ── Stage breakdown ── */
  const stageBreakdown = useMemo(() => {
    const cnt = { new:0, contacted:0, negotiation:0, won:0, lost:0 };
    filteredLeadsForStage.forEach(l => {
      const st = String(l.leadStatus || l.status || l.stage || '').toLowerCase().trim();
      if      (st.includes('new') || st.includes('fresh') || st.includes('inquiry')) cnt.new++;
      else if (st.includes('contact') || st.includes('meet') || st.includes('call')) cnt.contacted++;
      else if (st.includes('neg') || st.includes('prop') || st.includes('quote') || st.includes('warm') || st.includes('hot') || st.includes('pending')) cnt.negotiation++;
      else if (st.includes('won') || st.includes('close') || st.includes('converted') || st.includes('deal done') || st.includes('done')) cnt.won++;
      else if (st.includes('lost') || st.includes('cancel') || st.includes('cold') || st.includes('disqualif')) cnt.lost++;
      else cnt.new++;
    });
    const cats = [
      { key:'new',         label:'New Inquiries',  color:'#8B5CF6', grad:'linear-gradient(135deg,#A78BFA,#7C3AED)' },
      { key:'contacted',   label:'Contacted',      color:'#3B82F6', grad:'linear-gradient(135deg,#60A5FA,#2563EB)' },
      { key:'negotiation', label:'In Negotiation', color:'#F59E0B', grad:'linear-gradient(135deg,#FBBF24,#D97706)' },
      { key:'won',         label:'Deals Closed',   color:'#10B981', grad:'linear-gradient(135deg,#34D399,#059669)' },
      { key:'lost',        label:'Lost',           color:'#EF4444', grad:'linear-gradient(135deg,#F87171,#DC2626)' },
    ];
    const total = filteredLeadsForStage.length;
    return cats.map(c => ({ ...c, count: cnt[c.key]||0, pct: total>0 ? Math.round((cnt[c.key]/total)*100):0 }));
  }, [filteredLeadsForStage]);

  const [staffSearch, setStaffSearch]         = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('ALL');
  const [staffTimePeriod, setStaffTimePeriod] = useState('ALL'); // 'ALL' | 'TODAY' | 'MONTH' | 'YEAR'
  const [staffSortBy, setStaffSortBy]         = useState('eff');
  const [staffViewMode, setStaffViewMode]     = useState('cards'); // 'cards' | 'table'

  /* ── Helper: Date Range Filter for Daily, Monthly, Yearly Analysis ── */
  const isRecordInPeriod = (item, period) => {
    if (period === 'ALL') return true;
    const dateStr = item.createdAt || item.date || item.dueDate || item.timestamp || item.updatedAt;
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;
    const now = new Date();

    if (period === 'TODAY') {
      return d.getDate() === now.getDate() &&
             d.getMonth() === now.getMonth() &&
             d.getFullYear() === now.getFullYear();
    }
    if (period === 'MONTH') {
      return d.getMonth() === now.getMonth() &&
             d.getFullYear() === now.getFullYear();
    }
    if (period === 'YEAR') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  /* ── Staff Leaderboard & Analytics (100% Pure Real Data + High Performance) ── */
  const rawStaffMetrics = useMemo(() => {
    let list = effectiveEmployeesList;

    // Fast-path when there are no tasks, followups, or leads
    const hasAnyData = (leads && leads.length > 0) || (tasks && tasks.length > 0) || (followups && followups.length > 0);
    if (!hasAnyData) {
      if (!list || list.length === 0) {
        list = [
          { id: '1', name: 'Sanmora Admin', role: 'Super Admin' },
          { id: '2', name: 'Sales Team', role: 'Sales Executive' }
        ];
      }
      return list.map((emp, i) => ({
        id: emp._id || emp.id || emp.name || `staff-${i+1}`,
        name: emp.name || `Staff ${i+1}`,
        role: typeof emp.role === 'object' ? (emp.role?.name || 'Sales Executive') : (emp.role || 'Sales Executive'),
        done: 0, pend: 0, totalTasks: 0, fups: 0, calls: 0, prospects: 0, wonDeals: 0, wonRevenue: 0,
        eff: 0, perfStatus: { label: 'No Activity', type: 'none' }, trendPct: 0, isPositive: true, rank: i + 1
      }));
    }
    
    // If employees array is empty, dynamically extract real assigned staff names from real leads, tasks, & followups
    if (!list || list.length === 0) {
      const staffMap = new Map();
      [...leads, ...tasks, ...followups].forEach(item => {
        const rawName = typeof item.assignedTo === 'object' ? item.assignedTo?.name : item.assignedTo;
        if (rawName && typeof rawName === 'string' && rawName.trim()) {
          const cleanName = rawName.trim();
          if (!staffMap.has(cleanName)) {
            staffMap.set(cleanName, {
              id: item.assignedToId || item.userId || `staff-${staffMap.size + 1}`,
              name: cleanName,
              role: 'Sales Executive'
            });
          }
        }
      });
      list = Array.from(staffMap.values());
    }

    // Default fallback list if no staff exist anywhere
    if (list.length === 0) {
      list = [
        { id: '1', name: 'Sanmora Admin', role: 'Super Admin' },
        { id: '2', name: 'Sales Team', role: 'Sales Executive' }
      ];
    }

    // Pre-fetch ledger store and leads ONCE outside loop for high performance
    let storedLedger = {};
    try {
      storedLedger = getStoredLedgerAccounts() || {};
    } catch (e) {}
    const allLeadsForLedger = (leads && leads.length > 0) ? leads : getStoredLeads();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Pre-filter records by staffTimePeriod ONCE for ultra speed
    const periodTasks = tasks.filter(t => isRecordInPeriod(t, staffTimePeriod));
    const periodFollowups = followups.filter(f => isRecordInPeriod(f, staffTimePeriod));
    const periodLeads = leads.filter(l => isRecordInPeriod(l, staffTimePeriod));

    return list.map((emp, i) => {
      const name = emp.name || `Staff ${i+1}`;
      const empRole = typeof emp.role === 'object' ? (emp.role?.name || 'Sales Executive') : (emp.role || 'Sales Executive');

      const empId = String(emp._id || emp.id || '').trim().toLowerCase();
      const empName = String(emp.name || '').trim().toLowerCase();
      const empEmail = String(emp.email || '').trim().toLowerCase();

      const matchesEmpFast = (record) => {
        if (!record) return false;
        const candidateFields = [
          record.assignedTo, record.assignedToId, record.assignedUser,
          record.userId, record.createdBy, record.salesRep, record.owner
        ];
        for (let j = 0; j < candidateFields.length; j++) {
          const field = candidateFields[j];
          if (!field) continue;
          if (typeof field === 'object') {
            const fId = String(field._id || field.id || '').trim().toLowerCase();
            const fName = String(field.name || '').trim().toLowerCase();
            const fEmail = String(field.email || '').trim().toLowerCase();
            if ((empId && fId && empId === fId) || (empName && fName && empName === fName) || (empEmail && fEmail && empEmail === fEmail)) return true;
          } else {
            const str = String(field).trim().toLowerCase();
            if ((empId && str === empId) || (empName && (str === empName || str.includes(empName) || empName.includes(str))) || (empEmail && str === empEmail)) return true;
          }
        }
        return false;
      };

      // Filter activities using pre-filtered period arrays
      const empTasks = periodTasks.filter(matchesEmpFast);
      const done = empTasks.filter(t => t.status === 'Completed').length;
      const pend = empTasks.filter(t => t.status !== 'Completed').length;
      const totalTasks = done + pend;

      const empFollowups = periodFollowups.filter(matchesEmpFast);
      const fups = empFollowups.length;
      const calls = empFollowups.filter(f => (f.type || f.activityType || '').toLowerCase().includes('call')).length;

      const empLeads = periodLeads.filter(matchesEmpFast);
      const prospects = empLeads.length;
      const wonLeads = empLeads.filter(l => {
        const st = (l.status || l.stage || '').toLowerCase();
        return st.includes('won') || st.includes('closed') || st.includes('converted');
      });
      const wonDeals = wonLeads.length;
      const wonRevenue = wonLeads.reduce((s, l) => s + (Number(l.leadValue || l.value) || 0), 0);

      // 🎯 Target & Ledger Revenue Calculations
      const targetAmount = getUserMonthlyTargetAmount(emp, currentYear, currentMonth);

      let ledgerCollections = 0;
      try {
        const empLeadsForLedger = allLeadsForLedger.filter(matchesEmpFast);
        empLeadsForLedger.forEach(l => {
          const acc = storedLedger[l.id];
          if (acc && Array.isArray(acc.instalments)) {
            acc.instalments.forEach(inst => {
              const isCleared = inst.status === 'Record Payment' || inst.status === 'Cleared' || inst.cleared !== false;
              if (isCleared && inst.date) {
                const instDate = new Date(inst.date);
                if (instDate.getFullYear() === currentYear && (instDate.getMonth() + 1) === currentMonth) {
                  ledgerCollections += (Number(inst.amount) || 0);
                }
              }
            });
          }
        });
      } catch (e) {
        // fallback
      }

      const achievedRevenue = Math.max(ledgerCollections, wonRevenue);
      let targetPct = 0;
      if (targetAmount > 0) {
        targetPct = Math.round((achievedRevenue / targetAmount) * 100);
      } else if (achievedRevenue > 0) {
        targetPct = 100;
      }

      // Score Calculation based on real period activity
      const taskEff = totalTasks > 0 ? Math.round((done / totalTasks) * 100) : 0;
      let score = 0;
      if (totalTasks > 0 && prospects > 0) {
        const convRate = Math.min(Math.round((wonDeals / prospects) * 100), 100);
        score = Math.round((taskEff * 0.5) + (convRate * 0.5));
      } else if (totalTasks > 0) {
        score = taskEff;
      } else if (prospects > 0) {
        score = Math.min(Math.round((wonDeals / prospects) * 100), 100);
      } else if (fups > 0) {
        score = Math.min(fups * 10, 100);
      } else {
        score = 0;
      }

      // Performance Badge Status (Good Performance vs Low / Needs Attention)
      let perfStatus = { label: 'No Activity', type: 'none' };
      if (totalTasks > 0 || prospects > 0 || fups > 0 || targetAmount > 0 || achievedRevenue > 0) {
        if (score >= 70 || wonDeals >= 2 || targetPct >= 100) {
          perfStatus = { label: 'Top Performer', type: 'high' };
        } else if (score >= 40 || done > pend || targetPct >= 50) {
          perfStatus = { label: 'Steady Growth', type: 'mid' };
        } else {
          perfStatus = { label: 'Needs Attention', type: 'low' };
        }
      }

      // Delta Trend (% Growth or Lag)
      let trendPct = 0;
      let isPositive = true;
      if (totalTasks > 0 || prospects > 0 || fups > 0 || achievedRevenue > 0) {
        if (done >= pend && (done > 0 || wonDeals > 0 || targetPct >= 50)) {
          trendPct = targetPct > 0 ? targetPct : (totalTasks > 0 ? Math.round((done / totalTasks) * 100) : 100);
          isPositive = true;
        } else if (pend > done || score < 40) {
          trendPct = Math.min((pend + 1) * 12, 60);
          isPositive = false;
        } else {
          trendPct = score;
          isPositive = true;
        }
      } else {
        trendPct = 0;
        isPositive = true;
      }

      return {
        id: emp._id || emp.id || name,
        name,
        role: empRole,
        done,
        pend,
        totalTasks,
        fups,
        calls,
        prospects,
        wonDeals,
        wonRevenue,
        targetAmount,
        achievedRevenue,
        targetPct,
        eff: score,
        perfStatus,
        trendPct,
        isPositive,
        rank: i + 1,
      };
    });
  }, [effectiveEmployeesList, leads, tasks, followups, staffTimePeriod]);

  // Fast-path search, role filter, and sorting memoized separately
  const staffList = useMemo(() => {
    let computed = [...rawStaffMetrics];

    if (staffSearch.trim()) {
      const q = staffSearch.toLowerCase();
      computed = computed.filter(s => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q));
    }
    if (staffRoleFilter !== 'ALL') {
      if (staffRoleFilter === 'TOP') {
        computed = computed.filter(s => s.perfStatus.type === 'high' || s.eff >= 60 || s.wonDeals > 0);
      } else if (staffRoleFilter === 'LOW') {
        computed = computed.filter(s => s.perfStatus.type === 'low' || s.perfStatus.type === 'none' || s.eff < 50 || s.pend > s.done);
      } else {
        const sel = String(staffRoleFilter).toLowerCase().trim();
        computed = computed.filter(s => {
          const sId = String(s.id || '').toLowerCase().trim();
          const sName = String(s.name || '').toLowerCase().trim();
          return sId === sel || sName === sel || sName.includes(sel) || sel.includes(sName);
        });
      }
    }

    if (staffSortBy === 'target') {
      computed.sort((a, b) => b.targetPct - a.targetPct || b.achievedRevenue - a.achievedRevenue || b.eff - a.eff);
    } else if (staffSortBy === 'deals') {
      computed.sort((a, b) => b.wonDeals - a.wonDeals || b.wonRevenue - a.wonRevenue || b.eff - a.eff);
    } else if (staffSortBy === 'calls') {
      computed.sort((a, b) => b.calls - a.calls || b.fups - a.fups || b.eff - a.eff);
    } else if (staffSortBy === 'tasks') {
      computed.sort((a, b) => b.done - a.done || b.eff - a.eff);
    } else if (staffSortBy === 'fups') {
      computed.sort((a, b) => b.fups - a.fups || b.eff - a.eff);
    } else {
      computed.sort((a, b) => b.eff - a.eff || b.done - a.done);
    }

    return computed.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [rawStaffMetrics, staffSearch, staffRoleFilter, staffSortBy]);

  /* ── Team Summary Stats ── */
  const teamTotals = useMemo(() => {
    const totalCalls     = staffList.reduce((s, emp) => s + emp.calls, 0);
    const totalProspects = staffList.reduce((s, emp) => s + emp.prospects, 0);
    const totalWon       = staffList.reduce((s, emp) => s + emp.wonDeals, 0);
    const avgEff         = staffList.length > 0 ? Math.round(staffList.reduce((s, emp) => s + emp.eff, 0) / staffList.length) : 0;
    return { totalCalls, totalProspects, totalWon, avgEff };
  }, [staffList]);

  /* ── Totals ── */
  const realFollowups = useMemo(() => {
    const list = (followups && followups.length > 0) ? followups : (typeof window !== 'undefined' ? getStoredFollowups() : []);
    return filterByRole(list, currentUser, employees);
  }, [followups, currentUser, employees]);

  const realTasks = useMemo(() => {
    const list = (tasks && tasks.length > 0) ? tasks : (typeof window !== 'undefined' ? getStoredTasks() : []);
    return filterByRole(list, currentUser, employees);
  }, [tasks, currentUser, employees]);

  const realLeads = useMemo(() => {
    const list = (leads && leads.length > 0) ? leads : (typeof window !== 'undefined' ? getStoredLeads() : []);
    return filterByRole(list, currentUser, employees);
  }, [leads, currentUser, employees]);

  const completedTasks = useMemo(() => {
    return realTasks.filter(t => t.status === 'Completed').length;
  }, [realTasks]);

  const wonCount       = stageBreakdown.find(s => s.key==='won')?.count || 0;
  const winRatePct     = filteredLeadsForStage.length > 0 ? Math.round((wonCount / filteredLeadsForStage.length) * 100) : 0;

  /* ── 4 Core Requested Performance Metrics (Strictly Role Scoped & Real Data Synced) ── */
  const core4Metrics = useMemo(() => {
    const totalAct = wonCount + realFollowups.length + completedTasks;
    const dealsPct = totalAct > 0 ? Math.round((wonCount / totalAct) * 100) : 0;
    const fupsPct  = totalAct > 0 ? Math.round((realFollowups.length / totalAct) * 100) : 0;
    const tasksPct = totalAct > 0 ? Math.round((completedTasks / totalAct) * 100) : 0;

    return [
      { key: 'won',      label: 'Deals Closed',    count: wonCount,             pct: dealsPct,   color: '#10B981', grad: 'url(#dGradGreen)' },
      { key: 'fups',     label: 'Follow-up Calls', count: realFollowups.length, pct: fupsPct,    color: '#3B82F6', grad: 'url(#dGradBlue)' },
      { key: 'tasks',    label: 'Tasks Completed', count: completedTasks,       pct: tasksPct,   color: '#8B5CF6', grad: 'url(#dGradPurple)' },
      { key: 'winrate',  label: 'Overall Win Rate',count: winRatePct,           pct: winRatePct, color: '#F59E0B', grad: 'url(#dGradAmber)', isWinRate: true }
    ];
  }, [wonCount, realFollowups.length, completedTasks, winRatePct]);

  const totalLeadsCount = totalLeadsReal;
  const targetCompletedCount = totalTargetReal;

  const animLeads  = useCountUp(totalLeadsCount);
  const animTarget = useCountUp(targetCompletedCount);

  const hovData = hoveredIdx !== null ? trendData[hoveredIdx] : null;

  /* ── X-axis label positions ── */
  const xLabelPcts = trendData.map((_, i) =>
    trendData.length < 2 ? 50 : (i / (trendData.length - 1)) * 100
  );

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <div className="ac-wrap">

      {/* ══ HEADER BANNER ══════════════════════════════════════════════ */}
      <div className="ac-banner">
        <div className="ac-ban-l">
          <div className="ac-ban-icon"><Sparkles size={22} /></div>
          <div>
            <div className="ac-ban-trow">
              <h2 className="ac-ban-title">Live Analytics &amp; Performance Hub</h2>
              <span className="ac-live-pill"><span className="ac-pdot"/>REAL-TIME</span>
            </div>
            <p className="ac-ban-sub">Calculated from your live CRM — leads, follow-ups &amp; staff activity</p>
          </div>
        </div>
        <div className="ac-ban-r">
          <div className="ac-kchip purple">
            <div className="ac-kchip-icon-box">
              <Users size={17} />
            </div>
            <div className="ac-kchip-text-wrap">
              <span className="ac-kchip-lbl">Total Leads</span>
              <span className="ac-kchip-val">
                {animLeads.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <div className="ac-kchip green">
            <div className="ac-kchip-icon-box">
              <Target size={17} />
            </div>
            <div className="ac-kchip-text-wrap">
              <span className="ac-kchip-lbl">Target Completed</span>
              <span className="ac-kchip-val">
                {animTarget.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <div className="ac-tsw">
            {['Today','30D','6M','1Y'].map(r => (
              <button key={r} className={`ac-tbtn ${timeRange===r?'active':''}`} onClick={()=>setTimeRange(r)}>{r}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ AREA CHART CARD (full width) ═══════════════════════════════ */}
      <div className="ac-card ac-chart-card">
        <div className="ac-card-hd">
          <div className="ac-tgrp">
            <div className="ac-ibadge purple"><TrendingUp size={17}/></div>
            <div>
              <h3 className="ac-ctitle">Leads &amp; Target Performance</h3>
              <span className="ac-csub">
                Total leads generated vs target completion progress
              </span>
            </div>
          </div>
          <div className="ac-legend-row">
            <span className="ac-leg"><span className="ac-ldot" style={{background:'#7C3AED'}}/>Total Leads</span>
            <span className="ac-leg"><span className="ac-ldot" style={{background:'#10B981'}}/>Target Completed</span>
          </div>
        </div>

        <div className="ac-chart-body">
          {/* Tooltip */}
          {hovData && hoveredIdx !== null && (
            <div
              className="ac-tip"
              style={{
                left: `clamp(75px, calc(${((hoveredIdx / Math.max(trendData.length-1,1)) * 86) + 2}% + 50px), calc(100% - 85px))`,
              }}
            >
              <div className="ac-tip-month">{hovData.label}</div>
              <div className="ac-tip-row">
                <span className="ac-tip-dot" style={{background:'#7C3AED'}}/>
                <span>Total Leads</span>
                <strong>{hovData.l}</strong>
              </div>
              <div className="ac-tip-row">
                <span className="ac-tip-dot" style={{background:'#10B981'}}/>
                <span>Target Completed</span>
                <strong>{hovData.t}</strong>
              </div>
            </div>
          )}

          {/* The chart itself */}
          <AreaChart
            data={trendData}
            hoveredIdx={hoveredIdx}
            onHover={setHoveredIdx}
          />

          {/* X-axis labels */}
          <div className="ac-xrow">
            {trendData.map((d, i) => (
              <span
                key={i}
                className={`ac-xlabel ${hoveredIdx===i?'hi':''}`}
                style={{ left: `calc(${xLabelPcts[i]}% * ((100% - 70px) / 100%) + 50px)` }}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ══ ROW 2: DONUT + MINI STATS ════════════════════════════════════ */}
      <div className="ac-row2">

        {/* Donut card */}
        <div className="ac-card ac-donut-card">
          <div className="ac-card-hd">
            <div className="ac-tgrp">
              <div className="ac-ibadge blue"><PieChart size={17}/></div>
              <div>
                <h3 className="ac-ctitle">Lead Stage Breakdown</h3>
                <span className="ac-csub">Live lead pipeline distribution</span>
              </div>
            </div>
            <span className="ac-tot-badge"><Target size={12}/> {filteredLeadsForStage.length} Leads</span>
          </div>

          {/* ── DATE FILTER BAR FOR LEAD STAGE (Preset Pills + Day / Month / Year Selectors) ── */}
          <div className="ac-stage-date-filter-bar">
            <div className="ac-stage-preset-pills">
              <button
                type="button"
                className={`ac-stage-pill ${stagePeriodPreset === 'ALL' && stageYear === 'ALL' && stageMonth === 'ALL' && stageDay === 'ALL' ? 'active' : ''}`}
                onClick={() => { setStagePeriodPreset('ALL'); setStageYear('ALL'); setStageMonth('ALL'); setStageDay('ALL'); }}
              >
                All Time
              </button>
              <button
                type="button"
                className={`ac-stage-pill ${stagePeriodPreset === 'TODAY' ? 'active' : ''}`}
                onClick={() => { setStagePeriodPreset('TODAY'); setStageYear('ALL'); setStageMonth('ALL'); setStageDay('ALL'); }}
              >
                Today
              </button>
              <button
                type="button"
                className={`ac-stage-pill ${stagePeriodPreset === 'MONTH' ? 'active' : ''}`}
                onClick={() => { setStagePeriodPreset('MONTH'); setStageYear('ALL'); setStageMonth('ALL'); setStageDay('ALL'); }}
              >
                This Month
              </button>
              <button
                type="button"
                className={`ac-stage-pill ${stagePeriodPreset === 'YEAR' ? 'active' : ''}`}
                onClick={() => { setStagePeriodPreset('YEAR'); setStageYear('ALL'); setStageMonth('ALL'); setStageDay('ALL'); }}
              >
                This Year
              </button>
            </div>

            <div className="ac-stage-selects-row">
              <div className="ac-stage-select-item">
                <label>Year:</label>
                <select
                  value={stageYear}
                  onChange={(e) => { setStageYear(e.target.value); setStagePeriodPreset('CUSTOM'); }}
                >
                  <option value="ALL">All</option>
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="ac-stage-select-item">
                <label>Month:</label>
                <select
                  value={stageMonth}
                  onChange={(e) => { setStageMonth(e.target.value); setStagePeriodPreset('CUSTOM'); }}
                >
                  <option value="ALL">All</option>
                  {[
                    { val: 1, label: 'Jan' }, { val: 2, label: 'Feb' }, { val: 3, label: 'Mar' },
                    { val: 4, label: 'Apr' }, { val: 5, label: 'May' }, { val: 6, label: 'Jun' },
                    { val: 7, label: 'Jul' }, { val: 8, label: 'Aug' }, { val: 9, label: 'Sep' },
                    { val: 10, label: 'Oct' }, { val: 11, label: 'Nov' }, { val: 12, label: 'Dec' }
                  ].map(m => (
                    <option key={m.val} value={m.val}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="ac-stage-select-item">
                <label>Day:</label>
                <select
                  value={stageDay}
                  onChange={(e) => { setStageDay(e.target.value); setStagePeriodPreset('CUSTOM'); }}
                >
                  <option value="ALL">All</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {(stagePeriodPreset !== 'ALL' || stageYear !== 'ALL' || stageMonth !== 'ALL' || stageDay !== 'ALL') && (
                <button
                  type="button"
                  className="ac-stage-reset-btn"
                  onClick={() => { setStagePeriodPreset('ALL'); setStageYear('ALL'); setStageMonth('ALL'); setStageDay('ALL'); }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="ac-donut-center-layout">
            {/* Centered Donut Ring */}
            <div className="ac-donut-holder-centered">
              <svg viewBox="0 0 200 200" className="ac-donut-svg">
                <defs>
                  <linearGradient id="dGradPurple" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#A78BFA" /><stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                  <linearGradient id="dGradBlue" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#60A5FA" /><stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>
                  <linearGradient id="dGradAmber" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FBBF24" /><stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                  <linearGradient id="dGradGreen" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#34D399" /><stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="dGradRed" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F87171" /><stop offset="100%" stopColor="#DC2626" />
                  </linearGradient>
                </defs>

                {/* Track background ring */}
                <circle cx="100" cy="100" r="68" fill="none" stroke="#F1F5F9" strokeWidth="16" className="ac-donut-track" />

                {/* Ring Segments — 4 core performance logo-themed wheel metrics */}
                {(() => {
                  const circ = 2 * Math.PI * 68; // 427.25
                  const ringItems = core4Metrics;
                  const totalAct = ringItems.reduce((s, x) => s + (x.isWinRate ? (x.count > 0 ? x.count : 1) : x.count), 0);
                  const hasData = totalAct > 0;

                  const visualStages = ringItems.map(item => {
                    if (!hasData) return { ...item, visualPct: 25 };
                    const val = item.isWinRate ? item.count : item.pct;
                    return { ...item, visualPct: val > 0 ? Math.max(val * 0.85, 15) : 10 };
                  });

                  const totalVisualPct = visualStages.reduce((s, x) => s + x.visualPct, 0);
                  let cumPct = 0;

                  return visualStages.map((item, i) => {
                    const pctShare = (item.visualPct / totalVisualPct) * 100;
                    const strokeDash = (pctShare / 100) * circ;
                    const strokeGap = circ - strokeDash;
                    const offset = circ - (cumPct / 100) * circ;
                    cumPct += pctShare;
                    const isHov = activeSegment === i;
                    const isZero = item.count === 0 && hasData;

                    return (
                      <circle
                        key={item.key}
                        cx="100" cy="100" r="68"
                        fill="none"
                        stroke={item.grad || item.color}
                        strokeWidth={isHov ? '18' : (isZero ? '10' : '14')}
                        strokeDasharray={`${Math.max(strokeDash - 4, 3)} ${strokeGap + 4}`}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        transform="rotate(-90 100 100)"
                        className="ac-ring-seg"
                        style={{
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          opacity: isZero ? 0.35 : 1,
                          filter: isHov ? `drop-shadow(0 4px 14px ${item.color}77)` : (isZero ? 'none' : `drop-shadow(0 2px 6px ${item.color}33)`)
                        }}
                        onMouseEnter={() => setActiveSegment(i)}
                        onMouseLeave={() => setActiveSegment(null)}
                      />
                    );
                  });
                })()}

                {/* Inner center circle */}
                <circle cx="100" cy="100" r="54" fill="#FFFFFF" stroke="rgba(226,232,240,0.8)" strokeWidth="1.2" className="ac-donut-center-circle" />
              </svg>

              <div className="ac-dc">
                <span className="ac-dc-n">
                  {activeSegment !== null && core4Metrics[activeSegment]
                    ? (core4Metrics[activeSegment].isWinRate ? `${core4Metrics[activeSegment].count}%` : `${core4Metrics[activeSegment].count}`)
                    : `${realFollowups.length}`}
                </span>
                <span className="ac-dc-pill">
                  {activeSegment !== null && core4Metrics[activeSegment]
                    ? core4Metrics[activeSegment].label.toUpperCase()
                    : 'FOLLOW-UP CALLS'}
                </span>
              </div>
            </div>

            {/* Horizontal Legend Grid (Strict 4 Core Metrics Requested) */}
            <div className="ac-legend-hgrid">
              {core4Metrics.map((item, i) => {
                const isActive = activeSegment === i;
                const isZero = item.count === 0;

                return (
                  <div
                    key={item.key}
                    className={`ac-hleg-item ${isActive ? 'active' : ''} ${isZero ? 'zero' : ''}`}
                    onMouseEnter={() => setActiveSegment(i)}
                    onMouseLeave={() => setActiveSegment(null)}
                  >
                    <span
                      className="ac-hleg-sq"
                      style={{ background: item.color, boxShadow: isZero ? 'none' : `0 2px 6px ${item.color}50` }}
                    />
                    <span className="ac-hleg-pct">
                      {item.isWinRate ? `${item.count}%` : `${item.pct}%`}
                    </span>
                    <span className="ac-hleg-lbl">
                      {item.label}
                    </span>
                    <span className="ac-hleg-cnt">
                      ({item.isWinRate ? `${item.count}%` : item.count})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mini stats 2×2 */}
        <div className="ac-mini-grid">
          {[
            { icon:<Trophy size={18}/>,       lbl:'Deals Closed',        val:wonCount,         c:'purple', sub:'Successfully won' },
            { icon:<PhoneCall size={18}/>,    lbl:'Follow-up Calls',     val:followups.length, c:'blue',   sub:'Log records' },
            { icon:<CheckCircle2 size={18}/>, lbl:'Tasks Completed',    val:completedTasks,   c:'green',  sub:'Resolved items' },
            { icon:<Zap size={18}/>,          lbl:'Overall Win Rate',    val:`${winRatePct}%`, c:'amber',  sub:'Conversion ratio', raw:true },
          ].map((s,i) => (
            <div key={i} className={`ac-mc ac-mc-${s.c}`}>
              <div className="ac-mc-top">
                <div className={`ac-mc-icon ac-mci-${s.c}`}>{s.icon}</div>
                <ArrowUpRight size={14} className="ac-mc-arr"/>
              </div>
              <div className="ac-mc-val">{s.raw ? s.val : (typeof s.val==='number' ? s.val.toLocaleString() : s.val)}</div>
              <div className="ac-mc-lbl">{s.lbl}</div>
              <div className="ac-mc-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ STAFF PERFORMANCE & ANALYTICS HUB (Executive Section) ════════════════ */}
      <div className="ac-card ac-lb-card">
        {/* Top Section Header */}
        <div className="ac-card-hd ac-lb-card-hd">
          <div className="ac-tgrp">
            <div className="ac-ibadge purple-gold"><Users size={19}/></div>
            <div>
              <div className="ac-title-with-badge">
                <h3 className="ac-ctitle">Staff Performance &amp; Activity Analytics Hub</h3>
                <span className="ac-live-chip"><span className="ac-pdot"/>REAL-TIME TEAM SCORE</span>
              </div>
              <span className="ac-csub">Complete activity tracking: Calls, Prospects, Deals Closed, Tasks &amp; Performance Trends</span>
            </div>
          </div>
          <div className="ac-lb-badge">
            <Award size={15} style={{color:'#F59E0B'}}/>
            <span><strong>{staffList.length}</strong> Active Team Members</span>
          </div>
        </div>

        {/* Executive Summary Bar (Team KPI Highlights) */}
        <div className="ac-lb-team-summary">
          <div className="ac-team-kpi-item purple">
            <div className="ac-team-kpi-icon"><PhoneCall size={16}/></div>
            <div>
              <span className="ac-team-kpi-lbl">Total Follow-ups &amp; Calls</span>
              <span className="ac-team-kpi-val">{teamTotals.totalCalls} Logged</span>
            </div>
          </div>
          <div className="ac-team-kpi-item blue">
            <div className="ac-team-kpi-icon"><Target size={16}/></div>
            <div>
              <span className="ac-team-kpi-lbl">Assigned Prospects</span>
              <span className="ac-team-kpi-val">{teamTotals.totalProspects} Leads</span>
            </div>
          </div>
          <div className="ac-team-kpi-item green">
            <div className="ac-team-kpi-icon"><CheckCircle2 size={16}/></div>
            <div>
              <span className="ac-team-kpi-lbl">Closed Deals</span>
              <span className="ac-team-kpi-val">{teamTotals.totalWon} Converted</span>
            </div>
          </div>
          <div className="ac-team-kpi-item amber">
            <div className="ac-team-kpi-icon"><Zap size={16}/></div>
            <div>
              <span className="ac-team-kpi-lbl">Team Avg Efficiency</span>
              <span className="ac-team-kpi-val">{teamTotals.avgEff}% Score</span>
            </div>
          </div>
        </div>

        {/* Interactive Controls Bar: Search, Role Filter, Sort, View Mode Toggle */}
        <div className="ac-lb-ctrls-bar">
          <div className="ac-lb-search-wrap">
            <Search size={17} className="ac-lb-search-icon" />
            <input
              type="text"
              placeholder="Search staff by name or role..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              className="ac-lb-search-input"
            />
          </div>

          <div className="ac-lb-ctrl-group">
            {/* Time Range Analysis Selector: Daily / Monthly / Yearly / All-Time */}
            <div className="ac-lb-period-pills">
              {[
                { id: 'ALL', label: 'All-Time', Icon: Globe },
                { id: 'TODAY', label: 'Daily', Icon: Calendar },
                { id: 'MONTH', label: 'Monthly', Icon: CalendarDays },
                { id: 'YEAR', label: 'Yearly', Icon: Trophy }
              ].map(p => {
                const IconComp = p.Icon;
                return (
                  <button
                    key={p.id}
                    className={`ac-lb-period-btn ${staffTimePeriod === p.id ? 'active' : ''}`}
                    onClick={() => setStaffTimePeriod(p.id)}
                    title={`Show ${p.label} activity analysis`}
                  >
                    <IconComp size={15} className="ac-pill-svg" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Employee Dropdown Select + Top Performers + Needs Help Filters (Strict 3 Controls Requested) */}
            <div className="ac-lb-role-pills">
              {/* 1. All Staff & Individual Employees Dropdown */}
              <div className="ac-lb-select-wrap ac-lb-emp-select-wrap">
                <Users size={15} className="ac-lb-select-icon" />
                <select
                  value={['ALL', 'TOP', 'LOW'].includes(staffRoleFilter) ? staffRoleFilter : (staffRoleFilter || 'ALL')}
                  onChange={(e) => setStaffRoleFilter(e.target.value)}
                  className="ac-lb-select ac-lb-emp-select"
                >
                  <option value="ALL">All Staff ({effectiveEmployeesList.length})</option>
                  {effectiveEmployeesList.map(emp => {
                    const idVal = emp._id || emp.id || emp.name;
                    const roleStr = typeof emp.role === 'object' ? (emp.role?.name || 'Staff') : (emp.role || 'Staff');
                    return (
                      <option key={idVal} value={idVal}>
                        {emp.name} ({roleStr})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown size={14} className="ac-lb-select-arrow" />
              </div>

              {/* 2. Top Performers Filter Button */}
              <button
                type="button"
                className={`ac-lb-role-btn btn-top ${staffRoleFilter === 'TOP' ? 'active' : ''}`}
                onClick={() => setStaffRoleFilter(staffRoleFilter === 'TOP' ? 'ALL' : 'TOP')}
                title="Filter Top Performing Staff"
              >
                <Flame size={15} className="ac-pill-svg" />
                <span>Top Performers</span>
              </button>

              {/* 3. Needs Help Filter Button */}
              <button
                type="button"
                className={`ac-lb-role-btn btn-help ${staffRoleFilter === 'LOW' ? 'active' : ''}`}
                onClick={() => setStaffRoleFilter(staffRoleFilter === 'LOW' ? 'ALL' : 'LOW')}
                title="Filter Staff Needing Performance Assistance"
              >
                <AlertTriangle size={15} className="ac-pill-svg" />
                <span>Needs Help</span>
              </button>
            </div>



            {/* View Mode Toggle: Cards vs Table */}
            <div className="ac-lb-view-toggle">
              <button
                className={`ac-vbtn ${staffViewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setStaffViewMode('cards')}
                title="Cards Grid View"
              >
                <LayoutGrid size={17} />
              </button>
              <button
                className={`ac-vbtn ${staffViewMode === 'table' ? 'active' : ''}`}
                onClick={() => setStaffViewMode('table')}
                title="Detailed Matrix Table View"
              >
                <List size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* MODE 1: EXPANDED PRO CARDS VIEW */}
        {staffViewMode === 'cards' && (
          <div className="ac-staff-grid">
            {staffList.slice(0, 8).map(emp => {
              const rc = emp.rank===1?'gold':emp.rank===2?'silver':emp.rank===3?'bronze':'slate';
              const roleClass = (emp.role || '').toLowerCase().includes('admin') ? 'role-admin'
                : (emp.role || '').toLowerCase().includes('manager') ? 'role-manager'
                : 'role-exec';

              return (
                <div key={emp.id} className={`ac-sc ac-sc-rank-${emp.rank}`}>
                  {/* Header Row: Rank + Performance Status + Trend Indicator */}
                  <div className="ac-sc-header-row">
                    <span className={`ac-sc-rk ac-rk-${rc}`}>
                      {emp.rank === 1 && <Crown size={12} className="ac-rk-svg gold" />}
                      {emp.rank === 2 && <Medal size={12} className="ac-rk-svg silver" />}
                      {emp.rank === 3 && <Award size={12} className="ac-rk-svg bronze" />}
                      #{emp.rank} {emp.rank === 1 ? 'TOP' : ''}
                    </span>

                    {/* Dynamic Trend Badge (+Growth / -Lag) & Performance Status */}
                    <div className="ac-sc-header-r">
                      <span className={`ac-perf-badge ${emp.perfStatus.type}`}>
                        {emp.perfStatus.type === 'high' && <Flame size={12} className="ac-perf-svg high" />}
                        {emp.perfStatus.type === 'mid' && <Zap size={12} className="ac-perf-svg mid" />}
                        {emp.perfStatus.type === 'low' && <AlertTriangle size={12} className="ac-perf-svg low" />}
                        {emp.perfStatus.type === 'none' && <Minus size={12} className="ac-perf-svg none" />}
                        <span>{emp.perfStatus.label}</span>
                      </span>

                      {emp.trendPct > 0 ? (
                        <span className={`ac-trend-pill ${emp.isPositive ? 'pos' : 'neg'}`}>
                          {emp.isPositive ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                          {emp.isPositive ? `+${emp.trendPct}%` : `-${emp.trendPct}%`}
                        </span>
                      ) : null}

                      <div className="ac-sc-score-badge">
                        <span className="ac-sc-pct">{emp.eff}%</span>
                        <span className="ac-sc-pl">EFF.</span>
                      </div>
                    </div>
                  </div>

                  {/* Profile Row: Avatar + Full Name + Role Tag + Revenue */}
                  <div className="ac-sc-profile-row">
                    <div className="ac-sc-av-wrap">
                      <div className={`ac-sc-av rank-av-${emp.rank}`}>{emp.name.charAt(0).toUpperCase()}</div>
                      <span className="ac-sc-status-dot" title="Active Staff" />
                    </div>
                    <div className="ac-sc-info">
                      <div className="ac-sc-name" title={emp.name}>{emp.name}</div>
                      <div className="ac-sc-role-row">
                        <span className={`ac-sc-role-tag ${roleClass}`}>{emp.role}</span>
                        {emp.targetAmount > 0 ? (
                          <span className="ac-sc-rev-tag" style={{ background: emp.targetPct >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(124, 58, 237, 0.12)', color: emp.targetPct >= 100 ? '#10B981' : '#7C3AED', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                            🎯 ₹{(emp.targetAmount/1000).toFixed(0)}k Target ({emp.targetPct}%)
                          </span>
                        ) : (emp.wonRevenue > 0 || emp.achievedRevenue > 0) ? (
                          <span className="ac-sc-rev-tag">₹{((emp.achievedRevenue || emp.wonRevenue)/1000).toFixed(0)}k Won</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* 4-KPI Grid (Prospects, Calls, Deals Closed, Task Score) */}
                  <div className="ac-sc-kpi-4">
                    <div className="ac-kpi-sub-item">
                      <span className="ac-ksi-lbl"><PhoneCall size={11}/> Calls</span>
                      <span className="ac-ksi-val">{emp.calls}</span>
                    </div>
                    <div className="ac-kpi-sub-item">
                      <span className="ac-ksi-lbl"><Target size={11}/> Prospects</span>
                      <span className="ac-ksi-val">{emp.prospects}</span>
                    </div>
                    <div className="ac-kpi-sub-item">
                      <span className="ac-ksi-lbl"><CheckCircle2 size={11}/> Deals</span>
                      <span className="ac-ksi-val">{emp.wonDeals}</span>
                    </div>
                    <div className="ac-kpi-sub-item">
                      <span className="ac-ksi-lbl"><Zap size={11}/> Task %</span>
                      <span className="ac-ksi-val">{emp.done}/{emp.totalTasks||emp.done}</span>
                    </div>
                  </div>

                  {/* Monthly Sales Target Progress Bar */}
                  <div className="ac-sc-bar-wrap" style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed rgba(124, 58, 237, 0.18)' }}>
                    {emp.targetAmount > 0 ? (
                      <div className="ac-sc-bar-lbl" style={{ marginBottom: '6px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: '850', color: emp.targetPct >= 100 ? '#10B981' : '#334155', lineHeight: 1.1 }}>
                            {emp.targetPct}%
                          </div>
                          <div style={{ fontSize: '0.74rem', fontWeight: '750', color: '#64748B', marginTop: '2px' }}>
                            Achieved
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: '850', color: '#64748B', lineHeight: 1.1 }}>
                            {emp.achievedRevenue >= emp.targetAmount ? (
                              <span style={{ color: '#10B981' }}>🎯 Goal Met!</span>
                            ) : (
                              `₹${(Math.max(0, (emp.targetAmount || 0) - (emp.achievedRevenue || 0))).toLocaleString('en-IN')}`
                            )}
                          </div>
                          <div style={{ fontSize: '0.74rem', fontWeight: '750', color: '#94A3B8', marginTop: '2px' }}>
                            {emp.achievedRevenue >= emp.targetAmount ? 'Completed' : 'Remaining'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="ac-sc-bar-lbl" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800, color: 'var(--text-primary, #0F172A)' }}>
                          <Target size={13} style={{ color: '#7C3AED' }} /> Sales Target
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700, fontStyle: 'italic' }}>
                          Target Not Set
                        </span>
                      </div>
                    )}

                    <div className="ac-sc-bar" style={{ height: '8px', borderRadius: '10px', background: 'rgba(148, 163, 184, 0.16)' }}>
                      <div
                        className="ac-sc-fill"
                        style={{
                          width: `${emp.targetAmount > 0 ? Math.min(100, Math.max(0, emp.targetPct)) : 0}%`,
                          height: '100%',
                          borderRadius: '10px',
                          background: emp.targetPct >= 100 ? 'linear-gradient(90deg, #10B981, #059669)' : emp.targetPct >= 50 ? 'linear-gradient(90deg, #FACC15, #EAB308)' : 'linear-gradient(90deg, #7C3AED, #4F46E5)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Task Completion Progress Bar */}
                  {(() => {
                    const taskPct = emp.totalTasks > 0 ? Math.round((emp.done / emp.totalTasks) * 100) : (emp.done > 0 ? 100 : 0);
                    return (
                      <div className="ac-sc-bar-wrap">
                        <div className="ac-sc-bar-lbl">
                          <span>Task Completion Rate</span>
                          <strong>{taskPct}%</strong>
                        </div>
                        <div className="ac-sc-bar">
                          <div className="ac-sc-fill" style={{ width: `${taskPct}%` }} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Footer Metric Pills */}
                  <div className="ac-sc-foot">
                    <div className="ac-sf g" title="Completed Tasks">
                      <CheckCircle2 size={13}/>
                      <span className="ac-sf-text"><strong>{emp.done}</strong> Done</span>
                    </div>
                    <div className="ac-sf a" title="Pending Tasks">
                      <Flame size={13}/>
                      <span className="ac-sf-text"><strong>{emp.pend}</strong> Pending</span>
                    </div>
                    <div className="ac-sf p" title="Follow-up Activities">
                      <Layers size={13}/>
                      <span className="ac-sf-text"><strong>{emp.fups}</strong> Followups</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODE 2: DETAILED MATRIX TABLE VIEW */}
        {staffViewMode === 'table' && (
          <div className="ac-lb-table-container">
            <table className="ac-lb-table">
              <thead>
                <tr>
                  <th>Rank &amp; Employee</th>
                  <th>Role</th>
                  <th>Performance Rating</th>
                  <th>Prospects</th>
                  <th>Calls / Followups</th>
                  <th>Deals Closed</th>
                  <th>Sales Target &amp; Revenue</th>
                  <th>Tasks Done / Total</th>
                  <th>Efficiency Score</th>
                  <th>Performance Trend</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(emp => {
                  const rc = emp.rank===1?'gold':emp.rank===2?'silver':emp.rank===3?'bronze':'slate';
                  const roleClass = (emp.role || '').toLowerCase().includes('admin') ? 'role-admin'
                    : (emp.role || '').toLowerCase().includes('manager') ? 'role-manager'
                    : 'role-exec';

                  return (
                    <tr key={emp.id} className="ac-lbt-row">
                      {/* Rank & Profile */}
                      <td>
                        <div className="ac-lbt-user">
                          <span className={`ac-sc-rk ac-rk-${rc}`}>
                            {emp.rank === 1 && <Crown size={12} className="ac-rk-svg gold" />}
                            {emp.rank === 2 && <Medal size={12} className="ac-rk-svg silver" />}
                            {emp.rank === 3 && <Award size={12} className="ac-rk-svg bronze" />}
                            #{emp.rank}
                          </span>
                          <div className="ac-sc-av-wrap">
                            <div className={`ac-sc-av rank-av-${emp.rank}`}>{emp.name.charAt(0).toUpperCase()}</div>
                            <span className="ac-sc-status-dot" />
                          </div>
                          <span className="ac-lbt-name">{emp.name}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td>
                        <span className={`ac-sc-role-tag ${roleClass}`}>{emp.role}</span>
                      </td>

                      {/* Performance Status Rating Badge */}
                      <td>
                        <span className={`ac-perf-badge ${emp.perfStatus.type}`}>
                          {emp.perfStatus.type === 'high' && <Flame size={12} className="ac-perf-svg high" />}
                          {emp.perfStatus.type === 'mid' && <Zap size={12} className="ac-perf-svg mid" />}
                          {emp.perfStatus.type === 'low' && <AlertTriangle size={12} className="ac-perf-svg low" />}
                          {emp.perfStatus.type === 'none' && <Minus size={12} className="ac-perf-svg none" />}
                          <span>{emp.perfStatus.label}</span>
                        </span>
                      </td>

                      {/* Prospects */}
                      <td>
                        <span className="ac-tbl-chip blue"><Target size={12}/> {emp.prospects} Leads</span>
                      </td>

                      {/* Calls */}
                      <td>
                        <span className="ac-tbl-chip purple"><PhoneCall size={12}/> {emp.calls} Calls ({emp.fups} F-ups)</span>
                      </td>

                      {/* Won Deals */}
                      <td>
                        <span className="ac-tbl-chip green"><CheckCircle2 size={12}/> {emp.wonDeals} Closed</span>
                      </td>

                      {/* Target & Revenue */}
                      <td>
                        <div className="ac-tbl-task-cell">
                          {emp.targetAmount > 0 ? (
                            <span className="ac-tbl-task-text" style={{ fontSize: '0.78rem' }}>
                              <strong>₹{(emp.achievedRevenue || 0).toLocaleString('en-IN')}</strong> / ₹{(emp.targetAmount || 0).toLocaleString('en-IN')} ({emp.targetPct || 0}%)
                            </span>
                          ) : (
                            <span className="ac-tbl-task-text" style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                              ₹{(emp.achievedRevenue || 0).toLocaleString('en-IN')} Collected
                            </span>
                          )}
                          <div className="ac-sc-bar sm">
                            <div
                              className="ac-sc-fill"
                              style={{
                                width: `${emp.targetAmount > 0 ? Math.min(100, Math.max(0, emp.targetPct)) : (emp.achievedRevenue > 0 ? 100 : 0)}%`,
                                background: emp.targetPct >= 100 ? '#10B981' : emp.targetPct >= 50 ? '#EAB308' : '#7C3AED'
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Tasks */}
                      <td>
                        <div className="ac-tbl-task-cell">
                          {(() => {
                            const taskPct = emp.totalTasks > 0 ? Math.round((emp.done / emp.totalTasks) * 100) : (emp.done > 0 ? 100 : 0);
                            return (
                              <>
                                <span className="ac-tbl-task-text"><strong>{emp.done}</strong> / {emp.totalTasks || emp.done} Completed ({taskPct}%)</span>
                                <div className="ac-sc-bar sm"><div className="ac-sc-fill" style={{ width: `${taskPct}%` }} /></div>
                              </>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Score */}
                      <td>
                        <span className="ac-lbt-score">{emp.eff}%</span>
                      </td>

                      {/* Trend */}
                      <td>
                        {emp.trendPct > 0 ? (
                          <span className={`ac-trend-pill ${emp.isPositive ? 'pos' : 'neg'}`}>
                            {emp.isPositive ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                            {emp.isPositive ? `+${emp.trendPct}% Growth` : `-${emp.trendPct}% Lag`}
                          </span>
                        ) : (
                          <span className="ac-trend-pill neutral">0% Baseline</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

export default React.memo(AnalyticsCharts);
