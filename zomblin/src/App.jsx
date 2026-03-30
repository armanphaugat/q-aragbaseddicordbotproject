import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────
function makeSystemPrompt(guildId) {
  return `You are a universal AI assistant — a RAG-powered knowledge base (vector store ID: ${guildId}).
You can be deployed for any organisation, institution, or use case.

INSTRUCTIONS — follow these strictly:
1. Answer questions based on uploaded documents AND your general knowledge.
2. Be concise, accurate, and helpful. Use markdown tables when presenting structured data.
3. If a topic falls outside the uploaded knowledge base, use your best general knowledge and say so.
4. If truly unknown, give a realistic estimate and label it as approximate.`;
}

// ─────────────────────────────────────────────
// GLOBAL CSS
// ─────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; background: #0A0F1E; -webkit-font-smoothing: antialiased; overflow: hidden; }

  :root {
    --blue-900: #0A0F1E;
    --blue-800: #0D1530;
    --blue-700: #0F1F45;
    --blue-600: #1A2E6B;
    --blue-500: #1E40AF;
    --blue-400: #2563EB;
    --blue-300: #3B82F6;
    --blue-200: #93C5FD;
    --blue-100: #DBEAFE;
    --blue-50:  #EFF6FF;
    --accent:   #38BDF8;
    --accent-2: #818CF8;
    --white:    #FFFFFF;
    --surface:  rgba(255,255,255,0.04);
    --surface-2:rgba(255,255,255,0.08);
    --border:   rgba(255,255,255,0.08);
    --border-2: rgba(255,255,255,0.14);
    --text-1:   #F0F6FF;
    --text-2:   rgba(240,246,255,0.65);
    --text-3:   rgba(240,246,255,0.38);
    --user-bg:  linear-gradient(135deg, #1E40AF 0%, #2563EB 100%);
    --bot-bg:   rgba(255,255,255,0.05);
    --glow:     0 0 40px rgba(37,99,235,0.35);
  }

  @keyframes fadeUp   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes msgIn    { from { opacity:0; transform:translateY(10px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes spin     { to { transform:rotate(360deg); } }
  @keyframes blink    { 0%,100% { opacity:1; } 50% { opacity:0.15; } }
  @keyframes pulse    { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
  @keyframes shimmer  { 0% { background-position:-600px 0; } 100% { background-position:600px 0; } }
  @keyframes slideIn  { from { opacity:0; transform:translateX(-16px); } to { opacity:1; transform:translateX(0); } }
  @keyframes glow-pulse { 0%,100% { box-shadow:0 0 20px rgba(37,99,235,0.3); } 50% { box-shadow:0 0 40px rgba(37,99,235,0.6); } }

  .anim-fadeup { animation: fadeUp .6s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-fadein { animation: fadeIn .5s ease both; }
  .anim-msg    { animation: msgIn .35s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-slide  { animation: slideIn .4s cubic-bezier(0.16,1,0.3,1) both; }
  .d1 { animation-delay: .08s; } .d2 { animation-delay: .16s; } .d3 { animation-delay: .24s; }
  .d4 { animation-delay: .32s; } .d5 { animation-delay: .4s; }

  /* Scrollbar */
  .chat-scroll::-webkit-scrollbar { width: 4px; }
  .chat-scroll::-webkit-scrollbar-track { background: transparent; }
  .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }

  /* Sidebar scroll */
  .side-scroll::-webkit-scrollbar { width: 3px; }
  .side-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }

  .btn-send {
    width: 40px; height: 40px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all .2s;
    flex-shrink: 0;
  }
  .btn-send:not(:disabled) { background: var(--blue-400); box-shadow: 0 4px 16px rgba(37,99,235,0.45); }
  .btn-send:not(:disabled):hover { background: var(--blue-300); transform: scale(1.06); box-shadow: 0 6px 24px rgba(59,130,246,0.55); }
  .btn-send:disabled { background: rgba(255,255,255,0.07); cursor: not-allowed; }

  .chip {
    padding: 6px 14px;
    border-radius: 100px;
    background: var(--surface);
    border: 1px solid var(--border-2);
    color: var(--text-2);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    transition: all .15s;
    white-space: nowrap;
  }
  .chip:hover { background: rgba(37,99,235,0.2); border-color: rgba(37,99,235,0.5); color: var(--blue-200); }

  .sidebar-btn {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px;
    border-radius: 12px;
    background: none;
    border: none;
    color: var(--text-2);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    transition: all .15s;
    width: 100%;
    text-align: left;
  }
  .sidebar-btn:hover { background: var(--surface); color: var(--text-1); }
  .sidebar-btn.active { background: rgba(37,99,235,0.18); color: var(--blue-200); }

  .nav-tab {
    padding: 7px 16px;
    border-radius: 10px;
    background: none;
    border: none;
    color: var(--text-3);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    transition: all .15s;
  }
  .nav-tab:hover { color: var(--text-2); background: var(--surface); }
  .nav-tab.active { color: var(--accent); background: rgba(56,189,248,0.1); }

  .upload-zone {
    border: 1.5px dashed rgba(255,255,255,0.14);
    border-radius: 16px;
    padding: 36px 20px;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    cursor: pointer; transition: all .15s;
    background: var(--surface);
  }
  .upload-zone:hover { border-color: var(--blue-400); background: rgba(37,99,235,0.08); }

  .spinner { width:16px;height:16px;border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite; }

  .input-box {
    display: flex; align-items: flex-end; gap: 10px;
    background: rgba(255,255,255,0.06);
    border: 1.5px solid var(--border-2);
    border-radius: 18px;
    padding: 10px 10px 10px 16px;
    transition: border-color .2s, box-shadow .2s;
  }
  .input-box:focus-within {
    border-color: rgba(37,99,235,0.7);
    box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
  }
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

// ─────────────────────────────────────────────
// MARKDOWN RENDERER
// ─────────────────────────────────────────────
function inlineFmt(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} style={{ color: "var(--text-1)", fontWeight: 600 }}>{p.slice(2,-2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} style={{ background:"rgba(56,189,248,0.12)", color:"var(--accent)", padding:"2px 7px", borderRadius:6, fontSize:"0.87em", fontFamily:"'JetBrains Mono', monospace" }}>{p.slice(1,-1)}</code>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={i} style={{ color:"var(--text-2)" }}>{p.slice(1,-1)}</em>;
    return p;
  });
}

function Markdown({ text }) {
  const lines = text.split("\n");
  const els = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("- ") || line.startsWith("* ")) {
      els.push(<div key={i} style={{ display:"flex", gap:8, marginBottom:3 }}>
        <span style={{ color:"var(--accent)", flexShrink:0, marginTop:3, fontSize:10 }}>◆</span>
        <span>{inlineFmt(line.slice(2))}</span>
      </div>);
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)[1];
      els.push(<div key={i} style={{ display:"flex", gap:8, marginBottom:3 }}>
        <span style={{ color:"var(--accent)", minWidth:18, flexShrink:0, fontSize:12, fontWeight:600 }}>{num}.</span>
        <span>{inlineFmt(line.replace(/^\d+\.\s/, ""))}</span>
      </div>);
    } else if (line.startsWith("### ")) {
      els.push(<div key={i} style={{ fontSize:13.5, fontWeight:700, color:"var(--text-1)", marginTop:12, marginBottom:5, fontFamily:"'Sora', sans-serif" }}>{line.slice(4)}</div>);
    } else if (line.startsWith("## ")) {
      els.push(<div key={i} style={{ fontSize:15, fontWeight:700, color:"var(--text-1)", marginTop:14, marginBottom:6, fontFamily:"'Sora', sans-serif" }}>{line.slice(3)}</div>);
    } else if (line.trim() === "") {
      els.push(<div key={i} style={{ height:8 }} />);
    } else {
      els.push(<p key={i} style={{ lineHeight:1.7, marginBottom:2 }}>{inlineFmt(line)}</p>);
    }
    i++;
  }
  return <div style={{ fontSize:13.5, color:"var(--text-2)", lineHeight:1.7 }}>{els}</div>;
}

