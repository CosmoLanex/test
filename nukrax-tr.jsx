import { useState, useEffect, useRef, useCallback } from "react";

// ─── LOGO ───────────────────────────────────────────────────────────────────
const LOGO_URL = "https://i.postimg.cc/Fskb2D12/0a546062-624f-4cbd-9e01-dd5fb2693e60-removebg-preview.png";

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const INITIAL_TRADES = [
  { id:1, pair:"XAUUSD", type:"BUY",  entry:2315.50, sl:2308.00, tp:2330.00, lots:0.10, pnl:145.00, rr:1.9, result:"WIN",  date:"2025-04-15", time:"09:32", session:"London",  strategy:"Breakout",    notes:"Clean break of resistance. Held well.",  screenshot:null, rules:{london:true,strategy:true,overtrading:false,risk:true} },
  { id:2, pair:"EURUSD", type:"SELL", entry:1.08420, sl:1.08650, tp:1.07980, lots:0.20, pnl:-46.00, rr:1.9, result:"LOSS", date:"2025-04-15", time:"14:10", session:"NY",       strategy:"Reversal",    notes:"News spike triggered SL.",               screenshot:null, rules:{london:false,strategy:true,overtrading:false,risk:true} },
  { id:3, pair:"GBPUSD", type:"BUY",  entry:1.27310, sl:1.27010, tp:1.27910, lots:0.15, pnl:90.00,  rr:2.0, result:"WIN",  date:"2025-04-16", time:"10:05", session:"London",  strategy:"Trend Follow", notes:"Perfect structure trade.",               screenshot:null, rules:{london:true,strategy:true,overtrading:false,risk:true} },
  { id:4, pair:"XAUUSD", type:"SELL", entry:2328.00, sl:2334.50, tp:2315.00, lots:0.10, pnl:130.00, rr:2.0, result:"WIN",  date:"2025-04-16", time:"15:22", session:"NY",       strategy:"Breakout",    notes:"Double top confirmed.",                  screenshot:null, rules:{london:false,strategy:true,overtrading:false,risk:true} },
  { id:5, pair:"USDJPY", type:"BUY",  entry:153.420, sl:153.120, tp:154.020, lots:0.20, pnl:-60.00, rr:2.0, result:"LOSS", date:"2025-04-17", time:"08:45", session:"London",  strategy:"Scalp",       notes:"Choppy session, avoided.",               screenshot:null, rules:{london:true,strategy:false,overtrading:true,risk:false} },
  { id:6, pair:"EURUSD", type:"BUY",  entry:1.08150, sl:1.07900, tp:1.08650, lots:0.25, pnl:125.00, rr:2.0, result:"WIN",  date:"2025-04-17", time:"13:55", session:"NY",       strategy:"Trend Follow", notes:"Strong momentum into NY open.",          screenshot:null, rules:{london:false,strategy:true,overtrading:false,risk:true} },
  { id:7, pair:"XAUUSD", type:"BUY",  entry:2305.00, sl:2298.00, tp:2319.00, lots:0.10, pnl:140.00, rr:2.0, result:"WIN",  date:"2025-04-18", time:"09:15", session:"London",  strategy:"Reversal",    notes:"Bullish engulf on H1.",                  screenshot:null, rules:{london:true,strategy:true,overtrading:false,risk:true} },
  { id:8, pair:"GBPJPY", type:"SELL", entry:194.500, sl:195.100, tp:193.300, lots:0.10, pnl:-60.00, rr:2.0, result:"LOSS", date:"2025-04-19", time:"11:30", session:"London",  strategy:"Breakout",    notes:"False breakout, stop hit.",              screenshot:null, rules:{london:true,strategy:true,overtrading:false,risk:true} },
];

const PAIRS = ["XAUUSD","EURUSD","GBPUSD","USDJPY","GBPJPY","USDCAD","AUDUSD","NZDUSD","USDCHF","EURJPY"];
const STRATEGIES = ["Breakout","Reversal","Trend Follow","Scalp","ICT","SMC","Supply/Demand"];
const SESSIONS = ["London","NY","Asia","London/NY Overlap"];

// ─── UTILS ───────────────────────────────────────────────────────────────────
const calcStats = (trades) => {
  if (!trades.length) return { total:0, wins:0, losses:0, winRate:0, totalPnl:0, avgRR:0, streak:0, bestTrade:0, worstTrade:0 };
  const wins = trades.filter(t => t.result === "WIN");
  const losses = trades.filter(t => t.result === "LOSS");
  const totalPnl = trades.reduce((s,t) => s + t.pnl, 0);
  const avgRR = trades.reduce((s,t) => s + t.rr, 0) / trades.length;
  // streak
  let streak = 0;
  for (let i = trades.length-1; i >= 0; i--) {
    if (i === trades.length-1) { streak = trades[i].result === "WIN" ? 1 : -1; continue; }
    if (trades[i].result === "WIN" && streak > 0) streak++;
    else if (trades[i].result === "LOSS" && streak < 0) streak--;
    else break;
  }
  return {
    total: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: Math.round((wins.length / trades.length) * 100),
    totalPnl: Math.round(totalPnl * 100) / 100,
    avgRR: Math.round(avgRR * 100) / 100,
    streak,
    bestTrade: Math.max(...trades.map(t => t.pnl)),
    worstTrade: Math.min(...trades.map(t => t.pnl)),
  };
};

// ─── MINI CHART COMPONENTS ────────────────────────────────────────────────────
const EquityChart = ({ trades }) => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const w = c.width, h = c.height;
    let cumulative = [0];
    trades.forEach(t => cumulative.push(cumulative[cumulative.length-1] + t.pnl));
    const min = Math.min(...cumulative), max = Math.max(...cumulative);
    const range = max - min || 1;
    ctx.clearRect(0,0,w,h);
    const pts = cumulative.map((v,i) => ({ x: (i/(cumulative.length-1||1))*w, y: h - ((v-min)/range)*(h-20)-10 }));
    // gradient fill
    const grad = ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,"rgba(74,74,74,0.5)");
    grad.addColorStop(1,"rgba(74,74,74,0)");
    ctx.beginPath();
    ctx.moveTo(pts[0].x, h);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length-1].x, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    // line
    ctx.beginPath();
    pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.strokeStyle = cumulative[cumulative.length-1] >= 0 ? "#7fff7f" : "#ff6b6b";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [trades]);
  return <canvas ref={ref} width={300} height={80} style={{width:"100%",height:80}} />;
};

const BarChart = ({ data, colors }) => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const w = c.width, h = c.height;
    const max = Math.max(...data.map(d => Math.abs(d.value))) || 1;
    const bw = w/data.length - 4;
    ctx.clearRect(0,0,w,h);
    data.forEach((d,i) => {
      const bh = (Math.abs(d.value)/max)*(h-20);
      const x = i*(bw+4) + 2;
      const y = d.value >= 0 ? h-bh-10 : h-10;
      ctx.fillStyle = d.value >= 0 ? "#7fff7f" : "#ff6b6b";
      ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = "#888";
      ctx.font = "9px monospace";
      ctx.fillText(d.label, x, h-1);
    });
  }, [data]);
  return <canvas ref={ref} width={300} height={100} style={{width:"100%",height:100}} />;
};

