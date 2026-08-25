import { useEffect, useRef, useState } from 'react';
import { Bot, Send, X, Wrench, Sparkles } from 'lucide-react';
import { api } from '../api/client';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
}

const SUGGESTIONS = [
  'Give me a fleet overview',
  'Any fuel anomalies this week?',
  'Show pending jobs',
  'Which generators are available?',
];

export default function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && aiOnline === null) {
      api<{ available: boolean }>('/v1/assistant/status')
        .then(s => setAiOnline(s.available))
        .catch(() => setAiOnline(false));
    }
  }, [open, aiOnline]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const nextMessages: ChatMsg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setBusy(true);
    try {
      const res = await api<{ reply: string; actions?: { summary: string }[] }>('/v1/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      setMessages([...nextMessages, {
        role: 'assistant',
        content: res.reply,
        actions: (res.actions || []).map(a => a.summary),
      }]);
    } catch (err: any) {
      setMessages([...nextMessages, {
        role: 'assistant',
        content: err.message || 'Something went wrong. Is Ollama running?',
      }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#4f46e5] hover:bg-[#4338ca] shadow-lg shadow-indigo-900/30 flex items-center justify-center transition-all hover:scale-105"
          title="Smart Fleet Assistant"
        >
          <Bot className="w-7 h-7 text-white" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[#1e1b4b] px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#4f46e5] flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Fleet Assistant</p>
                <p className={`text-xs ${aiOnline === false ? 'text-red-400' : 'text-emerald-400'}`}>
                  {aiOnline === false ? 'Offline — start Ollama' : aiOnline === null ? 'Checking…' : 'Online · local AI'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Sparkles className="w-8 h-8 text-[#4f46e5] mb-3" />
                <p className="text-sm font-medium text-gray-700">Ask about your fleet or paste raw notes</p>
                <p className="text-xs text-gray-500 mt-1">
                  I can answer questions from live data and save jobs or fuel entries from WhatsApp-style messages.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] bg-[#4f46e5] text-white rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words'
                      : 'max-w-[90%] bg-white border border-gray-200 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm text-gray-800 whitespace-pre-wrap break-words'
                  }
                >
                  {m.content}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                      {m.actions.map((a, j) => (
                        <div key={j} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <Wrench className="w-3 h-3 shrink-0" />
                          <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-2 h-2 bg-[#4f46e5] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {messages.length === 0 && !busy && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 bg-gray-50">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-2.5 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-[#4f46e5] hover:text-[#4f46e5] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white shrink-0">
            <form
              onSubmit={e => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={aiOnline === false ? 'AI offline — run: ollama serve' : 'Ask anything, or paste notes…'}
                disabled={busy}
                className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="shrink-0 w-10 h-10 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Send className="w-4.5 h-4.5 text-white w-5 h-5" />
              </button>
            </form>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">Local AI · data never leaves this laptop</p>
          </div>
        </div>
      )}
    </>
  );
}
