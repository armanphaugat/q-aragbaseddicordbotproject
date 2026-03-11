import { useState, useRef, useEffect } from "react";

const VECTOR_STORE_ID = "1476466974098985067";

const SYSTEM_PROMPT = `You are Nexus, an intelligent RAG-powered assistant for a knowledge base (vector store ID: ${VECTOR_STORE_ID}).
Answer questions based on uploaded documents. Be concise, accurate, and helpful.
If context is unavailable, say so clearly. Use markdown when it adds clarity.`;

const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { background: #0f1117; font-family: 'Geist', sans-serif; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
  textarea { font-family: 'Geist', sans-serif; }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
  @keyframes spin { to { transform: rotate(360deg); } }

  .msg-enter { animation: fadeSlideUp 0.28s cubic-bezier(0.16,1,0.3,1) both; }

  .send-btn:not(:disabled):hover {
    background: rgba(255,255,255,0.12) !important;
    border-color: rgba(255,255,255,0.2) !important;
  }
  .send-btn:not(:disabled):active { transform: scale(0.96); }

  .tab-pill:hover { background: rgba(255,255,255,0.06) !important; }
  .tab-pill.active {
    background: rgba(255,255,255,0.09) !important;
    color: #fff !important;
    border-color: rgba(255,255,255,0.12) !important;
  }

  .input-wrap:focus-within {
    border-color: rgba(255,255,255,0.18) !important;
    box-shadow: 0 0 0 3px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.5) !important;
  }

  .file-chip:hover .remove-x { opacity: 1 !important; }

  .upload-btn:not(:disabled):hover {
    background: rgba(255,255,255,0.1) !important;
    border-color: rgba(255,255,255,0.18) !important;
  }

  .drop-zone:hover {
    border-color: rgba(255,255,255,0.2) !important;
    background: rgba(255,255,255,0.03) !important;
  }

  .suggestion-chip:hover {
    background: rgba(255,255,255,0.08) !important;
    border-color: rgba(255,255,255,0.14) !important;
    color: rgba(255,255,255,0.75) !important;
  }

  code { font-family: 'Geist Mono', monospace !important; }