const PieChart = ({ wins, losses }) => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const w = c.width, h = c.height, r = Math.min(w,h)/2-4;
    const total = wins+losses;
    ctx.clearRect(0,0,w,h);
    if (!total) return;
    const winAngle = (wins/total)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(w/2,h/2);
    ctx.arc(w/2,h/2,r,-Math.PI/2,-Math.PI/2+winAngle);
    ctx.fillStyle="#7fff7f"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(w/2,h/2);
    ctx.arc(w/2,h/2,r,-Math.PI/2+winAngle,-Math.PI/2+Math.PI*2);
    ctx.fillStyle="#ff6b6b"; ctx.fill();
    ctx.beginPath(); ctx.arc(w/2,h/2,r*0.55,0,Math.PI*2);
    ctx.fillStyle="#0a0a0a"; ctx.fill();
    ctx.fillStyle="#fff"; ctx.font="bold 12px monospace"; ctx.textAlign="center";
    ctx.fillText(`${Math.round((wins/total)*100)}%`,w/2,h/2+4);
  },[wins,losses]);
  return <canvas ref={ref} width={80} height={80} style={{width:80,height:80}} />;
};

// ─── GLOBAL STYLES ─────────────────────────────────────────────────────────
const injectStyles = () => {
  const id = "nukrax-styles";
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Orbitron:wght@400;500;600;700;800;900&family=Share+Tech+Mono&display=swap');
    
    .nkx-root { all: initial; font-family: 'Rajdhani', sans-serif; }
    .nkx-root *, .nkx-root *::before, .nkx-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    .nkx-root { background: #040404; color: #e0e0e0; min-height: 100vh; overflow-x: hidden; }

    /* scrollbar */
    .nkx-root ::-webkit-scrollbar { width: 4px; }
    .nkx-root ::-webkit-scrollbar-track { background: #0a0a0a; }
    .nkx-root ::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 2px; }

    /* 3D CARD */
    .card3d {
      background: linear-gradient(145deg, #0f0f0f 0%, #080808 100%);
      border: 1px solid #1e1e1e;
      border-radius: 4px;
      position: relative;
      transform-style: preserve-3d;
      transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03);
    }
    .card3d:hover {
      transform: translateY(-4px) rotateX(2deg);
      box-shadow: 0 16px 40px rgba(0,0,0,0.9), 0 0 20px rgba(74,74,74,0.15), inset 0 1px 0 rgba(255,255,255,0.05);
      border-color: #2e2e2e;
    }
    .card3d::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 4px;
      background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 60%);
      pointer-events: none;
    }
    .card3d::after {
      content: '';
      position: absolute;
      bottom: -2px; left: 10%; right: 10%;
      height: 4px;
      background: radial-gradient(ellipse, rgba(74,74,74,0.4) 0%, transparent 70%);
      filter: blur(4px);
    }

    /* STAT CARD */
    .stat-card {
      background: linear-gradient(145deg, #0d0d0d, #070707);
      border: 1px solid #181818;
      border-radius: 4px;
      padding: 20px;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
      transform-style: preserve-3d;
    }
    .stat-card:hover {
      transform: translateY(-6px) rotateX(3deg) rotateY(-1deg);
      border-color: #303030;
      box-shadow: 0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(74,74,74,0.1);
    }
    .stat-card .glow-line {
      position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(200,200,200,0.3), transparent);
    }
    .stat-card .bg-number {
      position: absolute; right: -10px; bottom: -20px;
      font-family: 'Orbitron', monospace; font-size: 80px; font-weight: 900;
      color: rgba(255,255,255,0.02); pointer-events: none; user-select: none;
    }

    /* NAVBAR */
    .navbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      height: 56px;
      background: rgba(4,4,4,0.92);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid #141414;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px;
    }
    .navbar::after {
      content: '';
      position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
    }

    /* SIDEBAR */
    .sidebar {
      position: fixed; left: 0; top: 56px; bottom: 0;
      width: 200px;
      background: linear-gradient(180deg, #050505 0%, #030303 100%);
      border-right: 1px solid #111;
      z-index: 900;
      display: flex; flex-direction: column;
      padding: 24px 0;
    }

    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 20px;
      font-family: 'Rajdhani', sans-serif;
      font-size: 13px; font-weight: 600;
      letter-spacing: 0.08em; text-transform: uppercase;
      color: #555;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      border-left: 2px solid transparent;
    }
    .nav-item:hover { color: #bbb; background: rgba(255,255,255,0.02); }
    .nav-item.active {
      color: #e0e0e0;
      border-left-color: #666;
      background: rgba(255,255,255,0.04);
    }
    .nav-item.active::after {
      content: '';
      position: absolute; right: 0; top: 0; bottom: 0; width: 1px;
      background: linear-gradient(180deg, transparent, rgba(255,255,255,0.1), transparent);
    }

    /* MAIN */
    .main-content {
      margin-left: 200px;
      margin-top: 56px;
      padding: 32px;
      min-height: calc(100vh - 56px);
    }

    /* BUTTONS */
    .btn {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      border: none; cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px;
    }
    .btn-primary {
      background: #1e1e1e; color: #e0e0e0;
      border: 1px solid #333; padding: 10px 20px; border-radius: 2px;
    }
    .btn-primary:hover {
      background: #2a2a2a; border-color: #555;
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    }
    .btn-ghost {
      background: transparent; color: #666;
      border: 1px solid #222; padding: 8px 16px; border-radius: 2px;
    }
    .btn-ghost:hover { color: #aaa; border-color: #444; }
    .btn-danger {
      background: rgba(255,80,80,0.1); color: #ff6b6b;
      border: 1px solid rgba(255,80,80,0.2); padding: 8px 16px; border-radius: 2px;
    }
    .btn-danger:hover { background: rgba(255,80,80,0.2); }

    /* INPUTS */
    .inp {
      background: #080808; border: 1px solid #1a1a1a;
      color: #e0e0e0; font-family: 'Rajdhani', sans-serif;
      font-size: 14px; padding: 10px 14px; border-radius: 2px;
      width: 100%; outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .inp:focus {
      border-color: #3a3a3a;
      box-shadow: 0 0 0 1px rgba(100,100,100,0.1), 0 0 15px rgba(74,74,74,0.1);
    }
    .inp::placeholder { color: #333; }
    select.inp option { background: #0a0a0a; }

    /* LABEL */
    .lbl {
      font-family: 'Share Tech Mono', monospace;
      font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase;
      color: #444; margin-bottom: 6px; display: block;
    }

    /* TABLE */
    .nkx-table { width: 100%; border-collapse: collapse; }
    .nkx-table th {
      font-family: 'Share Tech Mono', monospace;
      font-size: 10px; letter-spacing: 0.15em;
      color: #444; text-transform: uppercase;
      padding: 10px 14px; text-align: left;
      border-bottom: 1px solid #111;
      background: #050505;
    }
    .nkx-table td {
      padding: 12px 14px; border-bottom: 1px solid #0d0d0d;
      font-size: 13px;
      transition: background 0.15s;
    }
    .nkx-table tr:hover td { background: rgba(255,255,255,0.015); cursor: pointer; }
    .nkx-table tr:last-child td { border-bottom: none; }

    /* BADGES */
    .badge {
      display: inline-block; padding: 2px 8px; border-radius: 2px;
      font-family: 'Share Tech Mono', monospace; font-size: 10px;
      letter-spacing: 0.1em; text-transform: uppercase;
    }
    .badge-win { background: rgba(127,255,127,0.08); color: #7fff7f; border: 1px solid rgba(127,255,127,0.2); }
    .badge-loss { background: rgba(255,107,107,0.08); color: #ff6b6b; border: 1px solid rgba(255,107,107,0.2); }
    .badge-buy { background: rgba(127,200,255,0.08); color: #7fc8ff; border: 1px solid rgba(127,200,255,0.2); }
    .badge-sell { background: rgba(255,180,80,0.08); color: #ffb450; border: 1px solid rgba(255,180,80,0.2); }

    /* GRID */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

    /* DIVIDER */
    .divider { border: none; border-top: 1px solid #111; margin: 24px 0; }

    /* PAGE TITLE */
    .page-title {
      font-family: 'Orbitron', monospace; font-size: 20px; font-weight: 700;
      letter-spacing: 0.2em; text-transform: uppercase; color: #ccc;
      margin-bottom: 4px;
    }
    .page-sub {
      font-family: 'Share Tech Mono', monospace; font-size: 11px;
      color: #333; letter-spacing: 0.1em;
    }

    /* TAG */
    .tag {
      display: inline-block; padding: 2px 6px;
      background: #101010; border: 1px solid #1e1e1e;
      border-radius: 2px; font-size: 11px; color: #555;
    }

    /* AUTH */
    .auth-page {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: radial-gradient(ellipse at 50% 40%, #0c0c0c 0%, #040404 70%);
      position: relative; overflow: hidden;
    }
    .auth-page::before {
      content: '';
      position: absolute; inset: 0;
      background: repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,255,255,0.008) 60px, rgba(255,255,255,0.008) 61px),
                  repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.008) 60px, rgba(255,255,255,0.008) 61px);
    }
    .auth-box {
      background: rgba(8,8,8,0.95);
      border: 1px solid #1a1a1a; border-radius: 4px;
      padding: 48px 40px;
      width: 400px; max-width: 95vw;
      position: relative;
      box-shadow: 0 40px 100px rgba(0,0,0,0.9), 0 0 60px rgba(74,74,74,0.05);
      transform-style: preserve-3d;
      animation: authFloat 0.8s ease both;
    }
    @keyframes authFloat { from { opacity:0; transform: translateY(30px) rotateX(5deg); } to { opacity:1; transform: translateY(0) rotateX(0deg); } }
    .auth-box::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
    }
    
    /* COUNTER ANIMATION */
    @keyframes countUp { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
    .count-anim { animation: countUp 0.5s ease both; }

    /* MODAL */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.85);
      backdrop-filter: blur(4px); z-index: 2000;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    .modal {
      background: #080808; border: 1px solid #1e1e1e;
      border-radius: 4px; width: 700px; max-width: 95vw;
      max-height: 90vh; overflow-y: auto;
      box-shadow: 0 40px 100px rgba(0,0,0,0.95);
      animation: modalIn 0.3s ease;
      padding: 32px;
    }
    @keyframes modalIn { from { transform: translateY(-20px) scale(0.97); opacity:0; } to { transform: translateY(0) scale(1); opacity:1; } }

    /* HEATMAP */
    .heatmap-cell {
      width: 28px; height: 28px; border-radius: 2px;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-family: 'Share Tech Mono', monospace; color: #555;
      cursor: pointer; transition: transform 0.15s;
    }
    .heatmap-cell:hover { transform: scale(1.2); }

    /* GLOW TEXT */
    .glow-green { color: #7fff7f; text-shadow: 0 0 20px rgba(127,255,127,0.3); }
    .glow-red { color: #ff6b6b; text-shadow: 0 0 20px rgba(255,107,107,0.3); }
    .glow-white { color: #fff; text-shadow: 0 0 20px rgba(255,255,255,0.2); }

    /* SECTION HEADER */
    .section-h {
      font-family: 'Share Tech Mono', monospace;
      font-size: 11px; letter-spacing: 0.2em;
      color: #333; text-transform: uppercase;
      padding-bottom: 12px; margin-bottom: 16px;
      border-bottom: 1px solid #0f0f0f;
      display: flex; align-items: center; gap: 8px;
    }
    .section-h::before { content: ''; width: 3px; height: 12px; background: #333; border-radius: 1px; }

    .spinner {
      width: 20px; height: 20px; border: 2px solid #1e1e1e;
      border-top-color: #666; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .floating-orb {
      position: absolute; border-radius: 50%; pointer-events: none;
      animation: orbFloat 8s ease-in-out infinite;
    }
    @keyframes orbFloat { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }

    /* PROGRESS BAR */
    .progress-bar { height: 3px; background: #111; border-radius: 2px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #3a3a3a, #7a7a7a); border-radius: 2px; transition: width 1s ease; }
  `;
  document.head.appendChild(s);
};

// ─── ICON COMPONENTS ─────────────────────────────────────────────────────────
const Icon = ({ name, size=16 }) => {
  const icons = {
    dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    journal: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    analytics: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z",
    performance: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
    rules: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    logout: "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
    filter: "M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z",
    upload: "M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z",
    eye: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
    trend: "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
    calendar: "M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}>
      <path d={icons[name] || icons.dashboard} />
    </svg>
  );
};

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

const Logo = ({ size = 32 }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
    <img src={LOGO_URL} alt="NUKRAX" style={{ height: size, width: "auto", filter:"brightness(1.1)" }} onError={e => e.target.style.display="none"} />
    <span style={{ fontFamily:"'Orbitron', monospace", fontWeight:800, fontSize: size*0.55, letterSpacing:"0.15em", color:"#e0e0e0" }}>NUKRAX</span>
    <span style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:9, color:"#333", letterSpacing:"0.2em", alignSelf:"flex-end", paddingBottom:2 }}>.TR</span>
  </div>
);

const StatCard = ({ label, value, sub, color, icon, bg }) => (
  <div className="stat-card" style={{ perspective: 800 }}>
    <div className="glow-line" />
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
      <span className="lbl">{label}</span>
      {icon && <Icon name={icon} size={14} style={{ color:"#333" }} />}
    </div>
    <div style={{ fontFamily:"'Orbitron', monospace", fontSize:28, fontWeight:700, color: color||"#e0e0e0", lineHeight:1 }} className="count-anim">
      {value}
    </div>
    {sub && <div style={{ marginTop:6, fontSize:12, color:"#444", fontFamily:"'Share Tech Mono', monospace" }}>{sub}</div>}
    <div className="bg-number">{bg}</div>
  </div>
);

// ─── AUTH PAGES ──────────────────────────────────────────────────────────────
const AuthPage = ({ mode, onSwitch, onAuth }) => {
  const [form, setForm] = useState({ email:"", password:"", name:"" });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({...p, [k]: e.target.value}));
  const submit = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onAuth(); }, 1000);
  };
  return (
    <div className="auth-page">
      {/* bg orbs */}
      <div className="floating-orb" style={{width:400,height:400,background:"radial-gradient(circle, rgba(40,40,40,0.15) 0%, transparent 70%)",top:"10%",left:"20%",animationDelay:"0s"}} />
      <div className="floating-orb" style={{width:300,height:300,background:"radial-gradient(circle, rgba(30,30,30,0.1) 0%, transparent 70%)",bottom:"15%",right:"20%",animationDelay:"3s"}} />
      <div className="auth-box">
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
            <Logo size={42} />
          </div>
          <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:10, color:"#333", letterSpacing:"0.3em" }}>
            {mode === "login" ? "SECURE ACCESS PORTAL" : "CREATE YOUR ACCOUNT"}
          </div>
        </div>
        {mode === "signup" && (
          <div style={{ marginBottom:16 }}>
            <label className="lbl">Full Name</label>
            <input className="inp" placeholder="Enter name" value={form.name} onChange={set("name")} />
          </div>
        )}
        <div style={{ marginBottom:16 }}>
          <label className="lbl">Email Address</label>
          <input className="inp" type="email" placeholder="trader@example.com" value={form.email} onChange={set("email")} />
        </div>
        <div style={{ marginBottom:28 }}>
          <label className="lbl">Password</label>
          <input className="inp" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} />
        </div>
        <button className="btn btn-primary" style={{ width:"100%", justifyContent:"center", padding:"14px", fontSize:13 }} onClick={submit}>
          {loading ? <span className="spinner" /> : (mode === "login" ? "ACCESS TERMINAL" : "CREATE ACCOUNT")}
        </button>
        <div style={{ marginTop:20, textAlign:"center", fontFamily:"'Share Tech Mono', monospace", fontSize:11, color:"#333" }}>
          {mode === "login" ? <>No account? <span style={{color:"#666",cursor:"pointer"}} onClick={onSwitch}>Register here</span></> : <>Already registered? <span style={{color:"#666",cursor:"pointer"}} onClick={onSwitch}>Login here</span></>}
        </div>
      </div>
    </div>
  );
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
const Dashboard = ({ trades, onNavigate }) => {
  const stats = calcStats(trades);
  const recent = [...trades].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,5);

  // session pnl
  const sessions = {};
  trades.forEach(t => { sessions[t.session] = (sessions[t.session]||0) + t.pnl; });

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:32 }}>
        <div>
          <div className="page-title">COMMAND CENTER</div>
          <div className="page-sub">// performance overview — real-time</div>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate("add")}>
          <Icon name="add" size={14} /> LOG TRADE
        </button>
      </div>

      {/* STATS GRID */}
      <div className="grid-4" style={{ marginBottom:24 }}>
        <StatCard label="Total Trades" value={stats.total} sub="all time" color="#ccc" bg={stats.total} />
        <StatCard label="Win Rate" value={`${stats.winRate}%`} sub={`${stats.wins}W / ${stats.losses}L`} color={stats.winRate >= 50 ? "#7fff7f" : "#ff6b6b"} bg="%" />
        <StatCard label="Total P&L" value={`$${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl}`} sub="net profit" color={stats.totalPnl >= 0 ? "#7fff7f" : "#ff6b6b"} bg="$" />
        <StatCard label="Avg RR" value={stats.avgRR + "R"} sub="risk:reward" color="#aaa" bg="R" />
      </div>
      <div className="grid-4" style={{ marginBottom:32 }}>
        <StatCard label="Current Streak" value={`${stats.streak > 0 ? "+" : ""}${stats.streak}`} sub={stats.streak > 0 ? "winning" : "losing"} color={stats.streak > 0 ? "#7fff7f" : "#ff6b6b"} />
        <StatCard label="Best Trade" value={`$+${stats.bestTrade}`} color="#7fff7f" />
        <StatCard label="Worst Trade" value={`$${stats.worstTrade}`} color="#ff6b6b" />
        <StatCard label="Pairs Traded" value={new Set(trades.map(t=>t.pair)).size} sub="unique pairs" color="#aaa" />
      </div>

      {/* CHARTS ROW */}
      <div className="grid-2" style={{ marginBottom:24 }}>
        <div className="card3d" style={{ padding:24 }}>
          <div className="section-h">Equity Curve</div>
          <EquityChart trades={[...trades].sort((a,b)=>new Date(a.date)-new Date(b.date))} />
        </div>
        <div className="card3d" style={{ padding:24 }}>
          <div className="section-h">Win / Loss Split</div>
          <div style={{ display:"flex", alignItems:"center", gap:24 }}>
            <PieChart wins={stats.wins} losses={stats.losses} />
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{width:10,height:10,background:"#7fff7f",borderRadius:1}} />
                <span style={{fontSize:13,color:"#aaa"}}>Wins: <strong style={{color:"#7fff7f"}}>{stats.wins}</strong></span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{width:10,height:10,background:"#ff6b6b",borderRadius:1}} />
                <span style={{fontSize:13,color:"#aaa"}}>Losses: <strong style={{color:"#ff6b6b"}}>{stats.losses}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SESSION + RECENT */}
      <div className="grid-2">
        <div className="card3d" style={{ padding:24 }}>
          <div className="section-h">Session Performance</div>
          <BarChart data={Object.entries(sessions).map(([k,v]) => ({label:k.slice(0,3), value: Math.round(v)}))} />
        </div>
        <div className="card3d" style={{ padding:24 }}>
          <div className="section-h">Recent Trades</div>
          {recent.map(t => (
            <div key={t.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #0d0d0d" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span className={`badge badge-${t.type.toLowerCase()}`}>{t.type}</span>
                <span style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:12, color:"#aaa" }}>{t.pair}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span className={`badge badge-${t.result.toLowerCase()}`}>{t.result}</span>
                <span style={{ fontFamily:"'Orbitron', monospace", fontSize:12, color: t.pnl >= 0 ? "#7fff7f" : "#ff6b6b" }}>
                  {t.pnl >= 0 ? "+" : ""}${t.pnl}
                </span>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost" style={{ marginTop:16, width:"100%", justifyContent:"center", fontSize:11 }} onClick={() => onNavigate("journal")}>
            VIEW ALL TRADES →
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ADD TRADE ────────────────────────────────────────────────────────────────
const AddTrade = ({ onAdd, onNavigate }) => {
  const [step, setStep] = useState(1);
  const empty = { pair:"XAUUSD", type:"BUY", entry:"", sl:"", tp:"", lots:"0.10", date: new Date().toISOString().slice(0,10), time: new Date().toTimeString().slice(0,5), session:"London", strategy:"Breakout", notes:"", result:"WIN", pnl:"" };
  const [f, setF] = useState(empty);
  const set = k => e => setF(p => ({...p, [k]: e.target.value}));
  const [saved, setSaved] = useState(false);

  const calcPnl = () => {
    const e = parseFloat(f.entry), sl = parseFloat(f.sl), tp = parseFloat(f.tp), lots = parseFloat(f.lots);
    if (!e || !sl || !tp || !lots) return "";
    const diff = f.result === "WIN" ? Math.abs(tp - e) : Math.abs(e - sl);
    const pip = f.pair.includes("JPY") ? 0.01 : f.pair === "XAUUSD" ? 1 : 0.0001;
    const pipValue = f.pair === "XAUUSD" ? 1 : f.pair.includes("JPY") ? 0.65 : 10;
    return (diff / pip * pipValue * lots).toFixed(2);
  };

  const handleSubmit = () => {
    const newTrade = {
      ...f,
      id: Date.now(),
      entry: parseFloat(f.entry),
      sl: parseFloat(f.sl),
      tp: parseFloat(f.tp),
      lots: parseFloat(f.lots),
      pnl: f.result === "WIN" ? parseFloat(f.pnl||calcPnl()||0) : -Math.abs(parseFloat(f.pnl||calcPnl()||0)),
      rr: f.sl && f.tp && f.entry ? Math.abs((parseFloat(f.tp)-parseFloat(f.entry))/(parseFloat(f.entry)-parseFloat(f.sl))).toFixed(1)*1 : 1.0,
      screenshot: null,
      rules: { london: f.session === "London", strategy: true, overtrading: false, risk: true }
    };
    onAdd(newTrade);
    setSaved(true);
    setTimeout(() => { setSaved(false); setF(empty); setStep(1); onNavigate("journal"); }, 1500);
  };

  const steps = ["TRADE INFO", "RISK & PRICE", "META & NOTES"];
  return (
    <div>
      <div style={{ marginBottom:32 }}>
        <div className="page-title">LOG TRADE</div>
        <div className="page-sub">// manual trade entry system</div>
      </div>

      {/* STEP INDICATOR */}
      <div style={{ display:"flex", gap:0, marginBottom:32, borderBottom:"1px solid #111" }}>
        {steps.map((s,i) => (
          <div key={i} onClick={() => setStep(i+1)} style={{ padding:"12px 24px", fontFamily:"'Share Tech Mono', monospace", fontSize:11, letterSpacing:"0.15em", cursor:"pointer",
            color: step===i+1 ? "#e0e0e0" : step>i+1 ? "#555" : "#2a2a2a",
            borderBottom: step===i+1 ? "2px solid #555" : "2px solid transparent",
            transition:"all 0.2s" }}>
            {String(i+1).padStart(2,"0")} {s}
            {step>i+1 && " ✓"}
          </div>
        ))}
      </div>

      <div className="card3d" style={{ padding:32, maxWidth:700 }}>
        {step === 1 && (
          <div>
            <div className="grid-2" style={{ marginBottom:20 }}>
              <div>
                <label className="lbl">Currency Pair</label>
                <select className="inp" value={f.pair} onChange={set("pair")}>
                  {PAIRS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">Trade Type</label>
                <div style={{ display:"flex", gap:8 }}>
                  {["BUY","SELL"].map(t => (
                    <button key={t} className={`btn ${f.type===t ? "btn-primary" : "btn-ghost"}`} style={{ flex:1, justifyContent:"center" }} onClick={() => setF(p => ({...p, type:t}))}>
                      <span style={{ color: t==="BUY" ? "#7fc8ff" : "#ffb450" }}>{t}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid-2" style={{ marginBottom:20 }}>
              <div>
                <label className="lbl">Date</label>
                <input className="inp" type="date" value={f.date} onChange={set("date")} />
              </div>
              <div>
                <label className="lbl">Time</label>
                <input className="inp" type="time" value={f.time} onChange={set("time")} />
              </div>
            </div>
            <div className="grid-2">
              <div>
                <label className="lbl">Session</label>
                <select className="inp" value={f.session} onChange={set("session")}>
                  {SESSIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">Strategy</label>
                <select className="inp" value={f.strategy} onChange={set("strategy")}>
                  {STRATEGIES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="grid-3" style={{ marginBottom:20 }}>
              <div>
                <label className="lbl">Entry Price</label>
                <input className="inp" type="number" step="0.00001" placeholder="0.00000" value={f.entry} onChange={set("entry")} />
              </div>
              <div>
                <label className="lbl">Stop Loss</label>
                <input className="inp" type="number" step="0.00001" placeholder="0.00000" value={f.sl} onChange={set("sl")} />
              </div>
              <div>
                <label className="lbl">Take Profit</label>
                <input className="inp" type="number" step="0.00001" placeholder="0.00000" value={f.tp} onChange={set("tp")} />
              </div>
            </div>
            <div className="grid-2" style={{ marginBottom:20 }}>
              <div>
                <label className="lbl">Lot Size</label>
                <input className="inp" type="number" step="0.01" placeholder="0.10" value={f.lots} onChange={set("lots")} />
              </div>
              <div>
                <label className="lbl">Result</label>
                <div style={{ display:"flex", gap:8 }}>
                  {["WIN","LOSS"].map(r => (
                    <button key={r} className={`btn ${f.result===r ? "btn-primary" : "btn-ghost"}`} style={{ flex:1, justifyContent:"center" }} onClick={() => setF(p => ({...p, result:r}))}>
                      <span style={{ color: r==="WIN" ? "#7fff7f" : "#ff6b6b" }}>{r}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="lbl">P&L ($) — Leave blank to auto-estimate</label>
              <input className="inp" type="number" step="0.01" placeholder={`Est. $${calcPnl() || "0.00"}`} value={f.pnl} onChange={set("pnl")} />
            </div>
            {f.entry && f.sl && f.tp && (
              <div style={{ marginTop:16, padding:"12px 16px", background:"#060606", border:"1px solid #111", borderRadius:2 }}>
                <span className="lbl" style={{ display:"inline" }}>Estimated RR: </span>
                <span style={{ fontFamily:"'Orbitron', monospace", fontSize:14, color:"#aaa" }}>
                  1:{Math.abs((parseFloat(f.tp)-parseFloat(f.entry))/(parseFloat(f.entry)-parseFloat(f.sl))).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ marginBottom:20 }}>
              <label className="lbl">Trade Notes</label>
              <textarea className="inp" rows={5} placeholder="Describe your reasoning, market structure, confluences..." value={f.notes} onChange={set("notes")} style={{ resize:"vertical" }} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label className="lbl">Screenshot Upload (optional)</label>
              <div style={{ border:"2px dashed #1a1a1a", borderRadius:4, padding:"32px", textAlign:"center", background:"#050505", cursor:"pointer", transition:"border-color 0.2s" }}
                   onMouseEnter={e=>e.currentTarget.style.borderColor="#333"}
                   onMouseLeave={e=>e.currentTarget.style.borderColor="#1a1a1a"}>
                <Icon name="upload" size={24} />
                <div style={{ marginTop:8, fontSize:12, color:"#333", fontFamily:"'Share Tech Mono', monospace" }}>DRAG & DROP OR CLICK TO UPLOAD</div>
              </div>
            </div>
            {/* Summary */}
            <div style={{ background:"#060606", border:"1px solid #111", borderRadius:2, padding:16 }}>
              <div className="section-h" style={{ marginBottom:12 }}>Trade Summary</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:13 }}>
                {[["Pair", f.pair], ["Type", f.type], ["Entry", f.entry], ["SL/TP", `${f.sl} / ${f.tp}`], ["Session", f.session], ["Strategy", f.strategy], ["Result", f.result], ["P&L Est.", `$${f.pnl || calcPnl() || "—"}`]].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", gap:8 }}>
                    <span style={{ color:"#333", fontFamily:"'Share Tech Mono', monospace", fontSize:10, minWidth:70 }}>{k}:</span>
                    <span style={{ color:"#ccc" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* NAV BUTTONS */}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:28 }}>
          <button className="btn btn-ghost" onClick={() => step > 1 ? setStep(s=>s-1) : onNavigate("dashboard")}>
            ← {step > 1 ? "BACK" : "CANCEL"}
          </button>
          {step < 3
            ? <button className="btn btn-primary" onClick={() => setStep(s=>s+1)}>NEXT STEP →</button>
            : <button className="btn btn-primary" style={{ background: saved ? "rgba(127,255,127,0.1)" : undefined }} onClick={handleSubmit}>
                {saved ? "✓ TRADE LOGGED" : "CONFIRM & LOG →"}
              </button>
          }
        </div>
      </div>
    </div>
  );
};

// ─── TRADE JOURNAL ────────────────────────────────────────────────────────────
const Journal = ({ trades, onDelete, onSelect }) => {
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState("ALL");
  const [filterSession, setFilterSession] = useState("ALL");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState(-1);

  const filtered = trades
    .filter(t => {
      if (filterResult !== "ALL" && t.result !== filterResult) return false;
      if (filterSession !== "ALL" && t.session !== filterSession) return false;
      if (search && !`${t.pair}${t.strategy}${t.notes}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a,b) => {
      const va = a[sortBy], vb = b[sortBy];
      return typeof va === "string" ? va.localeCompare(vb)*sortDir : (va-vb)*sortDir;
    });

  const sort = col => { setSortBy(col); setSortDir(s => sortBy===col ? -s : -1); };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <div className="page-title">TRADE JOURNAL</div>
          <div className="page-sub">// {filtered.length} trades — {trades.filter(t=>t.result==="WIN").length}W {trades.filter(t=>t.result==="LOSS").length}L</div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="card3d" style={{ padding:16, marginBottom:16, display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ flex:1, minWidth:200, position:"relative" }}>
          <Icon name="search" size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#333" }} />
          <input className="inp" placeholder="Search pair, strategy, notes..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:36 }} />
        </div>
        {[["filterResult", ["ALL","WIN","LOSS"], filterResult, setFilterResult], ["filterSession", ["ALL",...SESSIONS], filterSession, setFilterSession]].map(([k,opts,val,setVal]) => (
          <select key={k} className="inp" style={{ width:140 }} value={val} onChange={e=>setVal(e.target.value)}>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* TABLE */}
      <div className="card3d" style={{ overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table className="nkx-table">
            <thead>
              <tr>
                {[["date","DATE"],["pair","PAIR"],["type","TYPE"],["session","SESSION"],["strategy","STRATEGY"],["rr","RR"],["pnl","P&L"],["result","RESULT"],["","ACTIONS"]].map(([k,h]) => (
                  <th key={h} onClick={() => k && sort(k)} style={{ cursor: k ? "pointer" : "default", userSelect:"none", whiteSpace:"nowrap" }}>
                    {h} {k && sortBy===k ? (sortDir===1 ? "↑" : "↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} onClick={() => onSelect(t)}>
                  <td style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:11, color:"#555" }}>{t.date}</td>
                  <td style={{ fontFamily:"'Orbitron', monospace", fontSize:12, color:"#ccc", fontWeight:600 }}>{t.pair}</td>
                  <td><span className={`badge badge-${t.type.toLowerCase()}`}>{t.type}</span></td>
                  <td><span className="tag">{t.session}</span></td>
                  <td><span className="tag">{t.strategy}</span></td>
                  <td style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:12 }}>{t.rr}R</td>
                  <td style={{ fontFamily:"'Orbitron', monospace", fontSize:12, color: t.pnl >= 0 ? "#7fff7f" : "#ff6b6b" }}>
                    {t.pnl >= 0 ? "+" : ""}${t.pnl}
                  </td>
                  <td><span className={`badge badge-${t.result.toLowerCase()}`}>{t.result}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display:"flex", gap:4 }}>
                      <button className="btn btn-ghost" style={{ padding:"4px 10px" }} onClick={() => onSelect(t)}>
                        <Icon name="eye" size={12} />
                      </button>
                      <button className="btn btn-danger" style={{ padding:"4px 10px" }} onClick={() => onDelete(t.id)}>
                        <Icon name="close" size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding:"60px 24px", textAlign:"center", color:"#222", fontFamily:"'Share Tech Mono', monospace", fontSize:12, letterSpacing:"0.2em" }}>
              NO TRADES MATCH FILTERS
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── TRADE DETAIL MODAL ────────────────────────────────────────────────────────
const TradeDetail = ({ trade, onClose }) => {
  if (!trade) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <div style={{ fontFamily:"'Orbitron', monospace", fontSize:18, fontWeight:700, color:"#ccc" }}>{trade.pair}</div>
            <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:10, color:"#333", marginTop:4 }}>{trade.date} · {trade.time} · {trade.session}</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span className={`badge badge-${trade.result.toLowerCase()}`} style={{ fontSize:13, padding:"4px 12px" }}>{trade.result}</span>
            <button className="btn btn-ghost" style={{ padding:"6px 10px" }} onClick={onClose}><Icon name="close" size={16} /></button>
          </div>
        </div>

        <div className="grid-3" style={{ marginBottom:24 }}>
          {[["Type", trade.type], ["Entry", trade.entry], ["Stop Loss", trade.sl], ["Take Profit", trade.tp], ["Lot Size", trade.lots], ["RR Ratio", trade.rr + "R"]].map(([k,v]) => (
            <div key={k} style={{ background:"#060606", border:"1px solid #0f0f0f", borderRadius:2, padding:"12px 16px" }}>
              <div className="lbl">{k}</div>
              <div style={{ fontFamily:"'Orbitron', monospace", fontSize:14, color:"#ccc" }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ background:"#060606", border:"1px solid #0f0f0f", borderRadius:2, padding:"16px", marginBottom:20, textAlign:"center" }}>
          <div className="lbl">Net P&L</div>
          <div style={{ fontFamily:"'Orbitron', monospace", fontSize:36, fontWeight:700, color: trade.pnl >= 0 ? "#7fff7f" : "#ff6b6b" }}>
            {trade.pnl >= 0 ? "+" : ""}${trade.pnl}
          </div>
        </div>

        <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
          {[["Strategy", trade.strategy], ["Session", trade.session]].map(([k,v]) => (
            <div key={k}><span className="lbl" style={{display:"inline"}}>{k}: </span><span className="tag" style={{marginLeft:4}}>{v}</span></div>
          ))}
        </div>

        {trade.notes && (
          <div style={{ background:"#060606", border:"1px solid #0f0f0f", borderRadius:2, padding:16 }}>
            <div className="section-h" style={{ marginBottom:10 }}>Trade Notes</div>
            <div style={{ fontSize:14, color:"#888", lineHeight:1.6 }}>{trade.notes}</div>
          </div>
        )}

        {/* Rules */}
        <div style={{ marginTop:20 }}>
          <div className="section-h" style={{ marginBottom:12 }}>Rule Compliance</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {Object.entries(trade.rules||{}).map(([k,v]) => (
              <div key={k} style={{ display:"flex", gap:6, alignItems:"center", padding:"4px 10px", background:"#060606", border:`1px solid ${v?"rgba(127,255,127,0.15)":"rgba(255,107,107,0.15)"}`, borderRadius:2 }}>
                <span style={{ color: v ? "#7fff7f" : "#ff6b6b" }}>{v ? "✓" : "✗"}</span>
                <span style={{ fontSize:11, fontFamily:"'Share Tech Mono', monospace", color:"#555", textTransform:"uppercase", letterSpacing:"0.1em" }}>{k.replace(/([A-Z])/g," $1").trim()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
const Analytics = ({ trades }) => {
  const stats = calcStats(trades);

  // pnl by day of week
  const dow = ["Mon","Tue","Wed","Thu","Fri"];
  const dowPnl = dow.map((d,i) => {
    const val = trades.filter(t => new Date(t.date).getDay() === (i+1)).reduce((s,t)=>s+t.pnl,0);
    return { label:d, value:Math.round(val) };
  });

  // pnl by strategy
  const stratData = STRATEGIES.filter(s => trades.some(t=>t.strategy===s)).map(s => ({
    label: s.slice(0,4), value: Math.round(trades.filter(t=>t.strategy===s).reduce((a,t)=>a+t.pnl,0))
  }));

  // pnl by session
  const sessData = SESSIONS.filter(s => trades.some(t=>t.session===s)).map(s => ({
    label: s.slice(0,3), value: Math.round(trades.filter(t=>t.session===s).reduce((a,t)=>a+t.pnl,0))
  }));

  return (
    <div>
      <div style={{ marginBottom:32 }}>
        <div className="page-title">ANALYTICS</div>
        <div className="page-sub">// deep performance breakdown</div>
      </div>

      <div className="grid-4" style={{ marginBottom:24 }}>
        <StatCard label="Profit Factor" value={(trades.filter(t=>t.pnl>0).reduce((s,t)=>s+t.pnl,0) / (Math.abs(trades.filter(t=>t.pnl<0).reduce((s,t)=>s+t.pnl,0))||1)).toFixed(2)} color="#aaa" />
        <StatCard label="Avg Win" value={`$${Math.round(trades.filter(t=>t.pnl>0).reduce((s,t)=>s+t.pnl,0)/(trades.filter(t=>t.pnl>0).length||1))}`} color="#7fff7f" />
        <StatCard label="Avg Loss" value={`$${Math.round(trades.filter(t=>t.pnl<0).reduce((s,t)=>s+t.pnl,0)/(trades.filter(t=>t.pnl<0).length||1))}`} color="#ff6b6b" />
        <StatCard label="Avg RR" value={stats.avgRR + "R"} color="#aaa" />
      </div>

      <div className="grid-2" style={{ marginBottom:24 }}>
        <div className="card3d" style={{ padding:24 }}>
          <div className="section-h">Equity Curve</div>
          <EquityChart trades={[...trades].sort((a,b)=>new Date(a.date)-new Date(b.date))} />
        </div>
        <div className="card3d" style={{ padding:24 }}>
          <div className="section-h">Performance by Day of Week</div>
          <BarChart data={dowPnl} />
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom:24 }}>
        <div className="card3d" style={{ padding:24 }}>
          <div className="section-h">Strategy Performance</div>
          <BarChart data={stratData} />
        </div>
        <div className="card3d" style={{ padding:24 }}>
          <div className="section-h">Session Performance</div>
          <BarChart data={sessData} />
        </div>
      </div>

      {/* Pair breakdown */}
      <div className="card3d" style={{ padding:24 }}>
        <div className="section-h">Pair Performance</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:12 }}>
          {[...new Set(trades.map(t=>t.pair))].map(pair => {
            const pairTrades = trades.filter(t=>t.pair===pair);
            const pnl = pairTrades.reduce((s,t)=>s+t.pnl,0);
            const wr = Math.round((pairTrades.filter(t=>t.result==="WIN").length/pairTrades.length)*100);
            return (
              <div key={pair} style={{ background:"#060606", border:"1px solid #0f0f0f", borderRadius:2, padding:14 }}>
                <div style={{ fontFamily:"'Orbitron', monospace", fontSize:13, color:"#aaa", marginBottom:8 }}>{pair}</div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                  <span style={{ color:"#444" }}>{pairTrades.length} trades · {wr}% WR</span>
                  <span style={{ fontFamily:"'Orbitron', monospace", color: pnl>=0?"#7fff7f":"#ff6b6b", fontSize:12 }}>{pnl>=0?"+":""}${Math.round(pnl)}</span>
                </div>
                <div className="progress-bar" style={{ marginTop:8 }}>
                  <div className="progress-fill" style={{ width:`${wr}%`, background: wr>=50 ? "linear-gradient(90deg,#2a5a2a,#7fff7f)" : "linear-gradient(90deg,#5a2a2a,#ff6b6b)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── PERFORMANCE PAGE ─────────────────────────────────────────────────────────
const Performance = ({ trades }) => {
  // build calendar data
  const calData = {};
  trades.forEach(t => { calData[t.date] = (calData[t.date]||0) + t.pnl; });

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const monthName = today.toLocaleString("default",{month:"long",year:"numeric"}).toUpperCase();

  const maxAbs = Math.max(...Object.values(calData).map(Math.abs), 1);

  const getColor = (pnl) => {
    if (!pnl) return "#0a0a0a";
    const intensity = Math.min(Math.abs(pnl)/maxAbs, 1);
    if (pnl > 0) return `rgba(127,255,127,${0.1 + intensity*0.5})`;
    return `rgba(255,107,107,${0.1 + intensity*0.5})`;
  };

  // weekly stats
  const weekly = {};
  trades.forEach(t => {
    const d = new Date(t.date);
    const wk = `${year}-W${Math.ceil(d.getDate()/7)}`;
    if (!weekly[wk]) weekly[wk] = { pnl:0, trades:0, wins:0 };
    weekly[wk].pnl += t.pnl;
    weekly[wk].trades++;
    if (t.result === "WIN") weekly[wk].wins++;
  });

  return (
    <div>
      <div style={{ marginBottom:32 }}>
        <div className="page-title">PERFORMANCE TRACKER</div>
        <div className="page-sub">// calendar & time-based analysis</div>
      </div>

      <div className="grid-2" style={{ marginBottom:24 }}>
        {/* CALENDAR */}
        <div className="card3d" style={{ padding:24 }}>
          <div className="section-h">Monthly Heatmap — {monthName}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:8 }}>
            {["S","M","T","W","T","F","S"].map((d,i) => (
              <div key={i} style={{ textAlign:"center", fontFamily:"'Share Tech Mono', monospace", fontSize:9, color:"#222", padding:4 }}>{d}</div>
            ))}
            {[...Array(firstDay)].map((_,i) => <div key={`e-${i}`} />)}
            {[...Array(daysInMonth)].map((_,i) => {
              const day = i+1;
              const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const pnl = calData[dateStr];
              return (
                <div key={day} className="heatmap-cell" title={pnl ? `$${pnl.toFixed(0)}` : "No trades"}
                  style={{ background: getColor(pnl), border:`1px solid ${pnl?"rgba(255,255,255,0.05)":"#0d0d0d"}`, margin:"auto" }}>
                  {day}
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:16, marginTop:12 }}>
            {[["Profit", "#7fff7f"], ["Loss", "#ff6b6b"], ["No Trade", "#0a0a0a"]].map(([l,c]) => (
              <div key={l} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:12, height:12, background:c, border:"1px solid #1a1a1a", borderRadius:1 }} />
                <span style={{ fontSize:10, fontFamily:"'Share Tech Mono', monospace", color:"#333" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MONTHLY STATS */}
        <div className="card3d" style={{ padding:24 }}>
          <div className="section-h">This Month Summary</div>
          {(() => {
            const thisMonth = trades.filter(t => t.date.startsWith(`${year}-${String(month+1).padStart(2,"0")}`));
            const stats = calcStats(thisMonth);
            return (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[["Trades", stats.total], ["Win Rate", `${stats.winRate}%`], ["P&L", `${stats.totalPnl>=0?"+":""}$${stats.totalPnl}`], ["Avg RR", `${stats.avgRR}R`],
                  ["Best Day", `+$${Math.max(0,...Object.values(calData).filter(v=>v>0))}`],
                  ["Worst Day", `$${Math.min(0,...Object.values(calData).filter(v=>v<0))}`]].map(([k,v]) => (
                  <div key={k} style={{ background:"#060606", border:"1px solid #0f0f0f", borderRadius:2, padding:"12px 16px" }}>
                    <div className="lbl">{k}</div>
                    <div style={{ fontFamily:"'Orbitron', monospace", fontSize:16, color:"#ccc" }}>{v}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* WEEKLY BREAKDOWN */}
      <div className="card3d" style={{ padding:24 }}>
        <div className="section-h">Weekly Breakdown</div>
        <table className="nkx-table">
          <thead><tr>
            <th>WEEK</th><th>TRADES</th><th>WIN RATE</th><th>P&L</th><th>PERFORMANCE</th>
          </tr></thead>
          <tbody>
            {Object.entries(weekly).map(([wk, data]) => {
              const wr = Math.round((data.wins/data.trades)*100);
              return (
                <tr key={wk}>
                  <td style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:11, color:"#555" }}>{wk}</td>
                  <td>{data.trades}</td>
                  <td><span style={{ color: wr>=50?"#7fff7f":"#ff6b6b" }}>{wr}%</span></td>
                  <td style={{ fontFamily:"'Orbitron', monospace", color: data.pnl>=0?"#7fff7f":"#ff6b6b" }}>
                    {data.pnl>=0?"+":""}${Math.round(data.pnl)}
                  </td>
                  <td>
                    <div className="progress-bar" style={{ width:160 }}>
                      <div className="progress-fill" style={{ width:`${wr}%`, background: wr>=50?"linear-gradient(90deg,#2a5a2a,#7fff7f)":"linear-gradient(90deg,#5a2a2a,#ff6b6b)" }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── RULES PAGE ───────────────────────────────────────────────────────────────
const Rules = ({ onComplete }) => {
  const rulesList = [
    { id:"london", label:"Only traded London or NY session", key:"session" },
    { id:"strategy", label:"Followed defined trading strategy", key:"strategy" },
    { id:"overtrading", label:"Avoided overtrading (max 3 trades/day)", key:"overtrading" },
    { id:"risk", label:"Proper risk management applied (≤1% per trade)", key:"risk" },
    { id:"entry", label:"Waited for confirmed entry signal", key:"entry" },
    { id:"bias", label:"Traded with correct market bias", key:"bias" },
    { id:"setup", label:"Setup was within the trading plan", key:"setup" },
    { id:"emotion", label:"No emotional or revenge trading", key:"emotion" },
  ];
  const [checks, setChecks] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const toggle = id => setChecks(p => ({...p, [id]: !p[id]}));
  const score = Object.values(checks).filter(Boolean).length;
  const result = score >= 7 ? "SUCCESSFUL DAY" : score >= 5 ? "AVERAGE DAY" : "FAILED DAY";
  const resultColor = score >= 7 ? "#7fff7f" : score >= 5 ? "#ffb450" : "#ff6b6b";

  return (
    <div>
      <div style={{ marginBottom:32 }}>
        <div className="page-title">NUKRAX RULE TRACKER</div>
        <div className="page-sub">// discipline system — rate today's session</div>
      </div>

      <div className="grid-2">
        <div className="card3d" style={{ padding:32 }}>
          <div className="section-h">Daily Rules Checklist</div>
          {rulesList.map(rule => (
            <div key={rule.id} onClick={() => !submitted && toggle(rule.id)} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:"1px solid #0d0d0d", cursor: submitted ? "default" : "pointer", transition:"opacity 0.2s" }}
              onMouseEnter={e => !submitted && (e.currentTarget.style.opacity="0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity="1")}>
              <div style={{ width:22, height:22, borderRadius:2, border:`1.5px solid ${checks[rule.id]?"#7fff7f":"#1e1e1e"}`,
                background: checks[rule.id] ? "rgba(127,255,127,0.08)" : "#060606",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
                {checks[rule.id] && <span style={{ color:"#7fff7f", fontSize:13 }}>✓</span>}
              </div>
              <span style={{ fontSize:14, color: checks[rule.id] ? "#ccc" : "#555", transition:"color 0.2s" }}>{rule.label}</span>
            </div>
          ))}

          {!submitted ? (
            <button className="btn btn-primary" style={{ marginTop:24, width:"100%", justifyContent:"center", padding:14 }}
              onClick={() => setSubmitted(true)}>
              SUBMIT DAILY REVIEW
            </button>
          ) : (
            <button className="btn btn-ghost" style={{ marginTop:24, width:"100%", justifyContent:"center" }}
              onClick={() => { setChecks({}); setSubmitted(false); }}>
              RESET FOR NEW DAY
            </button>
          )}
        </div>

        {/* RESULT */}
        <div>
          <div className="card3d" style={{ padding:32, textAlign:"center", marginBottom:16 }}>
            <div className="lbl" style={{ marginBottom:16 }}>Score</div>
            <div style={{ fontFamily:"'Orbitron', monospace", fontSize:64, fontWeight:900, color: resultColor, lineHeight:1 }}>
              {score}<span style={{ fontSize:32, color:"#333" }}>/{rulesList.length}</span>
            </div>
            <div style={{ marginTop:20, fontFamily:"'Orbitron', monospace", fontSize:14, letterSpacing:"0.2em", color: submitted ? resultColor : "#222" }}>
              {submitted ? result : "PENDING REVIEW"}
            </div>
            {submitted && (
              <div className="progress-bar" style={{ marginTop:20 }}>
                <div className="progress-fill" style={{ width:`${(score/rulesList.length)*100}%`,
                  background: score>=7 ? "linear-gradient(90deg,#2a5a2a,#7fff7f)" : score>=5 ? "linear-gradient(90deg,#5a4000,#ffb450)" : "linear-gradient(90deg,#5a2a2a,#ff6b6b)" }} />
              </div>
            )}
          </div>

          {/* RULE HISTORY HINT */}
          <div className="card3d" style={{ padding:24 }}>
            <div className="section-h">Rule Guide</div>
            <div style={{ fontSize:13, color:"#444", lineHeight:2, fontFamily:"'Share Tech Mono', monospace", fontSize:11 }}>
              <div style={{ color:"#7fff7f" }}>7-8 rules ✓ → SUCCESSFUL DAY</div>
              <div style={{ color:"#ffb450" }}>5-6 rules ✓ → AVERAGE DAY</div>
              <div style={{ color:"#ff6b6b" }}>0-4 rules ✓ → FAILED DAY</div>
              <hr className="divider" style={{ margin:"12px 0" }} />
              <div style={{ color:"#333" }}>Complete this tracker after each trading session to build discipline and identify patterns in rule-breaking behavior.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => { injectStyles(); }, []);

  const [auth, setAuth] = useState("login"); // login | signup | app
  const [page, setPage] = useState("dashboard");
  const [trades, setTrades] = useState(INITIAL_TRADES);
  const [selectedTrade, setSelectedTrade] = useState(null);

  const addTrade = t => setTrades(p => [t, ...p]);
  const deleteTrade = id => setTrades(p => p.filter(t => t.id !== id));

  if (auth === "login" || auth === "signup") {
    return (
      <div className="nkx-root">
        <AuthPage mode={auth} onSwitch={() => setAuth(auth==="login"?"signup":"login")} onAuth={() => setAuth("app")} />
      </div>
    );
  }

  const navItems = [
    { key:"dashboard", label:"Dashboard", icon:"dashboard" },
    { key:"add",       label:"Log Trade",  icon:"add" },
    { key:"journal",   label:"Journal",    icon:"journal" },
    { key:"analytics", label:"Analytics",  icon:"analytics" },
    { key:"performance",label:"Performance",icon:"performance" },
    { key:"rules",     label:"Rules",      icon:"rules" },
  ];

  return (
    <div className="nkx-root">
      {/* NAVBAR */}
      <nav className="navbar">
        <Logo size={28} />
        <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:10, color:"#2a2a2a", letterSpacing:"0.2em" }}>
          TRADING JOURNAL v1.0 — {new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}).toUpperCase()}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#7fff7f", boxShadow:"0 0 8px rgba(127,255,127,0.5)" }} />
          <span style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:10, color:"#444" }}>LIVE</span>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"#111", border:"1px solid #1e1e1e", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
            onClick={() => setAuth("login")}>
            <Icon name="logout" size={14} />
          </div>
        </div>
      </nav>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div style={{ padding:"0 12px", marginBottom:24 }}>
          <div style={{ fontSize:9, fontFamily:"'Share Tech Mono', monospace", letterSpacing:"0.2em", color:"#1e1e1e", textTransform:"uppercase", padding:"0 8px" }}>Navigation</div>
        </div>
        {navItems.map(item => (
          <div key={item.key} className={`nav-item ${page===item.key?"active":""}`} onClick={() => setPage(item.key)}>
            <Icon name={item.icon} size={14} />
            {item.label}
          </div>
        ))}
        <div style={{ marginTop:"auto", padding:"0 20px" }}>
          <div style={{ borderTop:"1px solid #0d0d0d", paddingTop:20 }}>
            <div style={{ fontSize:10, fontFamily:"'Share Tech Mono', monospace", color:"#1e1e1e" }}>
              {trades.length} TRADES LOGGED
            </div>
            <div style={{ fontSize:10, fontFamily:"'Share Tech Mono', monospace", color:"#1a1a1a", marginTop:4 }}>
              NUKRAX.TR © 2025
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        {page === "dashboard"   && <Dashboard trades={trades} onNavigate={setPage} />}
        {page === "add"         && <AddTrade onAdd={addTrade} onNavigate={setPage} />}
        {page === "journal"     && <Journal trades={trades} onDelete={deleteTrade} onSelect={setSelectedTrade} />}
        {page === "analytics"   && <Analytics trades={trades} />}
        {page === "performance" && <Performance trades={trades} />}
        {page === "rules"       && <Rules />}
      </main>

      {/* TRADE DETAIL MODAL */}
      {selectedTrade && <TradeDetail trade={selectedTrade} onClose={() => setSelectedTrade(null)} />}
    </div>
  );
}
