import { useState, useRef, useEffect, useCallback } from "react";

// ─── STORAGE HELPERS ───
const DEFAULT_GUILDS = [{ id: "1476466974098985067", name: "Main Server", createdAt: Date.now(), color: "#6366f1" }];
const GUILD_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#10b981","#0ea5e9","#14b8a6"];

function getStoredGuilds() {
  try { return JSON.parse(localStorage.getItem("nexus_guilds") || "null") || DEFAULT_GUILDS; }
  catch { return DEFAULT_GUILDS; }
}
function getStoredActiveId() { return localStorage.getItem("nexus_active_guild") || DEFAULT_GUILDS[0].id; }
function saveGuilds(g) { localStorage.setItem("nexus_guilds", JSON.stringify(g)); }
function saveActiveId(id) { localStorage.setItem("nexus_active_guild", id); }

function makeSystemPrompt(guildId) {
  return `You are an AI assistant for the knowledge base with vector store ID: ${guildId}.
Answer questions based on uploaded documents and your available knowledge.
Be concise, accurate, and helpful. Use markdown formatting when appropriate.
If information is unavailable, provide the best answer you can and indicate uncertainty.`;
}

// ─── GLOBAL STYLES ───
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body {
    font-family: 'IBM Plex Sans', sans-serif;
    background: #0a0a0f;
    color: #e2e8f0;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  :root {
    --bg-base: #0a0a0f;
    --bg-surface: #111118;
    --bg-elevated: #1a1a24;
    --bg-overlay: #22222e;
    --border: rgba(255,255,255,0.07);
    --border-active: rgba(255,255,255,0.15);
    --text-primary: #f0f0f8;
    --text-secondary: rgba(240,240,248,0.55);
    --text-muted: rgba(240,240,248,0.3);
    --accent: #6366f1;
    --accent-glow: rgba(99,102,241,0.25);
    --accent-hover: #818cf8;
    --success: #10b981;
    --success-bg: rgba(16,185,129,0.1);
    --danger: #f43f5e;
    --danger-bg: rgba(244,63,94,0.1);
    --warning: #f59e0b;
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --sidebar-w: 260px;
  }

  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes slideRight { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
  @keyframes glow { 0%,100% { box-shadow: 0 0 8px var(--accent-glow); } 50% { box-shadow: 0 0 20px var(--accent-glow), 0 0 40px var(--accent-glow); } }

  .anim-up   { animation: fadeUp .4s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-in   { animation: fadeIn .3s ease both; }
  .anim-slide { animation: slideRight .3s cubic-bezier(0.16,1,0.3,1) both; }
  .d1 { animation-delay: 0.05s; }
  .d2 { animation-delay: 0.1s; }
  .d3 { animation-delay: 0.15s; }
  .d4 { animation-delay: 0.2s; }

  /* Scrollbars */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }

  /* Inputs */
  .field {
    width: 100%;
    background: var(--bg-base);
    border: 1.5px solid var(--border);
    color: var(--text-primary);
    border-radius: var(--radius-md);
    padding: 10px 14px;
    font-size: 13px;
    font-family: 'IBM Plex Sans', sans-serif;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
  }
  .field::placeholder { color: var(--text-muted); }
  .field:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
  .field-mono { font-family: 'IBM Plex Mono', monospace !important; font-size: 12px !important; }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 7px; border: none; cursor: pointer; font-family: 'IBM Plex Sans', sans-serif; font-weight: 500; border-radius: var(--radius-md); transition: all .15s; white-space: nowrap; }
  .btn:disabled { opacity: .4; cursor: not-allowed; pointer-events: none; }
  .btn-primary { background: var(--accent); color: #fff; padding: 9px 18px; font-size: 13px; box-shadow: 0 4px 16px var(--accent-glow); }
  .btn-primary:hover { background: var(--accent-hover); transform: translateY(-1px); box-shadow: 0 8px 24px var(--accent-glow); }
  .btn-ghost { background: transparent; color: var(--text-secondary); padding: 8px 14px; font-size: 13px; border: 1.5px solid var(--border); }
  .btn-ghost:hover { background: var(--bg-elevated); color: var(--text-primary); border-color: var(--border-active); }
  .btn-danger { background: var(--danger-bg); color: var(--danger); padding: 7px 14px; font-size: 12.5px; border: 1.5px solid rgba(244,63,94,0.2); }
  .btn-danger:hover { background: rgba(244,63,94,0.2); }
  .btn-success { background: var(--success-bg); color: var(--success); padding: 9px 18px; font-size: 13px; border: 1.5px solid rgba(16,185,129,0.2); }
  .btn-success:hover { background: rgba(16,185,129,0.2); }
  .btn-icon { background: var(--bg-elevated); color: var(--text-secondary); padding: 8px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); }
  .btn-icon:hover { color: var(--text-primary); border-color: var(--border-active); }

  /* Cards */
  .panel {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
  }

  /* Tags */
  .tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; letter-spacing: .03em; }
  .tag-accent { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.2); }
  .tag-success { background: var(--success-bg); color: var(--success); border: 1px solid rgba(16,185,129,0.2); }
  .tag-danger { background: var(--danger-bg); color: var(--danger); border: 1px solid rgba(244,63,94,0.2); }
  .tag-warning { background: rgba(245,158,11,0.1); color: var(--warning); border: 1px solid rgba(245,158,11,0.2); }

  /* Nav items */
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px; border-radius: var(--radius-md);
    font-size: 13px; font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer; transition: all .12s;
    border: none; background: none;
    font-family: 'IBM Plex Sans', sans-serif;
    width: 100%; text-align: left;
  }
  .nav-item:hover { background: var(--bg-elevated); color: var(--text-primary); }
  .nav-item.active { background: rgba(99,102,241,0.15); color: #818cf8; }
  .nav-item .nav-icon { width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px; }
  .nav-item.active .nav-icon { background: rgba(99,102,241,0.2); }
  .nav-item:not(.active) .nav-icon { background: var(--bg-elevated); }

  /* Upload zone */
  .drop-zone {
    border: 2px dashed var(--border);
    border-radius: var(--radius-md);
    padding: 28px 20px;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    cursor: pointer; transition: all .15s; text-align: center;
  }
  .drop-zone:hover { border-color: var(--accent); background: var(--accent-glow); }

  /* Status bar */
  .status-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
  .status-online { background: var(--success); box-shadow: 0 0 8px rgba(16,185,129,0.5); animation: pulse 2s ease infinite; }
  .status-offline { background: #4b5563; }

  .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.15); border-top-color: currentColor; border-radius: 50%; animation: spin .65s linear infinite; }

  /* Table */
  .data-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .data-table th { padding: 9px 14px; text-align: left; color: var(--text-muted); font-weight: 600; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; border-bottom: 1px solid var(--border); }
  .data-table td { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--text-secondary); vertical-align: middle; }
  .data-table tr:hover td { background: var(--bg-elevated); color: var(--text-primary); }

  /* Code block */
  .code-block {
    background: var(--bg-base);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 3px 8px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    color: #a5b4fc;
  }

  /* Checkbox */
  .check-row { display: flex; align-items: center; gap: 10px; padding: 9px 14px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.04); transition: background .1s; }
  .check-row:hover { background: var(--bg-elevated); }
  .check-row.selected { background: rgba(99,102,241,0.08); }
  .custom-check { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid var(--border); flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all .12s; }
  .custom-check.checked { background: var(--accent); border-color: var(--accent); }

  /* Modal */
  .modal-bg { animation: fadeIn .2s both; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); }
  .modal-box { animation: fadeUp .25s cubic-bezier(0.16,1,0.3,1) both; }

  /* Divider */
  .divider { height: 1px; background: var(--border); margin: 20px 0; }
