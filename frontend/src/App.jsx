import { useState, useRef, useEffect, useCallback } from "react";

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

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { font-family: 'DM Sans', sans-serif; background: #1a0a04; -webkit-font-smoothing: antialiased; overflow: hidden; }

  :root {
    --rust: #B84A1A;
    --rust-light: #D05A22;
    --rust-pale: rgba(245,232,224,0.18);
    --rust-faint: rgba(251,242,237,0.12);
    --gold: #C8913A;
    --cream: rgba(251,247,244,0.08);
    --parchment: rgba(243,235,227,0.10);
    --ink: #fff;
    --ink-60: rgba(255,255,255,0.7);
    --ink-35: rgba(255,255,255,0.4);
    --ink-15: rgba(255,255,255,0.15);
    --ink-08: rgba(255,255,255,0.08);
    --white: rgba(255,255,255,0.08);
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.25);
    --shadow-md: 0 8px 32px rgba(0,0,0,0.35);
    --shadow-lg: 0 20px 60px rgba(0,0,0,0.45);
    --shadow-rust: 0 8px 32px rgba(184,74,26,0.4);
  }

  @keyframes fadeUp    { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes msgIn     { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin      { to { transform:rotate(360deg); } }
  @keyframes blink     { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
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
    color: rgba(255,255,255,0.65);
    text-decoration: none;
    padding: 6px 14px;
    border-radius: 8px;
    transition: all 0.15s;
    cursor: pointer;
    background: none;
    border: none;
    font-family: 'DM Sans', sans-serif;
  }
  .nav-link:hover { color: #fff; background: rgba(255,255,255,0.1); }
  .nav-link.active { color: #fff; background: rgba(184,74,26,0.45); font-weight: 600; }

  .card {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 20px;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    transition: background 0.2s, transform 0.2s;
  }
  .card:hover { background: rgba(255,255,255,0.10); transform: translateY(-2px); }

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
  .btn-primary:hover:not(:disabled) { background: var(--rust-light); transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

  .btn-secondary {
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.8);
    border: 1.5px solid rgba(255,255,255,0.2);
    border-radius: 12px;
    padding: 11px 22px;
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.2s;
    backdrop-filter: blur(8px);
  }
  .btn-secondary:hover { background: rgba(255,255,255,0.14); }

  .chip-btn {
    padding: 7px 16px;
    border-radius: 100px;
    border: 1.5px solid rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.7);
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
    white-space: nowrap;
    backdrop-filter: blur(6px);
  }
  .chip-btn:hover { border-color: var(--rust); color: #fff; background: rgba(184,74,26,0.3); }

  .sug-chip {
    padding: 8px 16px;
    border-radius: 100px;
    border: 1.5px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.65);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
    backdrop-filter: blur(6px);
  }
  .sug-chip:hover { border-color: var(--rust); color: #fff; background: rgba(184,74,26,0.25); }

  .spinner { width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite; }
  .spinner-rust { width:14px;height:14px;border:2px solid rgba(184,74,26,0.3);border-top-color:var(--rust);border-radius:50%;animation:spin .7s linear infinite; }

  .section-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: rgba(184,74,26,0.25);
    border: 1px solid rgba(184,74,26,0.35);
    border-radius: 100px;
    font-size: 11px;
    font-weight: 600;
    color: #ffb899;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .stat-card {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px;
    padding: 20px;
    text-align: center;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .upload-zone {
    border: 2px dashed rgba(255,255,255,0.2);
    border-radius: 16px;
    padding: 36px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .upload-zone:hover { border-color: var(--rust); background: rgba(184,74,26,0.12); }

  .modal-bg { animation: fadeIn 0.2s both; }
  .modal-box { animation: fadeUp 0.25s cubic-bezier(0.16,1,0.3,1) both; }

  code { font-family: 'DM Mono', monospace !important; }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  @media (max-width: 700px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
  }

  .chat-scroll::-webkit-scrollbar { width: 4px; }
  .chat-scroll::-webkit-scrollbar-track { background: transparent; }
  .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }

  .page-scroll::-webkit-scrollbar { width: 4px; }
  .page-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }

  .muj-input {
    background: rgba(255,255,255,0.07) !important;
    border: 1.5px solid rgba(255,255,255,0.15) !important;
    color: #fff !important;
    backdrop-filter: blur(8px);
  }
  .muj-input::placeholder { color: rgba(255,255,255,0.35) !important; }
  .muj-input:focus {
    outline: none;
    border-color: var(--rust) !important;
    box-shadow: 0 0 0 3px rgba(184,74,26,0.2) !important;
  }

  .fab-ring::after {
    content: '';
    position: absolute; inset: -5px;
    border-radius: 50%;
    border: 2px solid rgba(184,74,26,0.4);
    animation: pulse-ring 2.2s ease infinite;
    pointer-events: none;
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

// ─── MARKDOWN ───
function inlineFormat(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} style={{ color: "#fff", fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} style={{ background: "rgba(184,74,26,0.25)", color: "#ffb899", padding: "1px 6px", borderRadius: 5, fontSize: "0.88em" }}>{p.slice(1, -1)}</code>;
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
        <span style={{ color:"#ffb899", flexShrink:0, marginTop:2 }}>•</span>
        <span>{inlineFormat(line.slice(2))}</span>
      </div>);
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)[1];
      els.push(<div key={i} style={{ display:"flex", gap:8, marginBottom:3 }}>
        <span style={{ color:"#ffb899", minWidth:16, flexShrink:0 }}>{num}.</span>
        <span>{inlineFormat(line.replace(/^\d+\.\s/, ""))}</span>
      </div>);
    } else if (line.startsWith("### ")) {
      els.push(<div key={i} style={{ fontSize:13, fontWeight:600, color:"#fff", marginTop:10, marginBottom:4 }}>{line.slice(4)}</div>);
    } else if (line.trim() === "") {
      els.push(<div key={i} style={{ height:6 }} />);
    } else {
      els.push(<p key={i} style={{ lineHeight:1.65, marginBottom:2 }}>{inlineFormat(line)}</p>);
    }
    i++;
  }
  return <div style={{ fontSize:13.5, color:"rgba(255,255,255,0.88)", lineHeight:1.65 }}>{els}</div>;
}

