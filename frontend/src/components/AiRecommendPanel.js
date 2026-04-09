import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../context/AuthContext';

const confColor = (c) => ({
  high:   { border: '#16a34a', bg: '#dcfce7', text: '#16a34a' },
  medium: { border: '#f59e0b', bg: '#fef9c3', text: '#b45309' },
  low:    { border: '#94a3b8', bg: '#f1f5f9', text: '#64748b' },
}[c] || { border: '#94a3b8', bg: '#f1f5f9', text: '#64748b' });

export default function AiRecommendPanel({ pool }) {
  const [aiRecs, setAiRecs]         = useState(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiError, setAiError]       = useState('');

  // Chat state
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  const getRecommendations = async () => {
    setAiLoading(true);
    setAiError('');
    setAiRecs(null);
    setMessages([]);
    try {
      const res = await axios.post(`${API_BASE}/ai/recommend`, { pool });
      setAiRecs(res.data.recommendations);
      // Seed the chat with the recommendation context so follow-ups work
      setMessages([{
        role: 'assistant',
        content: `I've analysed all ${pool.reduce((s, p) => s + p.nominees.length, 0)} nominees across ${pool.length} categories. Ask me anything — why I chose someone, how two candidates compare, or whether a different person might be better suited.`,
      }]);
    } catch (err) {
      setAiError(err.response?.data?.message || 'AI recommendation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;

    const userMsg = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setChatLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/ai/chat`, {
        pool,
        recommendations: aiRecs,
        messages: updatedMessages,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: '⚠️ ' + (err.response?.data?.message || 'Failed to get a response. Try again.'),
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const hasNominees = pool.some((p) => p.nominees.length > 0);

  return (
    <div>
      {/* Recommend button */}
      {hasNominees && (
        <button
          className="btn btn-sm"
          style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '6px 14px' }}
          onClick={getRecommendations}
          disabled={aiLoading}
        >
          {aiLoading ? '⏳ Analysing…' : '✨ AI Recommend'}
        </button>
      )}

      {aiError && <div className="alert alert-error" style={{ marginTop: 12 }}>{aiError}</div>}

      {/* Recommendation cards */}
      {aiRecs && (
        <div style={{ background: '#f5f3ff', border: '2px solid #7c3aed', borderRadius: 12, padding: 16, marginTop: 16, marginBottom: 20 }}>
          <p style={{ fontWeight: 700, color: '#6d28d9', margin: '0 0 12px', fontSize: 15 }}>✨ AI Recommendations</p>

          {aiRecs.map((rec, i) => {
            const col = confColor(rec.confidence);
            return (
              <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '14px 16px', marginBottom: 10, borderLeft: `4px solid ${col.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{rec.category}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: col.bg, color: col.text, textTransform: 'uppercase' }}>
                    {rec.confidence} confidence
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 8 }}>→ {rec.recommended}</div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, background: '#f8fafc', borderRadius: 6, padding: '8px 12px' }}>
                  {rec.reason}
                </div>
                {rec.comparison && (
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                    <strong style={{ color: '#374151' }}>vs others: </strong>{rec.comparison}
                  </div>
                )}
              </div>
            );
          })}

          <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 16px' }}>
            AI suggestions are advisory only. Use your judgement to make final selections.
          </p>

          {/* ── Chat ── */}
          <div style={{ borderTop: '2px solid #ddd6fe', paddingTop: 14 }}>
            <p style={{ fontWeight: 700, color: '#6d28d9', fontSize: 13, margin: '0 0 10px' }}>
              💬 Ask the AI
            </p>

            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ddd6fe', maxHeight: 300, overflowY: 'auto', padding: '10px 12px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.role === 'user' ? '#7c3aed' : '#f1f5f9',
                  color: msg.role === 'user' ? '#fff' : '#1e293b',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '8px 12px',
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: 'flex-start', background: '#f1f5f9', borderRadius: '12px 12px 12px 2px', padding: '8px 14px', fontSize: 13, color: '#64748b' }}>
                  ⏳ Thinking…
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. Why not Alice? How does Bob compare to Carol?"
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd6fe', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={chatLoading || !input.trim()}
                style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
