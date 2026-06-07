"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";

import type { ChatMessage } from "@/types/api";
import { MessageBubble } from "@/components/message-bubble";
import { Textarea } from "@/components/ui/input";
import { useT } from "@/lib/i18n";

export function ChatWindow({
  messages,
  sending,
  onSend,
}: {
  messages: ChatMessage[];
  sending: boolean;
  onSend: (text: string) => void | Promise<void>;
}) {
  const { t } = useT();
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
    <div className="flex h-[calc(100vh-16rem)] min-h-[24rem] flex-col rounded-lg border border-hairline bg-surface">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-fg">
            {t("chat.empty")}
          </p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {sending && (
          <p className="flex items-center gap-2 text-sm text-muted-fg">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t("chat.thinking")}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 border-t border-hairline p-3">
        <Textarea
          className="max-h-32 resize-none"
          rows={1}
          placeholder={t("chat.inputPlaceholder")}
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
          aria-label={t("chat.send")}
          className="flex shrink-0 items-center justify-center self-end rounded-md bg-primary px-4 py-2.5 text-primary-fg shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