// ─────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center", padding:"2px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"var(--blue-300)", animation:`blink 1.3s ease ${i*0.22}s infinite` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// BOT AVATAR
// ─────────────────────────────────────────────
function BotAvatar({ size = 32 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:10, flexShrink:0, background:"linear-gradient(135deg,#1E40AF,#2563EB)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 12px rgba(37,99,235,0.4)", border:"1px solid rgba(37,99,235,0.3)" }}>
      <svg width={size*0.52} height={size*0.52} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
        <path d="M3 14v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>
        <circle cx="9" cy="11" r="1" fill="#fff" stroke="none"/>
        <circle cx="15" cy="11" r="1" fill="#fff" stroke="none"/>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUGGESTIONS
// ─────────────────────────────────────────────
const SUGGESTIONS = [
  "What can you help me with?",
  "What documents are in the knowledge base?",
  "Give me a summary of the uploaded content",
  "How does this AI assistant work?",
];

// ─────────────────────────────────────────────
// MAIN CHAT VIEW
// ─────────────────────────────────────────────
function ChatView({ guildId }) {
  const SYSTEM = makeSystemPrompt(guildId);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const callAPI = useCallback(async (question, hist) => {
    setLoading(true);
    try {
      let text = "";
      try {
        const r = await fetch("http://localhost:8000/query", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({ question, server: guildId }),
        });
        if (r.ok) { const d = await r.json(); if (d.answer) text = d.answer; }
      } catch(_) {}

      if (!text) {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system:SYSTEM, messages:hist }),
        });
        if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
        const d = await res.json();
        text = d.content.filter(b=>b.type==="text").map(b=>b.text).join("\n").trim();
        if (!text) throw new Error("No response received.");
      }
      setMessages(p => [...p, { role:"assistant", content:text, id:Date.now() }]);
      setHistory(p => [...p, { role:"assistant", content:text }]);
    } catch(e) {
      setMessages(p => [...p, { role:"assistant", content:"Error: "+e.message, id:Date.now(), error:true }]);
    } finally { setLoading(false); }
  }, [guildId, SYSTEM]);

  const send = useCallback((text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    const hist = [...history, { role:"user", content:q }];
    setMessages(p => [...p, { role:"user", content:q, id:Date.now() }]);
    setHistory(hist);
    callAPI(q, hist);
  }, [input, loading, history, callAPI]);

  const isEmpty = messages.length === 0;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Messages area */}
      <div className="chat-scroll" style={{ flex:1, overflowY:"auto", padding:"24px 0" }}>
        <div style={{ maxWidth:740, margin:"0 auto", padding:"0 24px", display:"flex", flexDirection:"column", gap:6 }}>

          {isEmpty && (
            <div className="anim-fadeup" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:360, gap:24, textAlign:"center" }}>
              {/* Bot avatar large */}
              <div style={{ width:72, height:72, borderRadius:22, background:"linear-gradient(135deg,#1E40AF,#2563EB)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 40px rgba(37,99,235,0.5), 0 8px 32px rgba(37,99,235,0.3)", border:"1px solid rgba(37,99,235,0.3)", animation:"glow-pulse 3s ease infinite" }}>
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                  <path d="M3 14v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>
                  <circle cx="9" cy="11" r="1.2" fill="#fff" stroke="none"/>
                  <circle cx="15" cy="11" r="1.2" fill="#fff" stroke="none"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily:"'Sora', sans-serif", fontSize:26, fontWeight:700, color:"var(--text-1)", letterSpacing:"-0.03em", marginBottom:8 }}>
                  How can I help you today?
                </div>
                <div style={{ fontSize:14, color:"var(--text-3)", maxWidth:420, lineHeight:1.6 }}>
                  I'm your AI assistant, powered by your knowledge base. Ask me anything — I'll search your documents and use my general knowledge to help.
                </div>
              </div>
              {/* Suggestion chips */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", maxWidth:560 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className={`chip anim-fadein d${i+1}`} onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={msg.id} className="anim-msg" style={{ animationDelay:`${Math.min(idx*0.03, 0.15)}s` }}>
              {msg.role === "user" ? (
                <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
                  <div style={{ maxWidth:"70%", background:"var(--user-bg)", borderRadius:"18px 4px 18px 18px", padding:"12px 18px", fontSize:14, color:"#fff", lineHeight:1.65, boxShadow:"0 4px 20px rgba(37,99,235,0.3)", fontWeight:450 }}>
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:12 }}>
                  <BotAvatar />
                  <div style={{ maxWidth:"75%", background: msg.error ? "rgba(239,68,68,0.08)" : "var(--bot-bg)", border:`1px solid ${msg.error ? "rgba(239,68,68,0.2)" : "var(--border)"}`, borderRadius:"4px 18px 18px 18px", padding:"13px 18px", boxShadow:"0 2px 12px rgba(0,0,0,0.15)" }}>
                    {msg.error
                      ? <span style={{ fontSize:13.5, color:"#f87171" }}>{msg.content}</span>
                      : <Markdown text={msg.content} />
                    }
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:12 }}>
              <BotAvatar />
              <div style={{ background:"var(--bot-bg)", border:"1px solid var(--border)", borderRadius:"4px 18px 18px 18px", padding:"16px 20px", boxShadow:"0 2px 12px rgba(0,0,0,0.15)" }}>
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div style={{ flexShrink:0, padding:"16px 24px 24px", borderTop:"1px solid var(--border)" }}>
        <div style={{ maxWidth:740, margin:"0 auto" }}>
          <div className="input-box">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Message AI Assistant…"
              rows={1}
              disabled={loading}
              style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"var(--text-1)", fontSize:14, lineHeight:1.55, resize:"none", fontFamily:"'Plus Jakarta Sans', sans-serif", minHeight:24, maxHeight:120, overflowY:"auto" }}
            />
            <button className="btn-send" onClick={() => send()} disabled={loading || !input.trim()} aria-label="Send">
              {loading
                ? <div className="spinner" />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              }
            </button>
          </div>
          <div style={{ fontSize:11.5, color:"var(--text-3)", textAlign:"center", marginTop:10 }}>
            AI Assistant · Powered by your knowledge base · Press Enter to send
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// UPLOAD VIEW
// ─────────────────────────────────────────────
function UploadView({ guildId }) {
  const [urls, setUrls] = useState("");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleUpload = async () => {
    if (!urls.trim() && !files.length) return;
    setUploading(true); setStatus(null);
    const fd = new FormData();
    fd.append("guild_id", guildId);
    if (urls.trim()) fd.append("urls", urls.trim());
    files.forEach(f => fd.append("files", f));
    try {
      const res = await fetch("http://localhost:8000/upload", { method:"PUT", body:fd });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const d = await res.json();
      setStatus({ ok:true, msg:`${d.message} — ${d.urls_processed} URL(s), ${d.pdfs_processed} PDF(s)` });
      setUrls(""); setFiles([]);
    } catch(e) {
      setStatus({ ok:false, msg:e.message });
    } finally { setUploading(false); }
  };

  const inputStyle = {
    background:"rgba(255,255,255,0.04)",
    border:"1.5px solid var(--border-2)",
    borderRadius:14,
    color:"var(--text-1)",
    fontSize:13.5,
    padding:"12px 16px",
    outline:"none",
    fontFamily:"'Plus Jakarta Sans', sans-serif",
    width:"100%",
    lineHeight:1.6,
    transition:"border-color .2s",
  };

  return (
    <div className="chat-scroll" style={{ flex:1, overflowY:"auto", padding:"40px 24px" }}>
      <div style={{ maxWidth:600, margin:"0 auto" }}>
        <div style={{ marginBottom:32 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(56,189,248,0.1)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:100, padding:"4px 12px", fontSize:11, fontWeight:600, color:"var(--accent)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:14 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Ingest Content
          </div>
          <h2 style={{ fontFamily:"'Sora', sans-serif", fontSize:28, fontWeight:700, color:"var(--text-1)", letterSpacing:"-0.03em", marginBottom:8 }}>Knowledge Base</h2>
          <p style={{ fontSize:14, color:"var(--text-3)", lineHeight:1.65 }}>Add URLs or PDFs to populate your vector store.</p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {/* URLs */}
          <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:20, padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"rgba(56,189,248,0.1)", border:"1px solid rgba(56,189,248,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:"var(--text-1)" }}>Web URLs</div>
                <div style={{ fontSize:12, color:"var(--text-3)" }}>One URL per line</div>
              </div>
            </div>
            <textarea value={urls} onChange={e => setUrls(e.target.value)} placeholder={"https://example.com\nhttps://docs.example.com"} rows={4}
              style={{ ...inputStyle, resize:"vertical" }}
              onFocus={e => e.target.style.borderColor="rgba(56,189,248,0.5)"}
              onBlur={e => e.target.style.borderColor="var(--border-2)"} />
          </div>

          {/* PDFs */}
          <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:20, padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"rgba(56,189,248,0.1)", border:"1px solid rgba(56,189,248,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:"var(--text-1)" }}>PDF Files</div>
                <div style={{ fontSize:12, color:"var(--text-3)" }}>Drag & drop or click to browse</div>
              </div>
            </div>
            <div className="upload-zone" onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setFiles(p => [...p, ...[...e.dataTransfer.files].filter(f => f.type==="application/pdf")]); }}>
              <div style={{ width:48, height:48, borderRadius:14, background:"rgba(37,99,235,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--blue-300)" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div style={{ fontSize:14, color:"var(--text-3)" }}>Drop PDFs here or <span style={{ color:"var(--blue-300)", fontWeight:500 }}>browse files</span></div>
              <div style={{ fontSize:12, color:"var(--text-3)" }}>Multiple PDFs supported</div>
              <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display:"none" }} onChange={e => setFiles(p => [...p, ...[...e.target.files]])} />
            </div>
            {files.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:14 }}>
                {files.map((f, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:7, background:"rgba(37,99,235,0.12)", border:"1px solid rgba(37,99,235,0.25)", borderRadius:10, padding:"5px 12px", fontSize:12, color:"var(--blue-200)" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {f.name.length > 28 ? f.name.slice(0,25)+"…" : f.name}
                    <span onClick={() => setFiles(p => p.filter((_,j) => j!==i))} style={{ cursor:"pointer", color:"rgba(147,197,253,0.4)", marginLeft:2 }}>✕</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {status && (
            <div style={{ padding:"14px 18px", borderRadius:14, fontSize:13.5, background:status.ok?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)", border:`1px solid ${status.ok?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}`, color:status.ok?"#4ade80":"#f87171" }}>
              {status.ok ? "✓ " : "✗ "}{status.msg}
            </div>
          )}

          <button onClick={handleUpload} disabled={uploading || (!urls.trim() && !files.length)}
            style={{ width:"100%", padding:"14px", fontSize:14, fontWeight:600, borderRadius:14, border:"none", cursor: uploading || (!urls.trim() && !files.length) ? "not-allowed" : "pointer", background: uploading || (!urls.trim() && !files.length) ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#1E40AF,#2563EB)", color:"#fff", fontFamily:"'Plus Jakarta Sans', sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow: uploading || (!urls.trim() && !files.length) ? "none" : "0 8px 24px rgba(37,99,235,0.4)", transition:"all .2s" }}>
            {uploading ? <><div className="spinner" />Ingesting…</> : <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload to Knowledge Base
            </>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
function Sidebar({ tab, setTab, guildName, guildId, onChangeGuild }) {
  const navItems = [
    { id:"chat", label:"Chat", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    { id:"upload", label:"Knowledge Base", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> },
  ];

  return (
    <div style={{ width:220, flexShrink:0, background:"rgba(13,21,48,0.8)", borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column", backdropFilter:"blur(8px)" }}>
      {/* Brand */}
      <div style={{ padding:"20px 16px 16px", borderBottom:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#1E40AF,#2563EB)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 16px rgba(37,99,235,0.35)", animation:"glow-pulse 3s ease infinite" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
              <path d="M3 14v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily:"'Sora', sans-serif", fontSize:14, fontWeight:700, color:"var(--text-1)", letterSpacing:"-0.02em" }}>AI Assistant</div>
            <div style={{ fontSize:10, color:"var(--text-3)", fontWeight:500, letterSpacing:"0.03em" }}>Chatbot Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding:"12px 10px", flex:1 }}>
        <div style={{ fontSize:10, fontWeight:600, color:"var(--text-3)", letterSpacing:"0.08em", textTransform:"uppercase", padding:"0 6px", marginBottom:8 }}>Navigation</div>
        {navItems.map(item => (
          <button key={item.id} className={`sidebar-btn ${tab===item.id?"active":""}`} onClick={() => setTab(item.id)}>
            <span style={{ opacity:tab===item.id?1:0.5 }}>{item.icon}</span>
            {item.label}
            {tab===item.id && <div style={{ marginLeft:"auto", width:5, height:5, borderRadius:"50%", background:"var(--accent)" }} />}
          </button>
        ))}
      </div>

      {/* Guild */}
      <div style={{ padding:"12px 10px 16px", borderTop:"1px solid var(--border)" }}>
        <button className="sidebar-btn" onClick={onChangeGuild} style={{ flexDirection:"column", alignItems:"flex-start", gap:4, padding:"12px 14px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, width:"100%" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 8px #22c55e", flexShrink:0 }} />
            <span style={{ fontSize:12.5, fontWeight:600, color:"var(--text-1)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{guildName}</span>
          </div>
          <code style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:"var(--text-3)", paddingLeft:16 }}>{guildId.slice(0,14)}…</code>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// GUILD MODAL
// ─────────────────────────────────────────────
const DEFAULT_GUILDS = [{ id: "1476466974098985067", name: "Main Server" }];
function getStoredGuilds() {
  try { return JSON.parse(localStorage.getItem("nexus_guilds") || "null") || DEFAULT_GUILDS; } catch { return DEFAULT_GUILDS; }
}
function getStoredActiveId() { return localStorage.getItem("nexus_active_guild") || DEFAULT_GUILDS[0].id; }
function saveGuilds(g) { localStorage.setItem("nexus_guilds", JSON.stringify(g)); }
function saveActiveId(id) { localStorage.setItem("nexus_active_guild", id); }

function GuildModal({ guilds, activeId, onSelect, onCreate, onDelete, onClose }) {
  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState("");
  const [error, setError] = useState("");

  const inputStyle = { background:"rgba(255,255,255,0.04)", border:"1.5px solid var(--border-2)", borderRadius:12, color:"var(--text-1)", fontSize:13, padding:"10px 14px", outline:"none", fontFamily:"'Plus Jakarta Sans', sans-serif", width:"100%", transition:"border-color .2s" };

  const handleCreate = () => {
    const trimId = newId.trim(), trimName = newName.trim();
    if (!trimId) { setError("Guild ID is required."); return; }
    if (guilds.find(g => g.id===trimId)) { setError("This Guild ID already exists."); return; }
    onCreate({ id:trimId, name:trimName || `Guild ${trimId.slice(0,6)}` });
    setNewId(""); setNewName(""); setError("");
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, animation:"fadeIn .2s both" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:420, background:"#0D1530", border:"1px solid var(--border-2)", borderRadius:24, overflow:"hidden", boxShadow:"0 32px 80px rgba(0,0,0,0.5)", animation:"fadeUp .25s cubic-bezier(0.16,1,0.3,1) both" }}>
        <div style={{ padding:"24px 24px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:"'Sora', sans-serif", fontSize:20, fontWeight:700, color:"var(--text-1)", letterSpacing:"-0.02em" }}>Knowledge Base</div>
            <div style={{ fontSize:13, color:"var(--text-3)", marginTop:3 }}>Switch or create a vector store</div>
          </div>
          <button onClick={onClose} style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text-3)", cursor:"pointer", width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>✕</button>
        </div>
        <div style={{ padding:"18px 20px 8px", display:"flex", flexDirection:"column", gap:8, maxHeight:220, overflowY:"auto" }}>
          {guilds.map(g => (
            <div key={g.id} onClick={() => { onSelect(g.id); onClose(); }}
              style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", borderRadius:14, cursor:"pointer", border:`1.5px solid ${g.id===activeId?"var(--blue-400)":"var(--border)"}`, background:g.id===activeId?"rgba(37,99,235,0.12)":"var(--surface)", transition:"all .12s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:g.id===activeId?"var(--blue-400)":"var(--surface-2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:g.id===activeId?"#fff":"var(--text-3)" }}>{g.name.slice(0,2).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:g.id===activeId?600:400, color:"var(--text-1)" }}>{g.name}</div>
                  <div style={{ fontSize:10.5, color:"var(--text-3)", fontFamily:"'JetBrains Mono', monospace", marginTop:1 }}>{g.id.slice(0,12)}…</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {g.id===activeId && <div style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80" }} />}
                {guilds.length>1 && <span onClick={e => { e.stopPropagation(); onDelete(g.id); }} style={{ fontSize:12, color:"var(--text-3)", cursor:"pointer", padding:"2px 6px" }}>✕</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:"14px 20px 24px", borderTop:"1px solid var(--border)", marginTop:8 }}>
          <div style={{ fontSize:11, color:"var(--text-3)", letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:600, marginBottom:10 }}>New Guild</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <input value={newId} onChange={e => { setNewId(e.target.value); setError(""); }} placeholder="Guild ID" onKeyDown={e => e.key==="Enter" && handleCreate()}
              style={{ ...inputStyle, fontFamily:"'JetBrains Mono', monospace" }} />
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Display name (optional)" onKeyDown={e => e.key==="Enter" && handleCreate()}
              style={inputStyle} />
            {error && <div style={{ fontSize:12, color:"#f87171" }}>{error}</div>}
            <button onClick={handleCreate} style={{ width:"100%", padding:"11px", fontSize:14, fontWeight:600, borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#1E40AF,#2563EB)", color:"#fff", fontFamily:"'Plus Jakarta Sans', sans-serif", boxShadow:"0 4px 16px rgba(37,99,235,0.3)" }}>
              + Add Knowledge Base
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────
export default function App() {
  const [guilds, setGuilds] = useState(getStoredGuilds);
  const [activeId, setActiveId_] = useState(getStoredActiveId);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState("chat");

  const activeGuild = guilds.find(g => g.id===activeId) || guilds[0];

  const setActive = (id) => { setActiveId_(id); saveActiveId(id); };
  const handleCreate = (g) => { const u=[...guilds,g]; setGuilds(u); saveGuilds(u); setActive(g.id); };
  const handleDelete = (id) => { const u=guilds.filter(g=>g.id!==id); setGuilds(u); saveGuilds(u); if(activeId===id) setActive(u[0].id); };

  return (
    <>
      <GlobalStyles />
      {/* Background mesh */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-200, left:-200, width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)" }} />
        <div style={{ position:"absolute", bottom:-150, right:-100, width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(129,140,248,0.1) 0%, transparent 70%)" }} />
        <div style={{ position:"absolute", top:"40%", left:"50%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)", transform:"translate(-50%,-50%)" }} />
      </div>

      <div style={{ height:"100vh", display:"flex", flexDirection:"column", position:"relative", zIndex:1 }}>
        {/* Top bar */}
        <div style={{ height:54, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", borderBottom:"1px solid var(--border)", background:"rgba(10,15,30,0.8)", backdropFilter:"blur(16px)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            {/* Online indicator */}
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 8px #22c55e", animation:"pulse 2s ease infinite" }} />
              <span style={{ fontSize:12, color:"var(--text-3)", fontWeight:500 }}>Online</span>
            </div>
          </div>
          <div style={{ fontFamily:"'Sora', sans-serif", fontSize:14, fontWeight:700, color:"var(--text-2)", letterSpacing:"0.01em", position:"absolute", left:"50%", transform:"translateX(-50%)" }}>
            AI Chatbot Platform
          </div>
          <div style={{ fontSize:12, color:"var(--text-3)" }}>Anytime · Anywhere · Any Organisation</div>
        </div>

        {/* Main layout */}
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          <Sidebar tab={tab} setTab={setTab} guildName={activeGuild.name} guildId={activeGuild.id} onChangeGuild={() => setShowModal(true)} />

          {/* Content */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"rgba(10,15,30,0.6)" }}>
            {/* Content header */}
            <div style={{ height:52, flexShrink:0, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", padding:"0 24px", gap:12 }}>
              <div style={{ fontSize:14, fontWeight:600, color:"var(--text-1)", fontFamily:"'Sora', sans-serif" }}>
                {tab==="chat" ? "Chat" : "Knowledge Base"}
              </div>
              <div style={{ fontSize:12, color:"var(--text-3)" }}>·</div>
              <div style={{ fontSize:12, color:"var(--text-3)" }}>
                {tab==="chat" ? "Ask anything from your knowledge base" : "Upload URLs and PDFs to your vector store"}
              </div>
            </div>

            {tab==="chat" && <ChatView key={activeGuild.id} guildId={activeGuild.id} />}
            {tab==="upload" && <UploadView key={activeGuild.id} guildId={activeGuild.id} />}
          </div>
        </div>
      </div>

      {showModal && (
        <GuildModal guilds={guilds} activeId={activeId} onSelect={setActive} onCreate={handleCreate} onDelete={handleDelete} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}