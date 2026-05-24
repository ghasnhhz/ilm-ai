"use client";

import type { ChatMessage } from "@/types/api";
import { SourceCitation } from "@/components/source-citation";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
            isUser
              ? "bg-brand text-brand-fg"
              : "border border-slate-200 bg-white text-slate-800"
          }`}
        >
          {message.content || "…"}
        </div>
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <SourceCitation key={`${c.material_id}-${c.chunk_index}-${i}`} citation={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
