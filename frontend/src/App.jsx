import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────
// GUILD STORAGE (localStorage)
// ─────────────────────────────────────────────
const DEFAULT_GUILDS = [{ id: "1476466974098985067", name: "Main Server" }];

function getStoredGuilds() {
  try { return JSON.parse(localStorage.getItem("nexus_guilds") || "null") || DEFAULT_GUILDS; }
  catch { return DEFAULT_GUILDS; }
}
function getStoredActiveId() {
  return localStorage.getItem("nexus_active_guild") || DEFAULT_GUILDS[0].id;
}
function saveGuilds(guilds) { localStorage.setItem("nexus_guilds", JSON.stringify(guilds)); }
function saveActiveId(id) { localStorage.setItem("nexus_active_guild", id); }

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────
function makeSystemPrompt(guildId) {
  return `You are the official AI assistant for Manipal University Jaipur (MUJ) — a RAG-powered knowledge base (vector store ID: ${guildId}).
MUJ is a top-ranked private university in Rajasthan, India, established in 2011. NAAC A+ accredited.
200+ programs across 30+ schools: Engineering, Management, Law, Design, Sciences, Humanities and more.
15,000+ students, 500+ faculty. Located at Dehmi Kalan, Jaipur-Ajmer Expressway, Jaipur 303007.

INSTRUCTIONS — follow these strictly:
1. Answer questions based on uploaded documents AND your knowledge of MUJ.
2. Be concise, accurate, and helpful. Use markdown tables when showing fees.
3. Always prefer INR for Indian students.
4. FEE CALCULATIONS: When asked for a combined/total fee, use ALL known MUJ fee data below to give a complete answer. Never say a fee is "missing" or "unavailable" — always provide the best known figure.
5. If truly unknown, give a realistic estimate and label it as approximate.

KNOWN MUJ FEE DATA (2025-26):
- B.Tech CSE Tuition: ₹4,87,000/year
- Registration Fee: ₹10,000 (one-time)
- Caution Deposit: ₹15,000 (refundable)
- Hostel Double Occupancy: ₹1,74,050/year (Residential Dwelling ₹1,59,403 + Housekeeping ₹14,647)
- Hostel Security Deposit: ₹24,250 (refundable)
- Mess Fee: ₹75,920/year
- Total per year (tuition + hostel + mess): ₹7,36,970
- Total 4-year cost (excl. one-time fees): ₹29,47,880`;
}