`;

function GlobalStyles() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);
  return null;
}

// ─── ICONS ───
const Icon = {
  Home: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Upload: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Globe: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Chat: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Database: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Settings: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M21 12h-1M4 12H3M12 21v-1M12 4V3"/></svg>,
  Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Check: () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Send: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  X: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  ChevronDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  ExternalLink: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Folder: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  Activity: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
};

// ─── MARKDOWN RENDERER ───
function inlineFormat(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} style={{ color: "var(--text-primary)", fontWeight: 600 }}>{p.slice(2,-2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc", padding: "1px 6px", borderRadius: 4, fontSize: "0.87em", fontFamily: "'IBM Plex Mono', monospace" }}>{p.slice(1,-1)}</code>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={i}>{p.slice(1,-1)}</em>;
    return p;
  });
}

function MsgContent({ text }) {
  const lines = text.split("\n");
  const els = [];
  lines.forEach((line, i) => {
    if (line.startsWith("- ") || line.startsWith("* ")) {
      els.push(<div key={i} style={{ display:"flex", gap:8, marginBottom:3 }}>
        <span style={{ color:"#818cf8", flexShrink:0 }}>›</span>
        <span>{inlineFormat(line.slice(2))}</span>
      </div>);
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)[1];
      els.push(<div key={i} style={{ display:"flex", gap:8, marginBottom:3 }}>
        <span style={{ color:"#818cf8", minWidth:16, flexShrink:0, fontFamily:"'IBM Plex Mono', monospace", fontSize:11 }}>{num}.</span>
        <span>{inlineFormat(line.replace(/^\d+\.\s/, ""))}</span>
      </div>);
    } else if (line.startsWith("### ")) {
      els.push(<div key={i} style={{ fontSize:12.5, fontWeight:600, color:"var(--text-primary)", marginTop:8, marginBottom:3, letterSpacing:"0.02em" }}>{line.slice(4)}</div>);
    } else if (line.trim() === "") {
      els.push(<div key={i} style={{ height:5 }} />);
    } else {
      els.push(<p key={i} style={{ lineHeight:1.65, marginBottom:2 }}>{inlineFormat(line)}</p>);
    }
  });
  return <div style={{ fontSize:13, color:"var(--text-secondary)", lineHeight:1.65 }}>{els}</div>;
}

function TypingDots() {
  return (
    <div style={{ display:"flex", gap:4, alignItems:"center", padding:"3px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:"rgba(129,140,248,0.4)", animation:`blink 1.2s ease ${i*0.2}s infinite` }} />
      ))}
    </div>
  );
}

// ─── CHAT PANEL ───
const CHAT_SUGGESTIONS = [
  "What documents are in the knowledge base?",
  "Summarize what you know",
  "What topics can you help with?",
  "How do I add more documents?",
];

function ChatPanel({ isOpen, guildId, guildName }) {
  const SYSTEM = makeSystemPrompt(guildId);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSugg, setShowSugg] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 250); }, [isOpen]);

  const autoResize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  };

  const callAPI = useCallback(async (question, hist) => {
    setLoading(true);
    try {
      let text = "";
      try {
        const r = await fetch("http://localhost:8000/query", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ question, server: guildId }),
        });
        if (r.ok) { const d = await r.json(); if (d.answer) text = d.answer; }
      } catch (_) {}

      if (!text) {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system:SYSTEM, messages:hist }),
        });
        if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${r.status}`); }
        const d = await r.json();
        text = d.content.filter(b => b.type==="text").map(b => b.text).join("\n").trim();
        if (!text) throw new Error("No response received.");
      }
      setMessages(p => [...p, { role:"assistant", content:text, id:Date.now() }]);
      setHistory(p => [...p, { role:"assistant", content:text }]);
    } catch (e) {
      setMessages(p => [...p, { role:"assistant", content:"Error: "+e.message, id:Date.now(), error:true }]);
    } finally { setLoading(false); }
  }, [guildId, SYSTEM]);

  const send = useCallback((text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setShowSugg(false);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    const hist = [...history, { role:"user", content:q }];
    setMessages(p => [...p, { role:"user", content:q, id:Date.now() }]);
    setHistory(hist);
    callAPI(q, hist);
  }, [input, loading, history, callAPI]);

  return (
    <div style={{
      position:"fixed", bottom:88, right:28,
      width:380, height:520,
      background:"var(--bg-surface)",
      border:"1px solid var(--border-active)",
      borderRadius:"var(--radius-xl)",
      boxShadow:"0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
      zIndex:500, display:"flex", flexDirection:"column", overflow:"hidden",
      transition:"transform .3s cubic-bezier(0.16,1,0.3,1), opacity .2s ease",
      transform: isOpen ? "scale(1) translateY(0)" : "scale(0.92) translateY(20px)",
      opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "all" : "none",
      transformOrigin:"bottom right",
    }}>
      {/* Header */}
      <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10, background:"var(--bg-elevated)", flexShrink:0 }}>
        <div style={{ width:32, height:32, borderRadius:"var(--radius-sm)", background:"rgba(99,102,241,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Icon.Chat />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)", fontFamily:"'IBM Plex Mono', monospace" }}>{guildName}</div>
          <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:1 }}>Knowledge Base Assistant</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span className="status-dot status-online" />
          <span style={{ fontSize:11, color:"var(--success)", fontWeight:500 }}>Online</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:12 }}>
        {/* Welcome */}
        <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
          <div style={{ width:26, height:26, borderRadius:"var(--radius-sm)", background:"rgba(99,102,241,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
            <Icon.Database />
          </div>
          <div>
            <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:"4px 12px 12px 12px", padding:"10px 14px", fontSize:13, color:"var(--text-secondary)", lineHeight:1.6, maxWidth:290 }}>
              Hello! I'm the AI assistant for <strong style={{ color:"var(--text-primary)", fontFamily:"'IBM Plex Mono', monospace", fontSize:12 }}>{guildName}</strong>. Ask me anything about this knowledge base.
            </div>
            {showSugg && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8 }}>
                {CHAT_SUGGESTIONS.map((s,i) => (
                  <button key={i} onClick={() => send(s)}
                    style={{ padding:"5px 10px", borderRadius:100, border:"1px solid var(--border)", background:"var(--bg-elevated)", color:"var(--text-muted)", fontSize:11, cursor:"pointer", fontFamily:"'IBM Plex Sans', sans-serif", transition:"all .12s" }}
                    onMouseEnter={e => { e.target.style.borderColor="var(--accent)"; e.target.style.color="var(--text-primary)"; }}
                    onMouseLeave={e => { e.target.style.borderColor="var(--border)"; e.target.style.color="var(--text-muted)"; }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {messages.map(msg => (
          <div key={msg.id} className="anim-up">
            {msg.role === "user" ? (
              <div style={{ display:"flex", justifyContent:"flex-end" }}>
                <div style={{ background:"var(--accent)", borderRadius:"12px 4px 12px 12px", padding:"9px 14px", fontSize:13, color:"#fff", maxWidth:270, lineHeight:1.55 }}>
                  {msg.content}
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                <div style={{ width:26, height:26, borderRadius:"var(--radius-sm)", background:"rgba(99,102,241,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                  <Icon.Database />
                </div>
                <div style={{ background:msg.error?"var(--danger-bg)":"var(--bg-elevated)", border:`1px solid ${msg.error?"rgba(244,63,94,0.2)":"var(--border)"}`, borderRadius:"4px 12px 12px 12px", padding:"10px 14px", maxWidth:290 }}>
                  {msg.error
                    ? <span style={{ fontSize:12.5, color:"var(--danger)" }}>{msg.content}</span>
                    : <MsgContent text={msg.content} />
                  }
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
            <div style={{ width:26, height:26, borderRadius:"var(--radius-sm)", background:"rgba(99,102,241,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
              <Icon.Database />
            </div>
            <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:"4px 12px 12px 12px", padding:"12px 14px" }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding:"10px 12px 14px", borderTop:"1px solid var(--border)", background:"var(--bg-elevated)", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"flex-end", gap:8, background:"var(--bg-base)", border:"1.5px solid var(--border)", borderRadius:"var(--radius-md)", padding:"7px 7px 7px 12px", transition:"border-color .15s" }}
          onFocusCapture={e => e.currentTarget.style.borderColor="var(--accent)"}
          onBlurCapture={e => e.currentTarget.style.borderColor="var(--border)"}>
          <textarea ref={inputRef} value={input}
            onChange={e => { setInput(e.target.value); autoResize(); }}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask a question…" rows={1} disabled={loading}
            style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"var(--text-primary)", fontSize:13, lineHeight:1.5, resize:"none", fontFamily:"'IBM Plex Sans', sans-serif", minHeight:20, maxHeight:96 }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="btn-icon"
            style={{ width:30, height:30, borderRadius:"var(--radius-sm)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background: input.trim() && !loading ? "var(--accent)" : undefined, color: input.trim() && !loading ? "#fff" : undefined, borderColor: input.trim() && !loading ? "var(--accent)" : undefined }}>
            {loading ? <div className="spinner" style={{ color:"var(--accent)" }} /> : <Icon.Send />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ───
function OverviewTab({ guilds, activeGuild }) {
  const stats = [
    { label:"Total Guilds", value: guilds.length, sub:"Knowledge bases", icon:<Icon.Database />, color:"#6366f1" },
    { label:"Active Guild", value: activeGuild.name, sub:"Currently selected", icon:<Icon.Activity />, color:"#10b981", mono:true },
    { label:"Vector Store ID", value: activeGuild.id.slice(0,8)+"…", sub:"Full ID below", icon:<Icon.Folder />, color:"#f59e0b", mono:true },
    { label:"Status", value:"Online", sub:"API connected", icon:<Icon.Activity />, color:"#10b981" },
  ];

  return (
    <div style={{ padding:"32px 36px", overflowY:"auto", flex:1 }}>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:6 }}>Overview</div>
        <h1 style={{ fontSize:24, fontWeight:600, color:"var(--text-primary)", fontFamily:"'IBM Plex Mono', monospace", letterSpacing:"-0.02em" }}>
          {activeGuild.name}
        </h1>
        <p style={{ fontSize:13, color:"var(--text-secondary)", marginTop:4 }}>
          Vector Store ID: <span className="code-block">{activeGuild.id}</span>
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14, marginBottom:28 }}>
        {stats.map((s,i) => (
          <div key={i} className="panel anim-up" style={{ animationDelay:`${i*0.05}s`, padding:"18px 20px" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ width:34, height:34, borderRadius:"var(--radius-sm)", background:`rgba(${s.color==="#6366f1"?"99,102,241":s.color==="#10b981"?"16,185,129":"245,158,11"},0.12)`, display:"flex", alignItems:"center", justifyContent:"center", color:s.color }}>
                {s.icon}
              </div>
              <span className="tag tag-accent" style={{ fontSize:10 }}>LIVE</span>
            </div>
            <div style={{ fontFamily: s.mono ? "'IBM Plex Mono', monospace" : "inherit", fontSize: s.mono ? 12 : 20, fontWeight:700, color:"var(--text-primary)", letterSpacing:s.mono?"-0.01em":"-0.03em", marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.value}</div>
            <div style={{ fontSize:12, color:"var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Guild list */}
      <div className="panel anim-up d2" style={{ overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>All Knowledge Bases</div>
          <span className="tag tag-accent">{guilds.length}</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Guild ID</th>
              <th>Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {guilds.map(g => (
              <tr key={g.id}>
                <td>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:g.color || "#6366f1", flexShrink:0 }} />
                    <span style={{ fontWeight:500, color: g.id===activeGuild.id ? "var(--text-primary)" : undefined }}>{g.name}</span>
                    {g.id===activeGuild.id && <span className="tag tag-success" style={{ fontSize:9 }}>ACTIVE</span>}
                  </div>
                </td>
                <td><span className="code-block">{g.id.slice(0,14)}…</span></td>
                <td style={{ color:"var(--text-muted)" }}>{g.createdAt ? new Date(g.createdAt).toLocaleDateString() : "—"}</td>
                <td><span className="status-dot status-online" style={{ display:"inline-block" }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick tips */}
      <div className="panel anim-up d3" style={{ padding:"20px", marginTop:14 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)", marginBottom:14 }}>Quick Start</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[
            ["1","Upload PDFs or paste URLs under Knowledge Base tab"],
            ["2","Use Sub-URL Discovery to crawl entire websites"],
            ["3","Test your knowledge base via the chat widget →"],
            ["4","Switch or create guilds using the sidebar selector"],
          ].map(([n, tip]) => (
            <div key={n} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
              <div style={{ width:20, height:20, borderRadius:4, background:"rgba(99,102,241,0.15)", color:"#818cf8", fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontFamily:"'IBM Plex Mono', monospace" }}>{n}</div>
              <p style={{ fontSize:12.5, color:"var(--text-secondary)", lineHeight:1.55 }}>{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── UPLOAD TAB ───
function UploadTab({ guildId }) {
  const [urls, setUrls] = useState("");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const [sheetFile, setSheetFile] = useState(null);
  const [sheetStatus, setSheetStatus] = useState(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const sheetRef = useRef(null);

  const handleUpload = async () => {
    if (!urls.trim() && !files.length) return;
    setLoading(true); setStatus(null);
    const fd = new FormData();
    fd.append("guild_id", guildId);
    if (urls.trim()) fd.append("urls", urls.trim());
    files.forEach(f => fd.append("files", f));
    try {
      const r = await fetch("http://localhost:8000/upload", { method:"PUT", body:fd });
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const d = await r.json();
      setStatus({ ok:true, msg:`✓ Uploaded — ${d.urls_processed || 0} URL(s), ${d.pdfs_processed || 0} PDF(s) processed` });
      setUrls(""); setFiles([]);
    } catch (e) {
      setStatus({ ok:false, msg:"✗ "+e.message });
    } finally { setLoading(false); }
  };

  const handleSheet = async () => {
    if (!sheetFile) return;
    setSheetLoading(true); setSheetStatus(null);
    const fd = new FormData();
    fd.append("guild_id", guildId);
    fd.append("file", sheetFile);
    try {
      const r = await fetch("http://localhost:8000/upload-contacts", { method:"PUT", body:fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || `Error ${r.status}`);
      setSheetStatus({ ok:true, msg:"✓ "+d.message });
      setSheetFile(null);
    } catch (e) {
      setSheetStatus({ ok:false, msg:"✗ "+e.message });
    } finally { setSheetLoading(false); }
  };

  return (
    <div style={{ padding:"32px 36px", overflowY:"auto", flex:1 }}>
      <div style={{ maxWidth:640 }}>
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:6 }}>Knowledge Base</div>
        <h1 style={{ fontSize:22, fontWeight:600, color:"var(--text-primary)", fontFamily:"'IBM Plex Mono', monospace", marginBottom:4 }}>Upload Content</h1>
        <p style={{ fontSize:13, color:"var(--text-secondary)", marginBottom:28, lineHeight:1.6 }}>Ingest URLs and PDF documents into the active vector store.</p>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* URLs */}
          <div className="panel anim-up" style={{ padding:"20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{ color:"#818cf8" }}><Icon.Globe /></div>
              <div style={{ fontSize:13.5, fontWeight:600, color:"var(--text-primary)" }}>Web URLs</div>
              <span className="tag tag-accent" style={{ marginLeft:"auto", fontSize:10 }}>One per line</span>
            </div>
            <textarea value={urls} onChange={e => setUrls(e.target.value)}
              placeholder={"https://example.com/docs\nhttps://another.com/page"}
              rows={4} className="field"
              style={{ resize:"vertical", lineHeight:1.6, fontFamily:"'IBM Plex Mono', monospace", fontSize:12 }} />
          </div>

          {/* PDFs */}
          <div className="panel anim-up d1" style={{ padding:"20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{ color:"#818cf8" }}><Icon.Upload /></div>
              <div style={{ fontSize:13.5, fontWeight:600, color:"var(--text-primary)" }}>PDF Files</div>
            </div>
            <div className="drop-zone" onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setFiles(p => [...p, ...[...e.dataTransfer.files].filter(f => f.type==="application/pdf")]); }}>
              <div style={{ color:"var(--text-muted)" }}><Icon.Upload /></div>
              <p style={{ fontSize:13, color:"var(--text-secondary)" }}>Drop PDFs here or <span style={{ color:"#818cf8", cursor:"pointer" }}>browse</span></p>
              <p style={{ fontSize:11.5, color:"var(--text-muted)" }}>Multiple files supported</p>
              <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display:"none" }} onChange={e => setFiles(p => [...p, ...[...e.target.files]])} />
            </div>
            {files.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:12 }}>
                {files.map((f,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:"var(--radius-sm)", padding:"4px 10px", fontSize:11.5, color:"#a5b4fc" }}>
                    {f.name.length > 24 ? f.name.slice(0,21)+"…" : f.name}
                    <span onClick={() => setFiles(p => p.filter((_,j) => j!==i))} style={{ cursor:"pointer", opacity:.5, display:"flex" }}><Icon.X /></span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {status && (
            <div style={{ padding:"12px 16px", borderRadius:"var(--radius-md)", fontSize:13, background:status.ok?"var(--success-bg)":"var(--danger-bg)", border:`1px solid ${status.ok?"rgba(16,185,129,0.2)":"rgba(244,63,94,0.2)"}`, color:status.ok?"var(--success)":"var(--danger)" }}>
              {status.msg}
            </div>
          )}

          <button className="btn btn-primary anim-up d2" onClick={handleUpload} disabled={loading || (!urls.trim() && !files.length)} style={{ width:"100%", padding:"11px", justifyContent:"center" }}>
            {loading ? <><div className="spinner" />Ingesting…</> : <><Icon.Upload />Upload to Vector Store</>}
          </button>

          {/* Divider */}
          <div style={{ borderTop:"1px dashed var(--border)", paddingTop:24, marginTop:4 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{ color:"var(--success)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
              </div>
              <div style={{ fontSize:13.5, fontWeight:600, color:"var(--text-primary)" }}>Structured Data Sheet</div>
              <span className="tag tag-success" style={{ marginLeft:"auto", fontSize:10 }}>Priority Source</span>
            </div>
            <p style={{ fontSize:12.5, color:"var(--text-secondary)", marginBottom:14, lineHeight:1.6 }}>Upload an <span className="code-block">.xlsx</span> file for structured data like contacts, faculty, or product info.</p>

            <div className="drop-zone" style={{ borderColor: sheetFile ? "var(--success)" : undefined, background: sheetFile ? "var(--success-bg)" : undefined }}
              onClick={() => sheetRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = [...e.dataTransfer.files].find(f => f.name.endsWith(".xlsx")); if (f) setSheetFile(f); }}>
              {sheetFile ? (
                <>
                  <div style={{ color:"var(--success)" }}><Icon.Check /></div>
                  <p style={{ fontSize:13, fontWeight:600, color:"var(--success)" }}>{sheetFile.name}</p>
                  <p style={{ fontSize:11, color:"var(--text-muted)" }}>{(sheetFile.size/1024).toFixed(1)} KB · Click to replace</p>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
                  <p style={{ fontSize:13, color:"var(--text-secondary)" }}>Drop <span style={{ color:"var(--text-primary)", fontWeight:600 }}>.xlsx</span> here or browse</p>
                </>
              )}
              <input ref={sheetRef} type="file" accept=".xlsx" style={{ display:"none" }} onChange={e => { if (e.target.files[0]) setSheetFile(e.target.files[0]); }} />
            </div>

            {sheetStatus && (
              <div style={{ marginTop:10, padding:"11px 14px", borderRadius:"var(--radius-md)", fontSize:13, background:sheetStatus.ok?"var(--success-bg)":"var(--danger-bg)", border:`1px solid ${sheetStatus.ok?"rgba(16,185,129,0.2)":"rgba(244,63,94,0.2)"}`, color:sheetStatus.ok?"var(--success)":"var(--danger)" }}>
                {sheetStatus.msg}
              </div>
            )}

            <button onClick={handleSheet} disabled={sheetLoading || !sheetFile}
              className="btn btn-success" style={{ marginTop:12, width:"100%", padding:"11px", justifyContent:"center" }}>
              {sheetLoading ? <><div className="spinner" />Uploading…</> : <>Save Structured Data</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SUB URLS TAB ───
function SubUrlsTab({ guildId }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [results, setResults] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter] = useState("");
  const [ingestStatus, setIngestStatus] = useState(null);
  const [ingesting, setIngesting] = useState(false);

  const fetchUrls = async () => {
    const url = baseUrl.trim();
    if (!url) return;
    setFetching(true); setResults(null); setSelected(new Set()); setFilter(""); setIngestStatus(null);
    try {
      const r = await fetch(`http://localhost:8000/sub-urls?url=${encodeURIComponent(url)}`);
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.detail || `HTTP ${r.status}`); }
      const d = await r.json();
      setResults(d);
    } catch (e) {
      setResults({ base_url:url, sub_urls:[], count:0, error:e.message });
    } finally { setFetching(false); }
  };

  const toggle = (u) => setSelected(p => { const n = new Set(p); n.has(u)?n.delete(u):n.add(u); return n; });
  const filtered = results ? results.sub_urls.filter(u => !filter || u.toLowerCase().includes(filter.toLowerCase())) : [];

  const ingest = async () => {
    if (!selected.size) return;
    setIngesting(true); setIngestStatus(null);
    const fd = new FormData();
    fd.append("guild_id", guildId);
    fd.append("urls", [...selected].join("\n"));
    try {
      const r = await fetch("http://localhost:8000/upload", { method:"PUT", body:fd });
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const d = await r.json();
      setIngestStatus({ ok:true, msg:`✓ ${d.message} — ${d.urls_processed} URL(s) ingested` });
    } catch (e) {
      setIngestStatus({ ok:false, msg:"✗ "+e.message });
    } finally { setIngesting(false); }
  };

  return (
    <div style={{ padding:"32px 36px", overflowY:"auto", flex:1 }}>
      <div style={{ maxWidth:700 }}>
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:6 }}>Discovery</div>
        <h1 style={{ fontSize:22, fontWeight:600, color:"var(--text-primary)", fontFamily:"'IBM Plex Mono', monospace", marginBottom:4 }}>Sub-URL Crawler</h1>
        <p style={{ fontSize:13, color:"var(--text-secondary)", marginBottom:28, lineHeight:1.6 }}>Crawl a website to discover all linked pages, select the ones you need, and ingest them directly.</p>

        {/* Input */}
        <div className="panel anim-up" style={{ padding:"20px", marginBottom:16 }}>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1, position:"relative" }}>
              <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--text-muted)" }}><Icon.Search /></div>
              <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
                onKeyDown={e => e.key==="Enter" && fetchUrls()}
                placeholder="https://example.com"
                className="field" style={{ paddingLeft:36, fontFamily:"'IBM Plex Mono', monospace", fontSize:12 }} />
            </div>
            <button className="btn btn-primary" onClick={fetchUrls} disabled={fetching || !baseUrl.trim()} style={{ padding:"9px 20px" }}>
              {fetching ? <><div className="spinner" />Scanning…</> : <><Icon.Search />Discover</>}
            </button>
          </div>
        </div>

        {results && (
          <div className="anim-up">
            {results.error ? (
              <div style={{ padding:"14px 16px", borderRadius:"var(--radius-md)", background:"var(--danger-bg)", border:"1px solid rgba(244,63,94,0.2)", color:"var(--danger)", fontSize:13 }}>
                ✗ {results.error}
              </div>
            ) : (
              <div className="panel" style={{ overflow:"hidden" }}>
                {/* Toolbar */}
                <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                  <span className="tag tag-accent">{results.count} URLs</span>
                  {selected.size > 0 && <span className="tag tag-success">{selected.size} selected</span>}
                  <div style={{ flex:1, minWidth:160, position:"relative" }}>
                    <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--text-muted)" }}><Icon.Search /></div>
                    <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter…"
                      className="field" style={{ paddingLeft:32, height:32, fontSize:12, fontFamily:"'IBM Plex Mono', monospace" }} />
                  </div>
                  <button className="btn btn-ghost" onClick={() => setSelected(new Set(filtered))} style={{ padding:"6px 12px", fontSize:12 }}>Select All</button>
                  <button className="btn btn-ghost" onClick={() => setSelected(new Set())} style={{ padding:"6px 12px", fontSize:12 }}>Clear</button>
                </div>

                {/* List */}
                <div style={{ maxHeight:320, overflowY:"auto" }}>
                  {filtered.length === 0
                    ? <div style={{ padding:"28px", textAlign:"center", color:"var(--text-muted)", fontSize:13 }}>No URLs match filter</div>
                    : filtered.map((u, i) => {
                        const sel = selected.has(u);
                        return (
                          <div key={i} className={`check-row${sel?" selected":""}`} onClick={() => toggle(u)}>
                            <div className={`custom-check${sel?" checked":""}`}>
                              {sel && <Icon.Check />}
                            </div>
                            <span style={{ fontSize:12, color: sel?"#a5b4fc":"var(--text-muted)", fontFamily:"'IBM Plex Mono', monospace", wordBreak:"break-all", flex:1, lineHeight:1.5 }}>{u}</span>
                            <a href={u} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color:"var(--text-muted)", display:"flex", flexShrink:0 }}><Icon.ExternalLink /></a>
                          </div>
                        );
                      })
                  }
                </div>

                {/* Footer */}
                <div style={{ padding:"12px 16px", borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                  <p style={{ fontSize:12, color:"var(--text-muted)" }}>
                    {selected.size > 0 ? `${selected.size} URL${selected.size>1?"s":""} queued for ingestion` : "Select URLs to ingest"}
                  </p>
                  <button className="btn btn-primary" onClick={ingest} disabled={ingesting || selected.size===0} style={{ padding:"8px 18px" }}>
                    {ingesting ? <><div className="spinner" />Ingesting…</> : <>Ingest Selected ({selected.size})</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {ingestStatus && (
          <div className="anim-in" style={{ marginTop:14, padding:"12px 16px", borderRadius:"var(--radius-md)", fontSize:13, background:ingestStatus.ok?"var(--success-bg)":"var(--danger-bg)", border:`1px solid ${ingestStatus.ok?"rgba(16,185,129,0.2)":"rgba(244,63,94,0.2)"}`, color:ingestStatus.ok?"var(--success)":"var(--danger)" }}>
          {ingestStatus.msg}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SETTINGS TAB ───
function SettingsTab({ guilds, activeId, onSelect, onCreate, onDelete, onRename }) {
  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState("");
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [colorPick, setColorPick] = useState(GUILD_COLORS[0]);

  const create = () => {
    const tid = newId.trim(), tname = newName.trim();
    if (!tid) { setError("Guild ID is required."); return; }
    if (guilds.find(g => g.id===tid)) { setError("This ID already exists."); return; }
    onCreate({ id:tid, name:tname || `Guild ${tid.slice(0,6)}`, createdAt:Date.now(), color:colorPick });
    setNewId(""); setNewName(""); setError("");
  };

  return (
    <div style={{ padding:"32px 36px", overflowY:"auto", flex:1 }}>
      <div style={{ maxWidth:600 }}>
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:6 }}>Configuration</div>
        <h1 style={{ fontSize:22, fontWeight:600, color:"var(--text-primary)", fontFamily:"'IBM Plex Mono', monospace", marginBottom:4 }}>Guild Settings</h1>
        <p style={{ fontSize:13, color:"var(--text-secondary)", marginBottom:28, lineHeight:1.6 }}>Manage knowledge base guilds — switch, create, rename, or remove them.</p>

        {/* Existing guilds */}
        <div className="panel anim-up" style={{ overflow:"hidden", marginBottom:20 }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)" }}>
            <span style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>Registered Guilds</span>
          </div>
          {guilds.map(g => (
            <div key={g.id} style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,0.04)", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:32, height:32, borderRadius:"var(--radius-sm)", background:`rgba(${g.color?.slice(1)||"6366f1"}, 0.15)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:11, fontWeight:700, color:g.color||"#6366f1", fontFamily:"'IBM Plex Mono', monospace" }}>
                {g.name.slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                {editId===g.id ? (
                  <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key==="Enter") { onRename(g.id, editName); setEditId(null); } if (e.key==="Escape") setEditId(null); }}
                    className="field" style={{ height:30, fontSize:13, padding:"4px 10px" }} />
                ) : (
                  <>
                    <div style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:8 }}>
                      {g.name}
                      {g.id===activeId && <span className="tag tag-success" style={{ fontSize:9 }}>ACTIVE</span>}
                    </div>
                    <div className="code-block" style={{ display:"inline-block", marginTop:3, fontSize:10.5 }}>{g.id.slice(0,16)}…</div>
                  </>
                )}
              </div>
              <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                {g.id!==activeId && (
                  <button className="btn btn-ghost" style={{ padding:"5px 12px", fontSize:12 }} onClick={() => onSelect(g.id)}>
                    Activate
                  </button>
                )}
                <button className="btn btn-ghost" style={{ padding:"5px 10px" }}
                  onClick={() => { setEditId(g.id===editId?null:g.id); setEditName(g.name); }}
                  title="Rename">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                {guilds.length>1 && (
                  <button className="btn btn-danger" style={{ padding:"5px 10px" }} onClick={() => onDelete(g.id)} title="Delete">
                    <Icon.Trash />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Create new */}
        <div className="panel anim-up d1" style={{ padding:"20px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)", marginBottom:16 }}>Create New Guild</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div>
              <label style={{ fontSize:11.5, color:"var(--text-muted)", fontWeight:600, display:"block", marginBottom:5 }}>GUILD ID *</label>
              <input value={newId} onChange={e => { setNewId(e.target.value); setError(""); }}
                placeholder="e.g. 1234567890123456789"
                className="field field-mono" />
            </div>
            <div>
              <label style={{ fontSize:11.5, color:"var(--text-muted)", fontWeight:600, display:"block", marginBottom:5 }}>DISPLAY NAME</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="My Knowledge Base"
                className="field" />
            </div>
            <div>
              <label style={{ fontSize:11.5, color:"var(--text-muted)", fontWeight:600, display:"block", marginBottom:8 }}>COLOR</label>
              <div style={{ display:"flex", gap:8 }}>
                {GUILD_COLORS.map(c => (
                  <div key={c} onClick={() => setColorPick(c)}
                    style={{ width:22, height:22, borderRadius:"50%", background:c, cursor:"pointer", border:`2px solid ${colorPick===c?"#fff":"transparent"}`, boxSizing:"border-box", transition:"border .1s" }} />
                ))}
              </div>
            </div>
            {error && <p style={{ fontSize:12.5, color:"var(--danger)" }}>{error}</p>}
            <button className="btn btn-primary" onClick={create} style={{ marginTop:4, padding:"10px", justifyContent:"center" }}>
              <Icon.Plus />Create Guild
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ───
const TABS = [
  { id:"overview", label:"Overview", icon:<Icon.Home /> },
  { id:"upload", label:"Knowledge Base", icon:<Icon.Upload /> },
  { id:"suburls", label:"Sub-URL Crawler", icon:<Icon.Globe /> },
  { id:"settings", label:"Guild Settings", icon:<Icon.Settings /> },
];

export default function App() {
  const [guilds, setGuilds] = useState(getStoredGuilds);
  const [activeId, setActiveId] = useState(getStoredActiveId);
  const [tab, setTab] = useState("overview");
  const [chatOpen, setChatOpen] = useState(false);

  const activeGuild = guilds.find(g => g.id===activeId) || guilds[0];

  const selectGuild = (id) => { setActiveId(id); saveActiveId(id); };
  const createGuild = (g) => {
    const updated = [...guilds, g];
    setGuilds(updated); saveGuilds(updated);
    selectGuild(g.id);
  };
  const deleteGuild = (id) => {
    const updated = guilds.filter(g => g.id!==id);
    setGuilds(updated); saveGuilds(updated);
    if (activeId===id) selectGuild(updated[0].id);
  };
  const renameGuild = (id, name) => {
    const updated = guilds.map(g => g.id===id ? { ...g, name } : g);
    setGuilds(updated); saveGuilds(updated);
  };

  return (
    <>
      <GlobalStyles />
      <div style={{ height:"100vh", display:"flex", background:"var(--bg-base)", overflow:"hidden" }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width:"var(--sidebar-w)", flexShrink:0, display:"flex", flexDirection:"column", background:"var(--bg-surface)", borderRight:"1px solid var(--border)", overflow:"hidden" }}>
          {/* Logo */}
          <div style={{ padding:"18px 16px 14px", borderBottom:"1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:"var(--radius-sm)", background:"rgba(99,102,241,0.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"#818cf8" }}>
                <Icon.Database />
              </div>
              <div>
                <div style={{ fontSize:13.5, fontWeight:700, color:"var(--text-primary)", fontFamily:"'IBM Plex Mono', monospace", letterSpacing:"-0.02em" }}>NexusBot</div>
                <div style={{ fontSize:10.5, color:"var(--text-muted)", fontWeight:500 }}>Admin Panel</div>
              </div>
            </div>
          </div>

          {/* Guild selector */}
          <div style={{ padding:"12px 10px 8px" }}>
            <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:"var(--text-muted)", padding:"0 6px", marginBottom:6 }}>Knowledge Base</div>
            <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:"8px 10px", cursor:"pointer" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:activeGuild.color||"var(--accent)", flexShrink:0 }} />
                <span style={{ fontSize:12.5, fontWeight:600, color:"var(--text-primary)", fontFamily:"'IBM Plex Mono', monospace", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activeGuild.name}</span>
                <span style={{ color:"var(--text-muted)", flexShrink:0 }}><Icon.ChevronDown /></span>
              </div>
              <div style={{ fontSize:10.5, color:"var(--text-muted)", marginTop:4, paddingLeft:16, fontFamily:"'IBM Plex Mono', monospace" }}>{activeGuild.id.slice(0,10)}…</div>
            </div>

            {/* Quick switch */}
            {guilds.length > 1 && (
              <div style={{ marginTop:6, display:"flex", flexDirection:"column", gap:2 }}>
                {guilds.filter(g => g.id!==activeId).map(g => (
                  <button key={g.id} onClick={() => selectGuild(g.id)}
                    style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", borderRadius:"var(--radius-sm)", border:"none", background:"transparent", cursor:"pointer", transition:"background .12s", fontFamily:"'IBM Plex Sans', sans-serif", width:"100%" }}
                    onMouseEnter={e => e.currentTarget.style.background="var(--bg-elevated)"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:g.color||"#4b5563", flexShrink:0 }} />
                    <span style={{ fontSize:12, color:"var(--text-muted)", flex:1, textAlign:"left", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{g.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="divider" style={{ margin:"4px 0" }} />

          {/* Nav */}
          <nav style={{ padding:"4px 10px", flex:1 }}>
            <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:"var(--text-muted)", padding:"0 6px", marginBottom:6 }}>Navigation</div>
            {TABS.map(t => (
              <button key={t.id} className={`nav-item${tab===t.id?" active":""}`} onClick={() => setTab(t.id)}>
                <div className="nav-icon">{t.icon}</div>
                {t.label}
              </button>
            ))}
          </nav>

          {/* Bottom: chat toggle */}
          <div style={{ padding:"12px 10px", borderTop:"1px solid var(--border)" }}>
            <button className="nav-item" onClick={() => setChatOpen(o => !o)}
              style={{ background: chatOpen ? "rgba(99,102,241,0.15)" : undefined, color: chatOpen ? "#818cf8" : undefined, width:"100%" }}>
              <div className="nav-icon" style={{ background: chatOpen ? "rgba(99,102,241,0.2)" : undefined }}>
                <Icon.Chat />
              </div>
              Test Chat
              <span className="status-dot status-online" style={{ marginLeft:"auto" }} />
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 10px 4px" }}>
              <span className="status-dot status-online" />
              <span style={{ fontSize:11, color:"var(--text-muted)" }}>API connected</span>
              <span className="code-block" style={{ marginLeft:"auto", fontSize:10 }}>v2.0</span>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative" }}>
          {/* Top bar */}
          <div style={{ height:52, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 28px", background:"var(--bg-surface)", borderBottom:"1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ color:"var(--text-muted)", fontSize:12 }}>{TABS.find(t=>t.id===tab)?.label}</span>
              <span style={{ color:"var(--border)" }}>›</span>
              <span className="code-block" style={{ fontSize:11 }}>{activeGuild.id.slice(0,8)}…</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <button className="btn btn-ghost" style={{ padding:"6px 14px", fontSize:12 }} onClick={() => setTab("settings")}>
                <Icon.Plus /> New Guild
              </button>
              <button className="btn btn-primary" style={{ padding:"7px 16px", fontSize:12 }} onClick={() => setChatOpen(o=>!o)}>
                <Icon.Chat /> {chatOpen ? "Close Chat" : "Test Chat"}
              </button>
            </div>
          </div>

          {/* Page */}
          <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            {tab==="overview"  && <OverviewTab guilds={guilds} activeGuild={activeGuild} />}
            {tab==="upload"    && <UploadTab key={activeId} guildId={activeId} />}
            {tab==="suburls"   && <SubUrlsTab key={activeId} guildId={activeId} />}
            {tab==="settings"  && <SettingsTab guilds={guilds} activeId={activeId} onSelect={selectGuild} onCreate={createGuild} onDelete={deleteGuild} onRename={renameGuild} />}
          </div>
        </div>

        {/* ── CHAT ── */}
        <ChatPanel isOpen={chatOpen} guildId={activeId} guildName={activeGuild.name} />

        {/* FAB */}
        <button onClick={() => setChatOpen(o=>!o)}
          style={{ position:"fixed", bottom:24, right:24, zIndex:400, width:50, height:50, borderRadius:"50%", background: chatOpen ? "var(--bg-elevated)" : "var(--accent)", border:`1.5px solid ${chatOpen?"var(--border-active)":"transparent"}`, cursor:"pointer", boxShadow:`0 8px 24px ${chatOpen?"rgba(0,0,0,0.3)":"var(--accent-glow)"}`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", transition:"all .2s" }}
          onMouseEnter={e => e.currentTarget.style.transform="scale(1.06)"}
          onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
          {chatOpen ? <Icon.X /> : <Icon.Chat />}
        </button>
      </div>
    </>
  );
}