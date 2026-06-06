"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";

import { ApiError, apiFetch } from "@/lib/api";
import type {
  ChatMessage,
  ChatSession,
  HistoryResponse,
  MessageResponse,
} from "@/types/api";
import { ChatWindow } from "@/components/chat-window";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

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
        timeoutMs: 90_000, // RAG retrieval + LLM answer can run long
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
    return <Loading />;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Companion</h1>
        <Button variant="secondary" size="sm" onClick={newChat}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New chat
        </Button>
      </div>

      {sessions.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => openSession(s.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeId === s.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-hairline text-muted-fg hover:border-primary",
              )}
            >
              {s.title || "Untitled"}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        <ChatWindow messages={messages} sending={sending} onSend={send} />
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