// ─────────────────────────────────────────────
// GLOBAL CSS
// ─────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { font-family: 'DM Sans', sans-serif; background: #FBF7F4; -webkit-font-smoothing: antialiased; overflow: hidden; }

  :root {
    --rust: #B84A1A;
    --rust-light: #D05A22;
    --rust-pale: #F5E8E0;
    --rust-faint: #FBF2ED;
    --gold: #C8913A;
    --cream: #FBF7F4;
    --parchment: #F3EBE3;
    --ink: #1C1209;
    --ink-60: rgba(28,18,9,0.6);
    --ink-35: rgba(28,18,9,0.35);
    --ink-15: rgba(28,18,9,0.15);
    --ink-08: rgba(28,18,9,0.08);
    --white: #FFFFFF;
    --shadow-sm: 0 2px 8px rgba(28,18,9,0.08);
    --shadow-md: 0 8px 32px rgba(28,18,9,0.12);
    --shadow-lg: 0 20px 60px rgba(28,18,9,0.16);
    --shadow-rust: 0 8px 32px rgba(184,74,26,0.28);
  }

  @keyframes fadeUp    { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes msgIn     { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin      { to { transform:rotate(360deg); } }
  @keyframes blink     { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
  @keyframes shimmer   { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
  @keyframes pulse-ring { 0%,100% { transform:scale(1); opacity:0.6; } 50% { transform:scale(1.12); opacity:0; } }

  .anim-fadeup  { animation: fadeUp  .8s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-fadein  { animation: fadeIn  .6s ease both; }
  .anim-slide   { animation: slideDown .3s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-msg     { animation: msgIn   .3s cubic-bezier(0.16,1,0.3,1) both; }
  .delay-1 { animation-delay: 0.1s; }
  .delay-2 { animation-delay: 0.2s; }
  .delay-3 { animation-delay: 0.35s; }
  .delay-4 { animation-delay: 0.5s; }
  .delay-5 { animation-delay: 0.65s; }

  .nav-link {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-60);
    text-decoration: none;
    padding: 6px 14px;
    border-radius: 8px;
    transition: all 0.15s;
    cursor: pointer;
    background: none;
    border: none;
    font-family: 'DM Sans', sans-serif;
  }
  .nav-link:hover { color: var(--rust); background: var(--rust-faint); }
  .nav-link.active { color: var(--rust); background: var(--rust-pale); font-weight: 600; }

  .card {
    background: var(--white);
    border: 1px solid var(--ink-08);
    border-radius: 20px;
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }

  .btn-primary {
    background: var(--rust);
    color: #fff;
    border: none;
    border-radius: 12px;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.2s;
    box-shadow: var(--shadow-rust);
    letter-spacing: -0.01em;
  }
  .btn-primary:hover:not(:disabled) { background: var(--rust-light); transform: translateY(-1px); box-shadow: 0 12px 40px rgba(184,74,26,0.38); }
  .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

  .btn-secondary {
    background: var(--white);
    color: var(--rust);
    border: 1.5px solid var(--rust);
    border-radius: 12px;
    padding: 11px 22px;
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.2s;
  }
  .btn-secondary:hover { background: var(--rust-faint); }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 100px;
    font-size: 11.5px;
    font-weight: 500;
    letter-spacing: 0.01em;
  }

  /* Chat scrollbar */
  .chat-scroll::-webkit-scrollbar { width: 4px; }
  .chat-scroll::-webkit-scrollbar-track { background: transparent; }
  .chat-scroll::-webkit-scrollbar-thumb { background: var(--ink-15); border-radius: 99px; }

  /* Input focus */
  .muj-input:focus {
    outline: none;
    border-color: var(--rust) !important;
    box-shadow: 0 0 0 3px rgba(184,74,26,0.1) !important;
  }

  /* FAB */
  .fab-ring::after {
    content: '';
    position: absolute; inset: -5px;
    border-radius: 50%;
    border: 2px solid rgba(184,74,26,0.3);
    animation: pulse-ring 2.2s ease infinite;
    pointer-events: none;
  }

  .chip-btn {
    padding: 7px 16px;
    border-radius: 100px;
    border: 1.5px solid var(--ink-15);
    background: var(--white);
    color: var(--ink-60);
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .chip-btn:hover { border-color: var(--rust); color: var(--rust); background: var(--rust-faint); }

  .sug-chip {
    padding: 8px 16px;
    border-radius: 100px;
    border: 1.5px solid var(--ink-08);
    background: var(--parchment);
    color: var(--ink-60);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
  }
  .sug-chip:hover { border-color: var(--rust); color: var(--rust); background: var(--rust-faint); }

  .spinner { width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite; }
  .spinner-rust { width:14px;height:14px;border:2px solid rgba(184,74,26,0.15);border-top-color:var(--rust);border-radius:50%;animation:spin .7s linear infinite; }

  .section-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: var(--rust-pale);
    border-radius: 100px;
    font-size: 11px;
    font-weight: 600;
    color: var(--rust);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .stat-card {
    background: var(--white);
    border: 1px solid var(--ink-08);
    border-radius: 16px;
    padding: 20px;
    text-align: center;
  }

  .upload-zone {
    border: 2px dashed var(--ink-15);
    border-radius: 16px;
    padding: 36px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .upload-zone:hover { border-color: var(--rust); background: var(--rust-faint); }

  /* Modal */
  .modal-bg { animation: fadeIn 0.2s both; }
  .modal-box { animation: fadeUp 0.25s cubic-bezier(0.16,1,0.3,1) both; }

  code { font-family: 'DM Mono', monospace !important; }

  /* Table grid for stats */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  @media (max-width: 700px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
  }

  .page-scroll::-webkit-scrollbar { width: 4px; }
  .page-scroll::-webkit-scrollbar-thumb { background: var(--ink-08); border-radius: 99px; }
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
// MARKDOWN RENDERERS
// ─────────────────────────────────────────────
function inlineFormat(text, theme = "light") {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} style={{ color: theme === "dark" ? "#fff" : "var(--ink)", fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} style={{ background: "rgba(184,74,26,0.08)", color: "var(--rust)", padding: "1px 6px", borderRadius: 5, fontSize: "0.88em" }}>{p.slice(1, -1)}</code>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}

function MarkdownLight({ text }) {
  const lines = text.split("\n");
  const els = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("- ") || line.startsWith("* ")) {
      els.push(<div key={i} style={{ display:"flex", gap:8, marginBottom:3 }}>
        <span style={{ color:"var(--rust)", flexShrink:0, marginTop:2 }}>•</span>
        <span>{inlineFormat(line.slice(2))}</span>
      </div>);
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)[1];
      els.push(<div key={i} style={{ display:"flex", gap:8, marginBottom:3 }}>
        <span style={{ color:"var(--rust)", minWidth:16, flexShrink:0 }}>{num}.</span>
        <span>{inlineFormat(line.replace(/^\d+\.\s/, ""))}</span>
      </div>);
    } else if (line.startsWith("### ")) {
      els.push(<div key={i} style={{ fontSize:13, fontWeight:600, color:"var(--ink)", marginTop:10, marginBottom:4 }}>{line.slice(4)}</div>);
    } else if (line.trim() === "") {
      els.push(<div key={i} style={{ height:6 }} />);
    } else {
      els.push(<p key={i} style={{ lineHeight:1.65, marginBottom:2 }}>{inlineFormat(line)}</p>);
    }
    i++;
  }
  return <div style={{ fontSize:13.5, color:"var(--ink)", lineHeight:1.65 }}>{els}</div>;
}

// ─────────────────────────────────────────────
// TYPING DOTS
// ─────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center", padding:"4px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"rgba(184,74,26,0.3)", animation:`blink 1.2s ease ${i*0.2}s infinite` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MUJ LOGO
// ─────────────────────────────────────────────
const MUJ_LOGO = "/assets/Manipal.jpg";

function MujAvatar({ size = 30, radius = 10 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:radius, flexShrink:0, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(184,74,26,0.2)", border:"1px solid rgba(184,74,26,0.12)" }}>
      <img src={MUJ_LOGO} alt="MUJ" style={{ width:size*0.78, height:size*0.78, objectFit:"contain" }} onError={e => { e.target.style.display="none"; }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// FLOATING CHAT PANEL (unchanged backend logic)
// ─────────────────────────────────────────────
const CHAT_SUGGESTIONS = [
  { label: "Admissions", q: "Tell me about the MUJ admission process" },
  { label: "Programs", q: "What programs are offered at MUJ?" },
  { label: "Campus Life", q: "Tell me about campus life at MUJ" },
  { label: "Fee Details", q: "What are the fee details for MUJ?" },
];

function FloatingChatPanel({ isOpen, guildId }) {
  const SYSTEM_PROMPT = makeSystemPrompt(guildId);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSugg] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, isLoading]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 300); }, [isOpen]);

  const autoResize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  };

  const callAPI = useCallback(async (question, hist) => {
    setIsLoading(true);
    try {
      let text = "";
      try {
        const ragRes = await fetch("http://localhost:8000/query", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({ question, server: guildId }),
        });
        if (ragRes.ok) { const d = await ragRes.json(); if (d.answer) text = d.answer; }
      } catch (_) {}

      if (!text) {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system:SYSTEM_PROMPT, messages:hist }),
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
        const data = await res.json();
        text = data.content.filter(b => b.type==="text").map(b => b.text).join("\n").trim();
        if (!text) throw new Error("No response received.");
      }
      setMessages(p => [...p, { role:"assistant", content:text, id:Date.now() }]);
      setHistory(p => [...p, { role:"assistant", content:text }]);
    } catch (e) {
      setMessages(p => [...p, { role:"assistant", content:"Error: "+e.message, id:Date.now(), error:true }]);
    } finally { setIsLoading(false); }
  }, [guildId, SYSTEM_PROMPT]);

  const sendMessage = useCallback((text) => {
    const q = (text || input).trim();
    if (!q || isLoading) return;
    setShowSugg(false);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    const newHist = [...history, { role:"user", content:q }];
    setMessages(p => [...p, { role:"user", content:q, id:Date.now() }]);
    setHistory(newHist);
    callAPI(q, newHist);
  }, [input, isLoading, history, callAPI]);

  return (
    <div style={{
      position:"fixed", bottom:104, right:32,
      width:400, height:560,
      background:"#fff",
      borderRadius:24,
      border:"1px solid rgba(184,74,26,0.12)",
      boxShadow:"0 32px 80px rgba(28,18,9,0.18), 0 8px 24px rgba(184,74,26,0.1)",
      zIndex:200, display:"flex", flexDirection:"column", overflow:"hidden",
      transformOrigin:"bottom right",
      transition:"transform .35s cubic-bezier(0.16,1,0.3,1), opacity .25s ease",
      transform: isOpen ? "scale(1) translateY(0)" : "scale(0.88) translateY(24px)",
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? "all" : "none",
    }}>
      {/* Header */}
      <div style={{ padding:"18px 20px", background:"linear-gradient(135deg, #B84A1A 0%, #D05A22 100%)", display:"flex", alignItems:"center", gap:12, flexShrink:0, position:"relative", overflow:"hidden" }}>
        {/* Decorative laurel motif */}
        <div style={{ position:"absolute", right:-20, top:-20, width:120, height:120, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }} />
        <div style={{ position:"absolute", right:10, bottom:-30, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
        <div style={{ width:38, height:38, borderRadius:12, overflow:"hidden", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 2px 10px rgba(0,0,0,0.2)", position:"relative" }}>
          <img src={MUJ_LOGO} alt="MUJ" style={{ width:30, height:30, objectFit:"contain" }} onError={e => { e.target.style.display="none"; }} />
        </div>
        <div style={{ position:"relative" }}>
          <div style={{ fontSize:14.5, fontWeight:600, color:"#fff", letterSpacing:"-0.01em", fontFamily:"'Playfair Display', serif" }}>MUJ Assistant</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.72)", marginTop:1 }}>Manipal University Jaipur</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, position:"relative" }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"#a7f3d0", boxShadow:"0 0 8px #6ee7b7" }} />
          <span style={{ fontSize:11.5, color:"rgba(255,255,255,0.8)", fontWeight:500 }}>Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-scroll" style={{ flex:1, overflowY:"auto", padding:"20px 16px 8px", display:"flex", flexDirection:"column", gap:14, background:"var(--cream)" }}>
        {/* Welcome */}
        <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
          <MujAvatar />
          <div>
            <div style={{ background:"#fff", border:"1px solid rgba(184,74,26,0.1)", borderRadius:"4px 16px 16px 16px", padding:"12px 16px", fontSize:13.5, color:"var(--ink)", lineHeight:1.65, maxWidth:280, boxShadow:"var(--shadow-sm)" }}>
              👋 <strong style={{ fontFamily:"'Playfair Display', serif", fontWeight:600 }}>Namaste!</strong> I'm your MUJ AI assistant. Ask me anything about admissions, programs, campus life, fees, and more.
              <br /><br />What would you like to know?
            </div>
            {showSuggestions && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
                {CHAT_SUGGESTIONS.map((s, i) => (
                  <button key={i} className="chip-btn" onClick={() => sendMessage(s.q)} style={{ fontSize:11.5, padding:"5px 12px" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {messages.map(msg => (
          <div key={msg.id} className="anim-msg">
            {msg.role === "user" ? (
              <div style={{ display:"flex", justifyContent:"flex-end" }}>
                <div style={{ background:"linear-gradient(135deg,#B84A1A,#D05A22)", borderRadius:"16px 4px 16px 16px", padding:"11px 16px", fontSize:13.5, color:"#fff", lineHeight:1.65, maxWidth:280, boxShadow:"0 4px 16px rgba(184,74,26,0.25)" }}>
                  {msg.content}
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <MujAvatar />
                <div style={{ background:msg.error?"#fff5f5":"#fff", border:`1px solid ${msg.error?"rgba(185,28,28,0.15)":"rgba(184,74,26,0.1)"}`, borderRadius:"4px 16px 16px 16px", padding:"11px 16px", maxWidth:280, boxShadow:"var(--shadow-sm)" }}>
                  {msg.error
                    ? <span style={{ fontSize:13, color:"#b91c1c" }}>{msg.content}</span>
                    : <MarkdownLight text={msg.content} />
                  }
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <MujAvatar />
            <div style={{ background:"#fff", border:"1px solid rgba(184,74,26,0.1)", borderRadius:"4px 16px 16px 16px", padding:"14px 18px", boxShadow:"var(--shadow-sm)" }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding:"12px 14px 16px", flexShrink:0, borderTop:"1px solid var(--ink-08)", background:"#fff" }}>
        <div style={{ display:"flex", alignItems:"flex-end", gap:8, background:"var(--cream)", border:"1.5px solid var(--ink-15)", borderRadius:16, padding:"8px 8px 8px 14px", transition:"border-color .2s, box-shadow .2s" }}
          onFocusCapture={e => e.currentTarget.style.cssText += "border-color:var(--rust)!important;box-shadow:0 0 0 3px rgba(184,74,26,0.08)!important;"}
          onBlurCapture={e => e.currentTarget.style.cssText += "border-color:var(--ink-15)!important;box-shadow:none!important;"}>
          <textarea ref={inputRef} value={input}
            onChange={e => { setInput(e.target.value); autoResize(); }}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about MUJ…" rows={1} disabled={isLoading}
            style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"var(--ink)", fontSize:13.5, lineHeight:1.5, resize:"none", fontFamily:"'DM Sans', sans-serif", minHeight:22, maxHeight:100, overflowY:"auto" }}
          />
          <button onClick={() => sendMessage()} disabled={isLoading || !input.trim()}
            style={{ width:34, height:34, borderRadius:10, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background: input.trim() && !isLoading ? "var(--rust)" : "var(--ink-08)", border:"none", cursor: input.trim() && !isLoading ? "pointer" : "not-allowed", transition:"all .15s", boxShadow: input.trim() && !isLoading ? "0 4px 12px rgba(184,74,26,0.35)" : "none" }}>
            {isLoading
              ? <div className="spinner" />
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? "#fff" : "rgba(28,18,9,0.25)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// GUILD MODAL
// ─────────────────────────────────────────────
function GuildModal({ guilds, activeId, onSelect, onCreate, onDelete, onClose }) {
  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleCreate = () => {
    const trimId = newId.trim();
    const trimName = newName.trim();
    if (!trimId) { setError("Guild ID is required."); return; }
    if (guilds.find(g => g.id === trimId)) { setError("This Guild ID already exists."); return; }
    onCreate({ id: trimId, name: trimName || `Guild ${trimId.slice(0,6)}` });
    setNewId(""); setNewName(""); setError("");
  };

  return (
    <div className="modal-bg" onClick={onClose} style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(28,18,9,0.4)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:440, background:"#fff", border:"1px solid var(--ink-08)", borderRadius:24, overflow:"hidden", boxShadow:"var(--shadow-lg)" }}>
        <div style={{ padding:"24px 24px 0", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:600, color:"var(--ink)", letterSpacing:"-0.02em" }}>Knowledge Base</div>
            <div style={{ fontSize:13, color:"var(--ink-60)", marginTop:3 }}>Switch or create a vector store</div>
          </div>
          <button onClick={onClose} style={{ background:"var(--ink-08)", border:"none", color:"var(--ink-60)", cursor:"pointer", width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, transition:"all .15s" }}>✕</button>
        </div>

        <div style={{ padding:"18px 20px 8px", display:"flex", flexDirection:"column", gap:8, maxHeight:240, overflowY:"auto" }}>
          {guilds.map(g => (
            <div key={g.id} onClick={() => { onSelect(g.id); onClose(); }}
              style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderRadius:14, cursor:"pointer", border:`1.5px solid ${g.id===activeId?"var(--rust)":"var(--ink-08)"}`, background:g.id===activeId?"var(--rust-faint)":"var(--cream)", transition:"all .12s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:34, height:34, borderRadius:10, background:g.id===activeId?"var(--rust)":"var(--ink-08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:g.id===activeId?"#fff":"var(--ink-35)", flexShrink:0 }}>{g.name.slice(0,2).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:g.id===activeId?600:400, color:"var(--ink)" }}>{g.name}</div>
                  <div style={{ fontSize:11, color:"var(--ink-35)", fontFamily:"'DM Mono', monospace", marginTop:1 }}>{g.id.slice(0,12)}…</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {g.id===activeId && <div style={{ width:7, height:7, borderRadius:"50%", background:"#16a34a", boxShadow:"0 0 8px #4ade80" }} />}
                {guilds.length > 1 && (
                  <span onClick={e => { e.stopPropagation(); onDelete(g.id); }}
                    style={{ fontSize:13, color:"var(--ink-35)", cursor:"pointer", padding:"2px 6px", borderRadius:6, transition:"all .12s" }}>✕</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding:"16px 20px 24px", borderTop:"1px solid var(--ink-08)", marginTop:8 }}>
          <div style={{ fontSize:11, color:"var(--ink-35)", letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>New Guild</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <input ref={inputRef} value={newId} onChange={e => { setNewId(e.target.value); setError(""); }}
              placeholder="Guild ID (e.g. 1234567890123456789)"
              onKeyDown={e => e.key==="Enter" && handleCreate()}
              style={{ background:"var(--cream)", border:`1.5px solid ${error?"rgba(185,28,28,0.4)":"var(--ink-15)"}`, borderRadius:12, color:"var(--ink)", fontSize:13, padding:"10px 14px", outline:"none", fontFamily:"'DM Mono', monospace", transition:"border-color 0.15s" }} />
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Display name (optional)"
              onKeyDown={e => e.key==="Enter" && handleCreate()}
              style={{ background:"var(--cream)", border:"1.5px solid var(--ink-15)", borderRadius:12, color:"var(--ink)", fontSize:13, padding:"10px 14px", outline:"none", fontFamily:"'DM Sans', sans-serif", transition:"border-color 0.15s" }} />
            {error && <div style={{ fontSize:12, color:"#b91c1c" }}>{error}</div>}
            <button onClick={handleCreate} className="btn-primary" style={{ width:"100%", padding:"11px" }}>
              + Add Knowledge Base
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// UPLOAD TAB (backend unchanged)
// ─────────────────────────────────────────────
function UploadTab({ guildId }) {
  const [uploadUrls, setUploadUrls] = useState("");
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleUpload = async () => {
    if (!uploadUrls.trim() && !uploadFiles.length) return;
    setUploading(true); setUploadStatus(null);
    const fd = new FormData();
    fd.append("guild_id", guildId);
    if (uploadUrls.trim()) fd.append("urls", uploadUrls.trim());
    uploadFiles.forEach(f => fd.append("files", f));
    try {
      const res = await fetch("http://localhost:8000/upload", { method:"PUT", body:fd });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const d = await res.json();
      setUploadStatus({ ok:true, msg:`${d.message} — ${d.urls_processed} URL(s), ${d.pdfs_processed} PDF(s)` });
      setUploadUrls(""); setUploadFiles([]);
    } catch (e) {
      setUploadStatus({ ok:false, msg:e.message });
    } finally { setUploading(false); }
  };

  return (
    <div className="page-scroll" style={{ flex:1, overflowY:"auto", padding:"40px 48px" }}>
      <div style={{ maxWidth:640, margin:"0 auto" }}>
        <div className="section-pill">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Ingest Content
        </div>
        <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, color:"var(--ink)", letterSpacing:"-0.03em", marginBottom:6 }}>
          Knowledge Base
        </h2>
        <p style={{ fontSize:14, color:"var(--ink-60)", marginBottom:32, lineHeight:1.6 }}>
          Add URLs or PDFs to populate your vector store with university content.
        </p>

        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {/* URLs */}
          <div className="card" style={{ padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"var(--rust-pale)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rust)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:"var(--ink)" }}>Web URLs</div>
                <div style={{ fontSize:12, color:"var(--ink-35)" }}>One URL per line</div>
              </div>
            </div>
            <textarea value={uploadUrls} onChange={e => setUploadUrls(e.target.value)}
              placeholder={"https://manipal.edu/muj\nhttps://another-page.io"}
              rows={4}
              style={{ width:"100%", background:"var(--cream)", border:"1.5px solid var(--ink-15)", borderRadius:12, color:"var(--ink)", fontSize:13.5, padding:"12px 16px", outline:"none", resize:"vertical", lineHeight:1.6, fontFamily:"'DM Sans', sans-serif", transition:"border-color 0.15s" }} />
          </div>

          {/* PDFs */}
          <div className="card" style={{ padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"var(--rust-pale)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rust)" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:"var(--ink)" }}>PDF Files</div>
                <div style={{ fontSize:12, color:"var(--ink-35)" }}>Drag & drop or click to browse</div>
              </div>
            </div>
            <div className="upload-zone" onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setUploadFiles(p => [...p, ...[...e.dataTransfer.files].filter(f => f.type==="application/pdf")]); }}>
              <div style={{ width:48, height:48, borderRadius:14, background:"var(--rust-pale)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--rust)" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div style={{ fontSize:14, color:"var(--ink-60)", textAlign:"center" }}>Drop PDFs here or <span style={{ color:"var(--rust)", fontWeight:500 }}>browse files</span></div>
              <div style={{ fontSize:12, color:"var(--ink-35)" }}>Supports multiple PDF files</div>
              <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display:"none" }} onChange={e => setUploadFiles(p => [...p, ...[...e.target.files]])} />
            </div>
            {uploadFiles.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:14 }}>
                {uploadFiles.map((f, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, background:"var(--rust-pale)", border:"1px solid rgba(184,74,26,0.15)", borderRadius:10, padding:"6px 12px", fontSize:12.5, color:"var(--rust)" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {f.name.length > 26 ? f.name.slice(0,23)+"…" : f.name}
                    <span onClick={() => setUploadFiles(p => p.filter((_,j) => j!==i))} style={{ cursor:"pointer", color:"rgba(184,74,26,0.5)", marginLeft:2, transition:"color .12s" }}>✕</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploadStatus && (
            <div style={{ padding:"14px 18px", borderRadius:14, fontSize:13.5, lineHeight:1.55, background:uploadStatus.ok?"rgba(22,163,74,0.06)":"rgba(185,28,28,0.06)", border:`1px solid ${uploadStatus.ok?"rgba(22,163,74,0.2)":"rgba(185,28,28,0.2)"}`, color:uploadStatus.ok?"#15803d":"#b91c1c" }}>
              {uploadStatus.ok?"✓ ":"✗ "}{uploadStatus.msg}
            </div>
          )}

          <button className="btn-primary" onClick={handleUpload}
            disabled={uploading || (!uploadUrls.trim() && !uploadFiles.length)}
            style={{ width:"100%", padding:"14px", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:10, borderRadius:14 }}>
            {uploading
              ? <><div className="spinner" />Ingesting content…</>
              : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Upload to Knowledge Base</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────
const STATS = [
  { value: "NAAC A+", label: "Accreditation", icon: "🏛️" },
  { value: "200+", label: "Programs", icon: "📚" },
  { value: "15,000+", label: "Students", icon: "🎓" },
  { value: "500+", label: "Faculty", icon: "👨‍🏫" },
];

const SCHOOLS = [
  "Engineering & Technology", "Management & Commerce", "Law", "Design",
  "Life Sciences", "Humanities & Social Sciences", "Computer Applications", "Architecture",
];

function HomePage({ onChat }) {
  return (
    <div className="page-scroll" style={{ flex:1, overflowY:"auto" }}>
      {/* Hero */}
      <div style={{ position:"relative", overflow:"hidden", background:"linear-gradient(135deg, #B84A1A 0%, #8B2E0A 60%, #6B1E06 100%)", minHeight:480, display:"flex", alignItems:"center", padding:"60px 48px" }}>
        {/* Decorative circles */}
        <div style={{ position:"absolute", right:-80, top:-80, width:500, height:500, borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", right:100, bottom:-100, width:300, height:300, borderRadius:"50%", background:"rgba(255,255,255,0.03)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", left:-60, bottom:-60, width:280, height:280, borderRadius:"50%", background:"rgba(255,255,255,0.03)", pointerEvents:"none" }} />

        {/* Laurel-inspired decorative line */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }} />

        <div style={{ maxWidth:700, position:"relative" }}>
          <div className="anim-fadein" style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:100, padding:"5px 14px", fontSize:11.5, color:"rgba(255,255,255,0.8)", fontWeight:500, letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:24 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#a7f3d0", boxShadow:"0 0 8px #6ee7b7" }} />
            Established 2011 · Jaipur, Rajasthan
          </div>
          <h1 className="anim-fadeup delay-1" style={{ fontFamily:"'Playfair Display', serif", fontSize:52, fontWeight:700, color:"#fff", lineHeight:1.1, letterSpacing:"-0.03em", marginBottom:20 }}>
            Inspired by Life.<br />
            <em style={{ color:"rgba(255,255,255,0.75)", fontWeight:400 }}>Built for Excellence.</em>
          </h1>
          <p className="anim-fadeup delay-2" style={{ fontSize:16, color:"rgba(255,255,255,0.7)", lineHeight:1.7, maxWidth:520, marginBottom:36 }}>
            Manipal University Jaipur — a premier destination for higher education, research, and innovation in India.
          </p>
          <div className="anim-fadeup delay-3" style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
            <button className="btn-primary" onClick={onChat}
              style={{ background:"#fff", color:"var(--rust)", boxShadow:"0 8px 32px rgba(0,0,0,0.2)", display:"flex", alignItems:"center", gap:10, padding:"14px 28px", fontSize:14, borderRadius:14 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Ask AI Assistant
            </button>
            <button className="btn-secondary" style={{ background:"transparent", color:"#fff", border:"1.5px solid rgba(255,255,255,0.35)", borderRadius:14, padding:"13px 24px" }}>
              Explore Programs
            </button>
          </div>
        </div>

        {/* Logo on right */}
        <div className="anim-fadein delay-4" style={{ position:"absolute", right:60, top:"50%", transform:"translateY(-50%)", width:160, height:160, borderRadius:28, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)" }}>
          <img src={MUJ_LOGO} alt="MUJ" style={{ width:130, height:130, objectFit:"contain", filter:"drop-shadow(0 4px 16px rgba(0,0,0,0.3))" }} onError={e => { e.target.style.display="none"; }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding:"40px 48px", background:"var(--white)", borderBottom:"1px solid var(--ink-08)" }}>
        <div className="stats-grid" style={{ maxWidth:900, margin:"0 auto" }}>
          {STATS.map((s, i) => (
            <div key={i} className="stat-card anim-fadein" style={{ animationDelay:`${i*0.1}s` }}>
              <div style={{ fontSize:28, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:26, fontWeight:700, color:"var(--rust)", letterSpacing:"-0.02em" }}>{s.value}</div>
              <div style={{ fontSize:12.5, color:"var(--ink-60)", fontWeight:500, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Schools */}
      <div style={{ padding:"48px 48px 60px" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <div className="section-pill">Academic Schools</div>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, color:"var(--ink)", letterSpacing:"-0.03em", marginBottom:8 }}>30+ Schools & Departments</h2>
          <p style={{ fontSize:14, color:"var(--ink-60)", marginBottom:32, lineHeight:1.65 }}>World-class education across disciplines, designed to shape tomorrow's leaders.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:14 }}>
            {SCHOOLS.map((s, i) => (
              <div key={i} className="card" style={{ padding:"18px 20px", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"var(--rust-pale)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:"var(--rust)" }} />
                </div>
                <div style={{ fontSize:13, fontWeight:500, color:"var(--ink)", lineHeight:1.4 }}>{s}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ marginTop:48, background:"linear-gradient(135deg, var(--rust-pale) 0%, #FDF0E8 100%)", border:"1.5px solid rgba(184,74,26,0.12)", borderRadius:24, padding:"36px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:24, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:22, fontWeight:700, color:"var(--ink)", letterSpacing:"-0.02em", marginBottom:8 }}>Have questions?</div>
              <div style={{ fontSize:14, color:"var(--ink-60)", lineHeight:1.6, maxWidth:400 }}>
                Our AI assistant can answer queries about admissions, programs, fees, campus life, and more — instantly.
              </div>
            </div>
            <button className="btn-primary" onClick={onChat} style={{ padding:"14px 28px", fontSize:14, borderRadius:14, display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Chat with AI
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
  const [activeGuildId, setActiveId] = useState(getStoredActiveId);
  const [showGuildModal, setGuildModal] = useState(false);
  const [tab, setTab] = useState("home");
  const [chatOpen, setChatOpen] = useState(false);

  const activeGuild = guilds.find(g => g.id === activeGuildId) || guilds[0];
  const VECTOR_STORE_ID = activeGuild.id;

  const handleSelectGuild = (id) => { setActiveId(id); saveActiveId(id); };
  const handleCreateGuild = (guild) => {
    const updated = [...guilds, guild];
    setGuilds(updated); saveGuilds(updated);
    handleSelectGuild(guild.id);
  };
  const handleDeleteGuild = (id) => {
    const updated = guilds.filter(g => g.id !== id);
    setGuilds(updated); saveGuilds(updated);
    if (activeGuildId === id) handleSelectGuild(updated[0].id);
  };

  return (
    <>
      <GlobalStyles />
      <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:"var(--cream)" }}>

        {/* ── NAV ── */}
        <nav style={{ height:64, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px", background:"rgba(251,247,244,0.92)", borderBottom:"1px solid var(--ink-08)", backdropFilter:"blur(16px)", position:"relative", zIndex:100 }}>

          {/* Brand */}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:12, background:"#fff", border:"1px solid rgba(184,74,26,0.15)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"var(--shadow-sm)", overflow:"hidden", flexShrink:0 }}>
              <img src={MUJ_LOGO} alt="MUJ" style={{ width:30, height:30, objectFit:"contain" }} onError={e => { e.target.style.display="none"; }} />
            </div>
            <div>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:16, fontWeight:700, color:"var(--ink)", letterSpacing:"-0.02em", lineHeight:1.2 }}>Manipal University Jaipur</div>
              <div style={{ fontSize:10.5, color:"var(--ink-35)", fontWeight:500, letterSpacing:"0.04em", textTransform:"uppercase" }}>AI Knowledge Portal</div>
            </div>
          </div>

          {/* Nav links */}
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            {[["home","Home"],["upload","Knowledge Base"]].map(([id, label]) => (
              <button key={id} className={`nav-link${tab===id?" active":""}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>

          {/* Right: Guild + status */}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={() => setGuildModal(true)}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 14px", borderRadius:100, background:"var(--white)", border:"1px solid var(--ink-08)", fontSize:12.5, color:"var(--ink-60)", cursor:"pointer", transition:"all .15s", fontFamily:"'DM Sans', sans-serif", boxShadow:"var(--shadow-sm)" }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:"#16a34a", boxShadow:"0 0 8px #4ade80" }} />
              <span style={{ fontWeight:500, color:"var(--ink)", maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activeGuild.name}</span>
              <code style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:"var(--ink-35)" }}>{VECTOR_STORE_ID.slice(0,6)}…</code>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
        </nav>

        {/* ── BODY ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative" }}>
          {tab === "home" && <HomePage onChat={() => setChatOpen(true)} />}
          {tab === "upload" && <UploadTab key={VECTOR_STORE_ID} guildId={VECTOR_STORE_ID} />}
        </div>

        {/* Guild Modal */}
        {showGuildModal && (
          <GuildModal
            guilds={guilds} activeId={activeGuildId}
            onSelect={handleSelectGuild}
            onCreate={handleCreateGuild}
            onDelete={handleDeleteGuild}
            onClose={() => setGuildModal(false)}
          />
        )}

        {/* ── FAB ── */}
        <button className="fab-ring" onClick={() => setChatOpen(o => !o)}
          style={{ position:"fixed", bottom:32, right:32, zIndex:300, width:58, height:58, borderRadius:"50%", background:"linear-gradient(145deg, #D05A22, #B84A1A)", border:"none", cursor:"pointer", boxShadow:"0 8px 32px rgba(184,74,26,0.45), 0 2px 8px rgba(0,0,0,0.15)", display:"flex", alignItems:"center", justifyContent:"center", transition:"transform .2s, box-shadow .2s", position:"fixed" }}
          onMouseEnter={e => { e.currentTarget.style.transform="scale(1.08)"; e.currentTarget.style.boxShadow="0 14px 48px rgba(184,74,26,0.55), 0 4px 12px rgba(0,0,0,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow="0 8px 32px rgba(184,74,26,0.45), 0 2px 8px rgba(0,0,0,0.15)"; }}
          aria-label={chatOpen ? "Close chat" : "Open chat"}>
          {/* AI badge */}
          <div style={{ position:"absolute", top:-4, right:-4, width:20, height:20, borderRadius:"50%", background:"#fff", border:"2px solid var(--rust)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8.5, fontWeight:700, color:"var(--rust)", fontFamily:"'DM Mono', monospace" }}>AI</div>
          {chatOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          )}
        </button>

        {/* ── Floating Chat Panel ── */}
        <FloatingChatPanel isOpen={chatOpen} guildId={VECTOR_STORE_ID} />
      </div>
    </>
  );
}