`;
document.head.appendChild(style);

// ── Markdown renderer ──────────────────────────────────────────────
function Markdown({ text }) {
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      elements.push(
        <pre key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 16px", overflowX: "auto", marginTop: 10, marginBottom: 10 }}>
          <code style={{ fontSize: 12.5, color: "#e2e8f0", lineHeight: 1.7 }}>{codeLines.join("\n")}</code>
        </pre>
      );
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginTop: 14, marginBottom: 4 }}>{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginTop: 16, marginBottom: 6 }}>{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginTop: 18, marginBottom: 8 }}>{line.slice(2)}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 3, paddingLeft: 2 }}>
          <span style={{ color: "rgba(255,255,255,0.3)", marginTop: 2, flexShrink: 0 }}>•</span>
          <span>{inlineFormat(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)[1];
      elements.push(
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 3 }}>
          <span style={{ color: "rgba(255,255,255,0.3)", minWidth: 18, flexShrink: 0 }}>{num}.</span>
          <span>{inlineFormat(line.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 8 }} />);
    } else {
      elements.push(<p key={i} style={{ lineHeight: 1.72, marginBottom: 2 }}>{inlineFormat(line)}</p>);
    }
    i++;
  }
  return <div>{elements}</div>;
}

function inlineFormat(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{ color: "#fff", fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} style={{ background: "rgba(255,255,255,0.07)", color: "#a5f3fc", padding: "1px 6px", borderRadius: 5, fontSize: "0.88em" }}>{p.slice(1, -1)}</code>;
    if (p.startsWith("*") && p.endsWith("*")) return <em key={i} style={{ color: "rgba(255,255,255,0.75)" }}>{p.slice(1, -1)}</em>;
    return p;
  });
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.3)",
          animation: `blink 1.2s ease ${i * 0.2}s infinite`
        }} />
      ))}
    </div>
  );
}

const SUGGESTIONS = [
  "What topics are in the knowledge base?",
  "Summarize uploaded documents",
  "What can you help me with?",
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("chat");
  const [uploadUrls, setUploadUrls] = useState("");
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const send = async (q) => {
    const question = (q || input).trim();
    if (!question || loading) return;
    const userMsg = { role: "user", content: question, id: Date.now() };
    const newHistory = [...history, { role: "user", content: question }];
    setMessages(p => [...p, userMsg]);
    setHistory(newHistory);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);
    try {
      let text = "";

      // Try RAG backend first
      try {
        const ragRes = await fetch("http://localhost:8000/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, server: VECTOR_STORE_ID })
        });
        if (ragRes.ok) {
          const ragData = await ragRes.json();
          if (ragData.answer) text = ragData.answer;
        }
      } catch (_) {
        // Backend offline — fall through to Anthropic
      }

      // Fallback to Anthropic API
      if (!text) {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            system: SYSTEM_PROMPT,
            messages: newHistory,
            tools: [{ type: "web_search_20250305", name: "web_search" }]
          })
        });
        if (!res.ok) {
          let errDetail = "";
          try { const errData = await res.json(); errDetail = errData?.error?.message || JSON.stringify(errData); } catch(_) { errDetail = `HTTP ${res.status}`; }
          throw new Error(`API error ${res.status}: ${errDetail}`);
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
        text = data.content.map(b => b.type === "text" ? b.text : "").filter(Boolean).join("\n").trim();
        if (!text) throw new Error("No response text returned from API.");
      }
      const aMsg = { role: "assistant", content: text, id: Date.now() + 1 };
      setMessages(p => [...p, aMsg]);
      setHistory(p => [...p, { role: "assistant", content: text }]);
    } catch (e) {
      setMessages(p => [...p, {
        role: "assistant",
        content: e.message,
        id: Date.now() + 1,
        error: true
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleUpload = async () => {
    if (!uploadUrls.trim() && !uploadFiles.length) return;
    setUploading(true); setUploadStatus(null);
    const fd = new FormData();
    fd.append("guild_id", VECTOR_STORE_ID);
    if (uploadUrls.trim()) fd.append("urls", uploadUrls.trim());
    uploadFiles.forEach(f => fd.append("files", f));
    try {
      const res = await fetch("http://localhost:8000/upload", { method: "PUT", body: fd });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const d = await res.json();
      setUploadStatus({ ok: true, msg: `${d.message} — ${d.urls_processed} URL(s), ${d.pdfs_processed} PDF(s)` });
      setUploadUrls(""); setUploadFiles([]);
    } catch (e) {
      setUploadStatus({ ok: false, msg: e.message });
    } finally { setUploading(false); }
  };

  const empty = messages.length === 0;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0f1117", color: "rgba(255,255,255,0.82)" }}>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 58, flexShrink: 0,
        background: "rgba(17,19,28,0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "linear-gradient(145deg, #ffffff 0%, #b8b8b8 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Instrument Serif', serif", fontSize: 17, color: "#111",
            fontStyle: "italic", boxShadow: "0 2px 12px rgba(0,0,0,0.5), 0 1px 2px rgba(255,255,255,0.1)"
          }}>N</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}>Nexus</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: -1, letterSpacing: "0.01em" }}>Always on. Always sharp.</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 3 }}>
          {[["chat", "Chat"], ["upload", "Upload"]].map(([id, label]) => (
            <button key={id} className={`tab-pill${tab === id ? " active" : ""}`} onClick={() => setTab(id)}
              style={{
                padding: "5px 18px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
                background: "transparent", border: "1px solid transparent",
                color: tab === id ? "#fff" : "rgba(255,255,255,0.38)",
                cursor: "pointer", transition: "all 0.15s", letterSpacing: "-0.01em"
              }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 7, padding: "5px 12px",
          borderRadius: 20, background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          fontSize: 11, color: "rgba(255,255,255,0.28)"
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
          <span style={{ fontFamily: "'Geist Mono'", fontSize: 10.5 }}>{VECTOR_STORE_ID.slice(0, 8)}…</span>
        </div>
      </div>

      {/* Body */}
      {tab === "chat" ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 0 8px" }}>
            <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px" }}>

              {empty && (
                <div style={{ textAlign: "center", paddingTop: "11vh", animation: "fadeSlideUp 0.5s both" }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: 18, margin: "0 auto 22px",
                    background: "linear-gradient(145deg, #ffffff 0%, #b8b8b8 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Instrument Serif', serif", fontSize: 30, color: "#111",
                    fontStyle: "italic", boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 1px 2px rgba(255,255,255,0.12)"
                  }}>N</div>
                  <h2 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.04em", marginBottom: 10 }}>
                    Answers on everything.<br/>Anytime. Zero fluff.
                  </h2>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.32)", maxWidth: 340, margin: "0 auto 32px", lineHeight: 1.65 }}>
                    Your knowledge base, distilled into one sharp reply.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} className="suggestion-chip" onClick={() => send(s)}
                        style={{
                          padding: "8px 16px", borderRadius: 20, fontSize: 13,
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
                          color: "rgba(255,255,255,0.55)", cursor: "pointer", transition: "all 0.15s",
                          letterSpacing: "-0.01em"
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className="msg-enter"
                  style={{ marginBottom: 28, display: "flex", gap: 14, alignItems: "flex-start", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>

                  {msg.role === "assistant" && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: "linear-gradient(145deg, #f0f0f0, #aaaaaa)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Instrument Serif', serif", fontSize: 14, color: "#111", fontStyle: "italic",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.5)", marginTop: 1
                    }}>N</div>
                  )}

                  <div style={{
                    maxWidth: "78%",
                    ...(msg.role === "user" ? {
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      borderRadius: "16px 4px 16px 16px",
                      padding: "11px 16px",
                      fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.65
                    } : msg.error ? {
                      background: "rgba(252,100,100,0.07)",
                      border: "1px solid rgba(252,100,100,0.2)",
                      borderRadius: "4px 16px 16px 16px",
                      padding: "11px 16px",
                      fontSize: 13, color: "#fca5a5", lineHeight: 1.65,
                      fontFamily: "'Geist Mono', monospace"
                    } : {
                      fontSize: 14, color: "rgba(255,255,255,0.76)", lineHeight: 1.72
                    })
                  }}>
                    {msg.role === "assistant" && !msg.error ? <Markdown text={msg.content} /> : msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="msg-enter" style={{ marginBottom: 28, display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: "linear-gradient(145deg, #f0f0f0, #aaaaaa)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Instrument Serif', serif", fontSize: 14, color: "#111", fontStyle: "italic"
                  }}>N</div>
                  <div style={{ paddingTop: 6 }}><TypingDots /></div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div style={{ padding: "12px 24px 22px", flexShrink: 0 }}>
            <div style={{ maxWidth: 700, margin: "0 auto" }}>
              <div className="input-wrap" style={{
                display: "flex", alignItems: "flex-end", gap: 10,
                background: "rgba(255,255,255,0.045)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16, padding: "10px 10px 10px 18px",
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxShadow: "0 2px 24px rgba(0,0,0,0.35)"
              }}>
                <textarea
                  ref={el => { textareaRef.current = el; inputRef.current = el; }}
                  value={input}
                  onChange={e => { setInput(e.target.value); autoResize(); }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Ask anything…"
                  rows={1}
                  disabled={loading}
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none",
                    color: "rgba(255,255,255,0.88)", fontSize: 14, lineHeight: 1.6,
                    resize: "none", minHeight: 24, maxHeight: 160, overflowY: "auto", padding: 0
                  }}
                />
                <button className="send-btn" onClick={() => send()} disabled={loading || !input.trim()}
                  style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: input.trim() && !loading ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${input.trim() && !loading ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"}`,
                    color: input.trim() && !loading ? "#fff" : "rgba(255,255,255,0.2)",
                    cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s"
                  }}>
                  {loading
                    ? <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.12)", borderTopColor: "rgba(255,255,255,0.55)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  }
                </button>
              </div>
              <p style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.15)", letterSpacing: "0.01em" }}>
                Shift+Enter for new line · Enter to send
              </p>
            </div>
          </div>
        </div>

      ) : (
        /* Upload tab */
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
          <div style={{ maxWidth: 580, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

            <div style={{ marginBottom: 6 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fff", letterSpacing: "-0.03em" }}>Ingest content</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.32)", marginTop: 5, lineHeight: 1.5 }}>
                Add URLs or PDFs to vector store{" "}
                <code style={{ fontFamily: "'Geist Mono'", fontSize: 11, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)", padding: "1px 6px", borderRadius: 4 }}>
                  {VECTOR_STORE_ID}
                </code>
              </p>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                Web URLs
              </label>
              <textarea
                value={uploadUrls}
                onChange={e => setUploadUrls(e.target.value)}
                placeholder={"https://docs.example.com\nhttps://another-source.io/page"}
                rows={4}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
                  color: "rgba(255,255,255,0.8)", fontSize: 13.5, padding: "10px 14px",
                  outline: "none", resize: "vertical", lineHeight: 1.6, transition: "border-color 0.15s"
                }}
              />
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                PDF Files
              </label>
              <div className="drop-zone" onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setUploadFiles(p => [...p, ...[...e.dataTransfer.files].filter(f => f.type === "application/pdf")]); }}
                style={{
                  border: "1.5px dashed rgba(255,255,255,0.09)", borderRadius: 10, padding: "28px 20px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  cursor: "pointer", transition: "all 0.15s", color: "rgba(255,255,255,0.28)", fontSize: 13
                }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>Drop PDFs here or <span style={{ color: "rgba(255,255,255,0.5)" }}>click to browse</span></span>
                <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: "none" }}
                  onChange={e => setUploadFiles(p => [...p, ...[...e.target.files]])} />
              </div>
              {uploadFiles.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {uploadFiles.map((f, i) => (
                    <div key={i} className="file-chip" style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                      borderRadius: 8, padding: "5px 10px", fontSize: 12, color: "rgba(255,255,255,0.55)"
                    }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      {f.name.length > 28 ? f.name.slice(0, 25) + "…" : f.name}
                      <span className="remove-x" onClick={() => setUploadFiles(p => p.filter((_, j) => j !== i))}
                        style={{ cursor: "pointer", color: "rgba(255,100,100,0.5)", opacity: 0, transition: "opacity 0.15s", marginLeft: 2, lineHeight: 1 }}>✕</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {uploadStatus && (
              <div style={{
                padding: "11px 16px", borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                background: uploadStatus.ok ? "rgba(74,222,128,0.06)" : "rgba(252,165,165,0.06)",
                border: `1px solid ${uploadStatus.ok ? "rgba(74,222,128,0.18)" : "rgba(252,165,165,0.18)"}`,
                color: uploadStatus.ok ? "#86efac" : "#fca5a5"
              }}>
                {uploadStatus.ok ? "✓ " : "✗ "}{uploadStatus.msg}
              </div>
            )}

            <button className="upload-btn" onClick={handleUpload}
              disabled={uploading || (!uploadUrls.trim() && !uploadFiles.length)}
              style={{
                width: "100%", padding: "13px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 11, color: "rgba(255,255,255,0.75)",
                fontSize: 13.5, fontWeight: 500, letterSpacing: "-0.01em",
                cursor: uploading || (!uploadUrls.trim() && !uploadFiles.length) ? "not-allowed" : "pointer",
                opacity: uploading || (!uploadUrls.trim() && !uploadFiles.length) ? 0.4 : 1,
                transition: "all 0.15s", fontFamily: "'Geist', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}>
              {uploading
                ? <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "rgba(255,255,255,0.6)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Ingesting…</>
                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Upload to Knowledge Base</>
              }
            </button>

          </div>
        </div>
      )}
    </div>
  );
}