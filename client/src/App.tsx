import { useState, useRef, useEffect } from "react";
import "./App.css";
const baseURL = import.meta.env.VITE_BASE_URL || 'http://localhost:5001';

type Role = "user" | "assistant";

interface Message {
  role: Role;
  content: string;
  timestamp: Date;
}

const BACKEND_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5001";

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setError(null);
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="chat-app">
      <header className="chat-header">
        <div className="header-title">
          <span className="header-dot" />
          <h1>AI Chat</h1>
        </div>
        {messages.length > 0 && (
          <button className="clear-btn" onClick={clearChat} title="New chat">
            New Chat
          </button>
        )}
      </header>

      <main className="chat-body">
        {messages.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <p>Start a conversation below.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.role}`}>
            <div className="bubble">
              <p>{msg.content}</p>
              <span className="timestamp">{formatTime(msg.timestamp)}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-row assistant">
            <div className="bubble typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <div ref={bottomRef} />
      </main>

      <footer className="chat-footer">
        <div className="input-row">
          <textarea
            ref={textareaRef}
            className="chat-input"
            rows={1}
            placeholder="Message AI Chat… (Enter to send, Shift+Enter for newline)"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            aria-label="Send"
          >
            ↑
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
