"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/types/api";
import { SourceCitation } from "@/components/source-citation";

// Markdown element styling kept inline (no typography plugin) so assistant replies
// inherit the design system. rehype-sanitize strips any unsafe HTML the model emits.
const MARKDOWN_CLASS = cn(
  "space-y-2 text-sm leading-relaxed",
  "[&_p]:m-0",
  "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
  "[&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
  "[&_li]:marker:text-muted-fg",
  "[&_a]:font-medium [&_a]:text-primary [&_a]:underline",
  "[&_strong]:font-semibold [&_strong]:text-ink",
  "[&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:font-semibold",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-hairline [&_blockquote]:pl-3 [&_blockquote]:text-muted-fg",
);

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "whitespace-pre-wrap bg-primary text-primary-fg"
              : "border border-hairline bg-surface text-ink",
          )}
        >
          {isUser ? (
            message.content || "…"
          ) : message.content ? (
            <div className={MARKDOWN_CLASS}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            "…"
          )}
        </div>
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <SourceCitation
                key={`${c.material_id}-${c.chunk_index}-${i}`}
                citation={c}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
