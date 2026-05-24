"use client";

import { useEffect, useRef, useState } from "react";

import type { ChatMessage } from "@/types/api";
import { MessageBubble } from "@/components/message-bubble";

export function ChatWindow({
  messages,
  sending,
  onSend,
}: {
  messages: ChatMessage[];
  sending: boolean;
  onSend: (text: string) => void | Promise<void>;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function submit() {
    const value = text.trim();
    if (!value || sending) return;
    setText("");
    void onSend(value);
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border border-slate-200">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-slate-400">
            Ask anything about your uploaded materials.
          </p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {sending && (
          <p className="text-sm text-slate-400">Ilm is thinking…</p>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 border-t border-slate-200 p-3">
        <textarea
          className="max-h-32 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          rows={1}
          placeholder="Type your question…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          onClick={submit}
          disabled={sending || !text.trim()}
          className="shrink-0 self-end rounded-lg bg-brand px-4 py-2.5 font-semibold text-brand-fg disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </div>
  );
}