function TypingDots() {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center", padding:"4px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"rgba(255,184,153,0.4)", animation:`blink 1.2s ease ${i*0.2}s infinite` }} />
      ))}
    </div>
  );
}

const MUJ_LOGO = "src/assets/Manipal_BG.png";
const MUJ_BG   = "src/assets/Manipal_BG.png";

function MujAvatar({ size = 30, radius = 10 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:radius, flexShrink:0, background:"rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(184,74,26,0.3)", border:"1px solid rgba(255,255,255,0.15)", backdropFilter:"blur(8px)" }}>
      <img src={MUJ_LOGO} alt="MUJ" style={{ width:size*0.78, height:size*0.78, objectFit:"contain" }} onError={e => { e.target.style.display="none"; }} />
    </div>
  );
}

// ─── FLOATING CHAT PANEL ───
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
      background:"rgba(20,8,2,0.75)",
      backdropFilter:"blur(24px)",
      WebkitBackdropFilter:"blur(24px)",
      borderRadius:24,
      border:"1px solid rgba(255,255,255,0.12)",
      boxShadow:"0 32px 80px rgba(0,0,0,0.5), 0 8px 24px rgba(184,74,26,0.15)",
      zIndex:200, display:"flex", flexDirection:"column", overflow:"hidden",
      transformOrigin:"bottom right",
      transition:"transform .35s cubic-bezier(0.16,1,0.3,1), opacity .25s ease",
      transform: isOpen ? "scale(1) translateY(0)" : "scale(0.88) translateY(24px)",
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? "all" : "none",
    }}>
      {/* Header */}
      <div style={{ padding:"18px 20px", background:"linear-gradient(135deg, rgba(184,74,26,0.8) 0%, rgba(208,90,34,0.8) 100%)", display:"flex", alignItems:"center", gap:12, flexShrink:0, position:"relative", overflow:"hidden", backdropFilter:"blur(8px)" }}>
        <div style={{ position:"absolute", right:-20, top:-20, width:120, height:120, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }} />
        <div style={{ position:"absolute", right:10, bottom:-30, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
        <div style={{ width:38, height:38, borderRadius:12, overflow:"hidden", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 2px 10px rgba(0,0,0,0.3)", position:"relative", backdropFilter:"blur(8px)" }}>
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
      <div className="chat-scroll" style={{ flex:1, overflowY:"auto", padding:"20px 16px 8px", display:"flex", flexDirection:"column", gap:14, background:"transparent" }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
          <MujAvatar />
          <div>
            <div style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"4px 16px 16px 16px", padding:"12px 16px", fontSize:13.5, color:"rgba(255,255,255,0.9)", lineHeight:1.65, maxWidth:280, backdropFilter:"blur(8px)" }}>
              👋 <strong style={{ fontFamily:"'Playfair Display', serif", fontWeight:600, color:"#fff" }}>Namaste!</strong> I'm your MUJ AI assistant. Ask me anything about admissions, programs, campus life, fees, and more.
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
                <div style={{ background:"linear-gradient(135deg,rgba(184,74,26,0.85),rgba(208,90,34,0.85))", backdropFilter:"blur(8px)", borderRadius:"16px 4px 16px 16px", padding:"11px 16px", fontSize:13.5, color:"#fff", lineHeight:1.65, maxWidth:280, boxShadow:"0 4px 16px rgba(184,74,26,0.3)" }}>
                  {msg.content}
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <MujAvatar />
                <div style={{ background:msg.error?"rgba(185,28,28,0.2)":"rgba(255,255,255,0.1)", border:`1px solid ${msg.error?"rgba(185,28,28,0.3)":"rgba(255,255,255,0.12)"}`, borderRadius:"4px 16px 16px 16px", padding:"11px 16px", maxWidth:280, backdropFilter:"blur(8px)" }}>
                  {msg.error
                    ? <span style={{ fontSize:13, color:"#fca5a5" }}>{msg.content}</span>
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
            <div style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"4px 16px 16px 16px", padding:"14px 18px", backdropFilter:"blur(8px)" }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding:"12px 14px 16px", flexShrink:0, borderTop:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", alignItems:"flex-end", gap:8, background:"rgba(255,255,255,0.07)", border:"1.5px solid rgba(255,255,255,0.12)", borderRadius:16, padding:"8px 8px 8px 14px", backdropFilter:"blur(8px)", transition:"border-color .2s" }}
          onFocusCapture={e => e.currentTarget.style.borderColor="var(--rust)"}
          onBlurCapture={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.12)"}>
          <textarea ref={inputRef} value={input}
            onChange={e => { setInput(e.target.value); autoResize(); }}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about MUJ…" rows={1} disabled={isLoading}
            style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#fff", fontSize:13.5, lineHeight:1.5, resize:"none", fontFamily:"'DM Sans', sans-serif", minHeight:22, maxHeight:100, overflowY:"auto" }}
          />
          <button onClick={() => sendMessage()} disabled={isLoading || !input.trim()}
            style={{ width:34, height:34, borderRadius:10, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background: input.trim() && !isLoading ? "var(--rust)" : "rgba(255,255,255,0.08)", border:"none", cursor: input.trim() && !isLoading ? "pointer" : "not-allowed", transition:"all .15s", boxShadow: input.trim() && !isLoading ? "0 4px 12px rgba(184,74,26,0.4)" : "none" }}>
            {isLoading
              ? <div className="spinner" />
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? "#fff" : "rgba(255,255,255,0.25)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── GUILD MODAL ───
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
    <div className="modal-bg" onClick={onClose} style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:440, background:"rgba(20,8,2,0.85)", backdropFilter:"blur(24px)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:24, overflow:"hidden", boxShadow:"0 40px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ padding:"24px 24px 0", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:600, color:"#fff", letterSpacing:"-0.02em" }}>Knowledge Base</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginTop:3 }}>Switch or create a vector store</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.6)", cursor:"pointer", width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, transition:"all .15s" }}>✕</button>
        </div>

        <div style={{ padding:"18px 20px 8px", display:"flex", flexDirection:"column", gap:8, maxHeight:240, overflowY:"auto" }}>
          {guilds.map(g => (
            <div key={g.id} onClick={() => { onSelect(g.id); onClose(); }}
              style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderRadius:14, cursor:"pointer", border:`1.5px solid ${g.id===activeId?"var(--rust)":"rgba(255,255,255,0.1)"}`, background:g.id===activeId?"rgba(184,74,26,0.2)":"rgba(255,255,255,0.05)", transition:"all .12s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:34, height:34, borderRadius:10, background:g.id===activeId?"var(--rust)":"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>{g.name.slice(0,2).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:g.id===activeId?600:400, color:"#fff" }}>{g.name}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontFamily:"'DM Mono', monospace", marginTop:1 }}>{g.id.slice(0,12)}…</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {g.id===activeId && <div style={{ width:7, height:7, borderRadius:"50%", background:"#16a34a", boxShadow:"0 0 8px #4ade80" }} />}
                {guilds.length > 1 && (
                  <span onClick={e => { e.stopPropagation(); onDelete(g.id); }}
                    style={{ fontSize:13, color:"rgba(255,255,255,0.3)", cursor:"pointer", padding:"2px 6px", borderRadius:6, transition:"all .12s" }}>✕</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding:"16px 20px 24px", borderTop:"1px solid rgba(255,255,255,0.08)", marginTop:8 }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>New Guild</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <input ref={inputRef} value={newId} onChange={e => { setNewId(e.target.value); setError(""); }}
              placeholder="Guild ID (e.g. 1234567890123456789)"
              onKeyDown={e => e.key==="Enter" && handleCreate()}
              className="muj-input"
              style={{ borderRadius:12, fontSize:13, padding:"10px 14px", outline:"none", fontFamily:"'DM Mono', monospace" }} />
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Display name (optional)"
              onKeyDown={e => e.key==="Enter" && handleCreate()}
              className="muj-input"
              style={{ borderRadius:12, fontSize:13, padding:"10px 14px", outline:"none", fontFamily:"'DM Sans', sans-serif" }} />
            {error && <div style={{ fontSize:12, color:"#fca5a5" }}>{error}</div>}
            <button onClick={handleCreate} className="btn-primary" style={{ width:"100%", padding:"11px" }}>
              + Add Knowledge Base
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

  const fetchSubUrls = async () => {
    const url = baseUrl.trim();
    if (!url) return;
    setFetching(true); setResults(null); setSelected(new Set()); setFilter(""); setIngestStatus(null);
    try {
      const res = await fetch(`http://localhost:8000/sub-urls?url=${encodeURIComponent(url)}`);
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.detail || `HTTP ${res.status}`); }
      const data = await res.json();
      setResults(data);
    } catch (e) {
      setResults({ base_url: url, sub_urls: [], count: 0, error: e.message });
    } finally { setFetching(false); }
  };

  const toggleSelect = (u) => setSelected(prev => {
    const next = new Set(prev);
    next.has(u) ? next.delete(u) : next.add(u);
    return next;
  });
  const selectAll = () => setSelected(new Set(filtered));
  const clearAll  = () => setSelected(new Set());

  const filtered = results
    ? results.sub_urls.filter(u => !filter || u.toLowerCase().includes(filter.toLowerCase()))
    : [];

  const ingestSelected = async () => {
    if (!selected.size) return;
    setIngesting(true); setIngestStatus(null);
    const fd = new FormData();
    fd.append("guild_id", guildId);
    fd.append("urls", [...selected].join("\n"));
    try {
      const res = await fetch("http://localhost:8000/upload", { method: "PUT", body: fd });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const d = await res.json();
      setIngestStatus({ ok: true, msg: `${d.message} — ${d.urls_processed} URL(s) ingested into knowledge base.` });
    } catch (e) {
      setIngestStatus({ ok: false, msg: e.message });
    } finally { setIngesting(false); }
  };

  return (
    <div className="page-scroll" style={{ flex: 1, overflowY: "auto", padding: "40px 48px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="section-pill">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          Sub URL Discovery
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", marginBottom: 6 }}>
          Discover Sub-URLs
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 32, lineHeight: 1.6 }}>
          Enter a website URL to extract all its hyperlinks. Select the ones you want and ingest them directly into your knowledge base.
        </p>

        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(184,74,26,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffb899" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Target URL</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Enter the page to scrape links from</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchSubUrls()}
              placeholder="https://manipal.edu/muj"
              className="muj-input"
              style={{ flex: 1, borderRadius: 12, fontSize: 13.5, padding: "11px 16px", outline: "none", fontFamily: "'DM Sans', sans-serif" }}
            />
            <button
              className="btn-primary"
              onClick={fetchSubUrls}
              disabled={fetching || !baseUrl.trim()}
              style={{ padding: "11px 22px", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {fetching
                ? <><div className="spinner" />Scanning…</>
                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Discover</>
              }
            </button>
          </div>
        </div>

        {results && (
          <div className="anim-fadeup">
            {results.error ? (
              <div style={{ padding: "16px 20px", borderRadius: 14, background: "rgba(185,28,28,0.15)", border: "1px solid rgba(185,28,28,0.3)", color: "#fca5a5", fontSize: 13.5 }}>
                ✗ {results.error}
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(184,74,26,0.2)", border: "1px solid rgba(184,74,26,0.3)", borderRadius: 100, padding: "4px 12px" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#ffb899" }}>{results.count} URLs found</span>
                    </div>
                    {selected.size > 0 && (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>{selected.size} selected</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      value={filter}
                      onChange={e => setFilter(e.target.value)}
                      placeholder="Filter URLs…"
                      className="muj-input"
                      style={{ borderRadius: 10, fontSize: 12.5, padding: "7px 12px", outline: "none", width: 180, fontFamily: "'DM Sans', sans-serif" }}
                    />
                    <button className="btn-secondary" onClick={selectAll} style={{ padding: "7px 14px", fontSize: 12, borderRadius: 10 }}>Select All</button>
                    <button className="btn-secondary" onClick={clearAll} style={{ padding: "7px 14px", fontSize: 12, borderRadius: 10 }}>Clear</button>
                  </div>
                </div>

                <div className="chat-scroll" style={{ maxHeight: 340, overflowY: "auto" }}>
                  {filtered.length === 0 ? (
                    <div style={{ padding: "32px 20px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13.5 }}>No URLs match your filter.</div>
                  ) : (
                    filtered.map((u, i) => {
                      const isSelected = selected.has(u);
                      return (
                        <div key={i} onClick={() => toggleSelect(u)}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", cursor: "pointer", background: isSelected ? "rgba(184,74,26,0.15)" : "transparent", transition: "background 0.12s" }}>
                          <div style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, border: `2px solid ${isSelected ? "var(--rust)" : "rgba(255,255,255,0.2)"}`, background: isSelected ? "var(--rust)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}>
                            {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                          <span style={{ fontSize: 12.5, color: isSelected ? "#ffb899" : "rgba(255,255,255,0.55)", fontFamily: "'DM Mono', monospace", wordBreak: "break-all", flex: 1, lineHeight: 1.5 }}>{u}</span>
                          <a href={u} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ flexShrink: 0, color: "rgba(255,255,255,0.3)" }} title="Open in new tab">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </a>
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>
                    {selected.size > 0 ? `${selected.size} URL${selected.size > 1 ? "s" : ""} selected for ingestion` : "Select URLs above to ingest into your knowledge base"}
                  </div>
                  <button className="btn-primary" onClick={ingestSelected} disabled={ingesting || selected.size === 0}
                    style={{ padding: "10px 20px", fontSize: 13, borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    {ingesting ? <><div className="spinner" />Ingesting…</> : <>Ingest Selected</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {ingestStatus && (
          <div className="anim-fadein" style={{ marginTop: 16, padding: "14px 18px", borderRadius: 14, fontSize: 13.5, lineHeight: 1.55, background: ingestStatus.ok ? "rgba(22,163,74,0.12)" : "rgba(185,28,28,0.12)", border: `1px solid ${ingestStatus.ok ? "rgba(22,163,74,0.3)" : "rgba(185,28,28,0.3)"}`, color: ingestStatus.ok ? "#86efac" : "#fca5a5" }}>
            {ingestStatus.ok ? "✓ " : "✗ "}{ingestStatus.msg}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── UPLOAD TAB ───
function UploadTab({ guildId }) {
  const [uploadUrls, setUploadUrls] = useState("");
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const [contactFile, setContactFile] = useState(null);
  const [contactStatus, setContactStatus] = useState(null);
  const [contactUploading, setContactUploading] = useState(false);
  const contactRef = useRef(null);

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

  const handleContactUpload = async () => {
    if (!contactFile) return;
    setContactUploading(true); setContactStatus(null);
    const fd = new FormData();
    fd.append("guild_id", guildId);
    fd.append("file", contactFile);
    try {
      const res = await fetch("http://localhost:8000/upload-contacts", { method:"PUT", body:fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || `Server error ${res.status}`);
      setContactStatus({ ok:true, msg:d.message });
      setContactFile(null);
    } catch (e) {
      setContactStatus({ ok:false, msg:e.message });
    } finally { setContactUploading(false); }
  };

  return (
    <div className="page-scroll" style={{ flex:1, overflowY:"auto", padding:"40px 48px" }}>
      <div style={{ maxWidth:640, margin:"0 auto" }}>
        <div className="section-pill">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Ingest Content
        </div>
        <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, color:"#fff", letterSpacing:"-0.03em", marginBottom:6 }}>
          Knowledge Base
        </h2>
        <p style={{ fontSize:14, color:"rgba(255,255,255,0.6)", marginBottom:32, lineHeight:1.6 }}>
          Add URLs or PDFs to populate your vector store with university content.
        </p>

        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <div className="card" style={{ padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"rgba(184,74,26,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffb899" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:"#fff" }}>Web URLs</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>One URL per line</div>
              </div>
            </div>
            <textarea value={uploadUrls} onChange={e => setUploadUrls(e.target.value)}
              placeholder={"https://manipal.edu/muj\nhttps://another-page.io"}
              rows={4}
              className="muj-input"
              style={{ width:"100%", borderRadius:12, fontSize:13.5, padding:"12px 16px", outline:"none", resize:"vertical", lineHeight:1.6, fontFamily:"'DM Sans', sans-serif" }} />
          </div>

          <div className="card" style={{ padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"rgba(184,74,26,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffb899" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:"#fff" }}>PDF Files</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>Drag & drop or click to browse</div>
              </div>
            </div>
            <div className="upload-zone" onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setUploadFiles(p => [...p, ...[...e.dataTransfer.files].filter(f => f.type==="application/pdf")]); }}>
              <div style={{ width:48, height:48, borderRadius:14, background:"rgba(184,74,26,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffb899" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div style={{ fontSize:14, color:"rgba(255,255,255,0.6)", textAlign:"center" }}>Drop PDFs here or <span style={{ color:"#ffb899", fontWeight:500 }}>browse files</span></div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Supports multiple PDF files</div>
              <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display:"none" }} onChange={e => setUploadFiles(p => [...p, ...[...e.target.files]])} />
            </div>
            {uploadFiles.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:14 }}>
                {uploadFiles.map((f, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(184,74,26,0.2)", border:"1px solid rgba(184,74,26,0.3)", borderRadius:10, padding:"6px 12px", fontSize:12.5, color:"#ffb899" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {f.name.length > 26 ? f.name.slice(0,23)+"…" : f.name}
                    <span onClick={() => setUploadFiles(p => p.filter((_,j) => j!==i))} style={{ cursor:"pointer", color:"rgba(255,184,153,0.5)", marginLeft:2 }}>✕</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploadStatus && (
            <div style={{ padding:"14px 18px", borderRadius:14, fontSize:13.5, lineHeight:1.55, background:uploadStatus.ok?"rgba(22,163,74,0.12)":"rgba(185,28,28,0.12)", border:`1px solid ${uploadStatus.ok?"rgba(22,163,74,0.3)":"rgba(185,28,28,0.3)"}`, color:uploadStatus.ok?"#86efac":"#fca5a5" }}>
              {uploadStatus.ok?"✓ ":"✗ "}{uploadStatus.msg}
            </div>
          )}

          <button className="btn-primary" onClick={handleUpload}
            disabled={uploading || (!uploadUrls.trim() && !uploadFiles.length)}
            style={{ width:"100%", padding:"14px", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:10, borderRadius:14 }}>
            {uploading ? <><div className="spinner" />Ingesting content…</> : <>Upload to Knowledge Base</>}
          </button>

          <div style={{ marginTop:12, borderTop:"1.5px dashed rgba(255,255,255,0.1)", paddingTop:28 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"rgba(22,163,74,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:"#fff" }}>Faculty Contact Sheet</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>Phone, email & cabin answers come directly from this</div>
              </div>
              <div style={{ marginLeft:"auto" }}>
                <span style={{ fontSize:10.5, fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase", background:"rgba(22,163,74,0.15)", color:"#86efac", border:"1px solid rgba(22,163,74,0.25)", borderRadius:100, padding:"3px 10px" }}>Priority Source</span>
              </div>
            </div>

            <div className="upload-zone" onClick={() => contactRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = [...e.dataTransfer.files].find(f => f.name.endsWith(".xlsx")); if (f) setContactFile(f); }}
              style={{ padding:"24px 20px", borderColor: contactFile ? "var(--rust)" : undefined, background: contactFile ? "rgba(184,74,26,0.12)" : undefined }}>
              <div style={{ width:40, height:40, borderRadius:12, background:"rgba(22,163,74,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
              </div>
              {contactFile ? (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:13.5, fontWeight:600, color:"#ffb899" }}>{contactFile.name}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:3 }}>{(contactFile.size / 1024).toFixed(1)} KB · Click to change</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize:13.5, color:"rgba(255,255,255,0.6)", textAlign:"center" }}>Drop <strong style={{ color:"#fff" }}>.xlsx</strong> here or <span style={{ color:"#ffb899", fontWeight:500 }}>browse</span></div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Faculty list spreadsheet</div>
                </>
              )}
              <input ref={contactRef} type="file" accept=".xlsx" style={{ display:"none" }} onChange={e => { if (e.target.files[0]) setContactFile(e.target.files[0]); }} />
            </div>

            {contactStatus && (
              <div style={{ marginTop:10, padding:"12px 16px", borderRadius:12, fontSize:13, lineHeight:1.55, background: contactStatus.ok ? "rgba(22,163,74,0.12)" : "rgba(185,28,28,0.12)", border:`1px solid ${contactStatus.ok ? "rgba(22,163,74,0.3)" : "rgba(185,28,28,0.3)"}`, color: contactStatus.ok ? "#86efac" : "#fca5a5" }}>
                {contactStatus.ok ? "✓ " : "✗ "}{contactStatus.msg}
              </div>
            )}

            <button onClick={handleContactUpload} disabled={contactUploading || !contactFile}
              style={{ marginTop:12, width:"100%", padding:"12px", fontSize:13.5, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", gap:8, background: contactFile && !contactUploading ? "rgba(22,163,74,0.7)" : "rgba(255,255,255,0.06)", color: contactFile && !contactUploading ? "#fff" : "rgba(255,255,255,0.3)", border:`1px solid ${contactFile && !contactUploading ? "rgba(22,163,74,0.5)" : "rgba(255,255,255,0.08)"}`, cursor: contactFile && !contactUploading ? "pointer" : "not-allowed", fontFamily:"'DM Sans', sans-serif", fontWeight:600, transition:"all 0.2s" }}>
              {contactUploading ? <><div className="spinner" />Uploading contacts…</> : <>Save Contact Sheet</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HOME PAGE ───
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
      <div style={{ minHeight: 520, display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px", position: "relative" }}>
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 680 }}>
          <div className="anim-fadein" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 100, padding: "5px 16px", fontSize: 11.5, color: "rgba(255,255,255,0.8)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 28, backdropFilter: "blur(6px)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a7f3d0", boxShadow: "0 0 8px #6ee7b7" }} />
            Established 2011 · Jaipur, Rajasthan
          </div>

          <h1 className="anim-fadeup delay-1" style={{ fontFamily: "'Playfair Display', serif", fontSize: 56, fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 20, textShadow: "0 2px 32px rgba(0,0,0,0.5)" }}>
            Inspired by Life.<br />
            <em style={{ color: "rgba(255,255,255,0.65)", fontWeight: 400 }}>Built for Excellence.</em>
          </h1>

          <p className="anim-fadeup delay-2" style={{ fontSize: 17, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 40px", textShadow: "0 1px 8px rgba(0,0,0,0.3)" }}>
            Manipal University Jaipur — a premier destination for higher education, research, and innovation in India.
          </p>

          <div className="anim-fadeup delay-3" style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn-primary" onClick={onChat}
              style={{ background: "#fff", color: "var(--rust)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: 10, padding: "14px 28px", fontSize: 14, borderRadius: 14 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Ask AI Assistant
            </button>
            <button style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 14, padding: "13px 24px", fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, backdropFilter: "blur(6px)", transition: "all 0.2s" }}>
              Explore Programs
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding:"40px 48px", background:"rgba(0,0,0,0.25)", backdropFilter:"blur(8px)", borderTop:"1px solid rgba(255,255,255,0.06)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div className="stats-grid" style={{ maxWidth:900, margin:"0 auto" }}>
          {STATS.map((s, i) => (
            <div key={i} className="stat-card anim-fadein" style={{ animationDelay:`${i*0.1}s` }}>
              <div style={{ fontSize:28, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:26, fontWeight:700, color:"#ffb899", letterSpacing:"-0.02em" }}>{s.value}</div>
              <div style={{ fontSize:12.5, color:"rgba(255,255,255,0.55)", fontWeight:500, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Schools */}
      <div style={{ padding:"48px 48px 60px" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <div className="section-pill">Academic Schools</div>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, color:"#fff", letterSpacing:"-0.03em", marginBottom:8 }}>30+ Schools & Departments</h2>
          <p style={{ fontSize:14, color:"rgba(255,255,255,0.55)", marginBottom:32, lineHeight:1.65 }}>World-class education across disciplines, designed to shape tomorrow's leaders.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:14 }}>
            {SCHOOLS.map((s, i) => (
              <div key={i} className="card" style={{ padding:"18px 20px", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"rgba(184,74,26,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:"#ffb899" }} />
                </div>
                <div style={{ fontSize:13, fontWeight:500, color:"rgba(255,255,255,0.85)", lineHeight:1.4 }}>{s}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:48, background:"rgba(184,74,26,0.15)", backdropFilter:"blur(12px)", border:"1.5px solid rgba(184,74,26,0.25)", borderRadius:24, padding:"36px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:24, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:22, fontWeight:700, color:"#fff", letterSpacing:"-0.02em", marginBottom:8 }}>Have questions?</div>
              <div style={{ fontSize:14, color:"rgba(255,255,255,0.6)", lineHeight:1.6, maxWidth:400 }}>
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

// ─── ROOT APP ───
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

      {/* ── FULL-PAGE BACKGROUND ── */}
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        backgroundImage: `url(${MUJ_BG})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }} />
      {/* Dark overlay over entire page */}
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        background: "rgba(14, 4, 0, 0.72)",
      }} />

      {/* ── APP SHELL (above background) ── */}
      <div style={{ height:"100vh", display:"flex", flexDirection:"column", position:"relative", zIndex:2 }}>

        {/* NAV */}
        <nav style={{ height:64, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px", background:"rgba(10,3,0,0.55)", borderBottom:"1px solid rgba(255,255,255,0.08)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", position:"relative", zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:12, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)", overflow:"hidden", flexShrink:0 }}>
              <img src={MUJ_LOGO} alt="MUJ" style={{ width:30, height:30, objectFit:"contain" }} onError={e => { e.target.style.display="none"; }} />
            </div>
            <div>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:16, fontWeight:700, color:"#fff", letterSpacing:"-0.02em", lineHeight:1.2 }}>Manipal University Jaipur</div>
              <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.4)", fontWeight:500, letterSpacing:"0.04em", textTransform:"uppercase" }}>AI Knowledge Portal</div>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            {[["home","Home"],["suburls","Sub URLs"],["upload","Knowledge Base"]].map(([id, label]) => (
              <button key={id} className={`nav-link${tab===id?" active":""}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={() => setGuildModal(true)}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 14px", borderRadius:100, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", fontSize:12.5, color:"rgba(255,255,255,0.7)", cursor:"pointer", transition:"all .15s", fontFamily:"'DM Sans', sans-serif", backdropFilter:"blur(8px)" }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:"#16a34a", boxShadow:"0 0 8px #4ade80" }} />
              <span style={{ fontWeight:500, color:"#fff", maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activeGuild.name}</span>
              <code style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:"rgba(255,255,255,0.35)" }}>{VECTOR_STORE_ID.slice(0,6)}…</code>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
        </nav>

        {/* BODY */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative" }}>
          {tab === "home" && <HomePage onChat={() => setChatOpen(true)} />}
          {tab === "suburls" && <SubUrlsTab key={VECTOR_STORE_ID} guildId={VECTOR_STORE_ID} />}
          {tab === "upload" && <UploadTab key={VECTOR_STORE_ID} guildId={VECTOR_STORE_ID} />}
        </div>

        {showGuildModal && (
          <GuildModal
            guilds={guilds} activeId={activeGuildId}
            onSelect={handleSelectGuild}
            onCreate={handleCreateGuild}
            onDelete={handleDeleteGuild}
            onClose={() => setGuildModal(false)}
          />
        )}

        {/* FAB */}
        <button className="fab-ring" onClick={() => setChatOpen(o => !o)}
          style={{ position:"fixed", bottom:32, right:32, zIndex:300, width:58, height:58, borderRadius:"50%", background:"linear-gradient(145deg, #D05A22, #B84A1A)", border:"none", cursor:"pointer", boxShadow:"0 8px 32px rgba(184,74,26,0.5), 0 2px 8px rgba(0,0,0,0.3)", display:"flex", alignItems:"center", justifyContent:"center", transition:"transform .2s, box-shadow .2s" }}
          onMouseEnter={e => { e.currentTarget.style.transform="scale(1.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}
          aria-label={chatOpen ? "Close chat" : "Open chat"}>
          <div style={{ position:"absolute", top:-4, right:-4, width:20, height:20, borderRadius:"50%", background:"#fff", border:"2px solid var(--rust)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8.5, fontWeight:700, color:"var(--rust)", fontFamily:"'DM Mono', monospace" }}>AI</div>
          {chatOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          )}
        </button>

        <FloatingChatPanel isOpen={chatOpen} guildId={VECTOR_STORE_ID} />
      </div>
    </>
  );
}