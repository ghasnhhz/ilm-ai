"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { ApiError, apiFetch } from "@/lib/api";
import type {
  ChatMessage,
  ChatSession,
  HistoryResponse,
  MessageResponse,
} from "@/types/api";
import { ChatWindow } from "@/components/chat-window";

export default function ChatPage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!token) return;
    setSessions(await apiFetch<ChatSession[]>("/chat/sessions", { token }));
  }, [token]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const openSession = useCallback(
    async (id: string) => {
      if (!token) return;
      setActiveId(id);
      setError(null);
      const data = await apiFetch<HistoryResponse>(`/chat/history/${id}`, { token });
      setMessages(data.messages);
    },
    [token],
  );

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setError(null);
  }

  async function send(text: string) {
    if (!token) return;
    setSending(true);
    setError(null);
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      citations: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await apiFetch<MessageResponse>("/chat/message", {
        token,
        method: "POST",
        body: { message: text, session_id: activeId },
      });
      setMessages((prev) => [...prev, res.message]);
      if (!activeId) {
        setActiveId(res.session_id);
        await loadSessions();
      }
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError(
        e instanceof ApiError && e.status === 503
          ? "The AI companion is not configured yet (missing API key)."
          : "Something went wrong. Please try again.",
      );
    }
    setSending(false);
  }

  if (status === "loading") {
    return <p className="p-6 text-slate-500">Loading…</p>;
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 py-8 sm:max-w-3xl">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Companion</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/library" className="text-slate-500 hover:text-brand">
            Library
          </Link>
          <button onClick={newChat} className="text-slate-500 hover:text-brand">
            New chat
          </button>
        </div>
      </header>

      {sessions.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => openSession(s.id)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                activeId === s.id
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-slate-200 text-slate-600 hover:border-brand"
              }`}
            >
              {s.title || "Untitled"}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        <ChatWindow messages={messages} sending={sending} onSend={send} />
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </main>
  );
}
