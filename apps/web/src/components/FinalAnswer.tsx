"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

export default function FinalAnswer({
  text,
  streaming,
}: {
  text: string;
  streaming: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950/30 via-[var(--bg-card)] to-[var(--bg-card)] p-5 shadow-2xl shadow-black/30"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30">
          <Sparkles className="h-4 w-4 text-emerald-300" />
        </div>
        <div className="leading-tight">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-emerald-300/90">
            Aarogya Atlas
          </div>
          <div className="text-[10.5px] text-zinc-500">
            Claude Opus 4.7 · adaptive thinking · 11 tools
          </div>
        </div>
        {streaming && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-cyan-300/80">
            <span className="dot-pulse" />
            streaming
          </span>
        )}
      </div>

      <div
        className={cn(
          "max-w-none text-[14px] leading-relaxed text-zinc-100",
          "[&>h2]:mt-4 [&>h2]:mb-2 [&>h2]:text-[15px] [&>h2]:font-semibold [&>h2]:tracking-tight",
          "[&>h2]:flex [&>h2]:items-center [&>h2]:gap-1.5",
          "[&>h3]:mt-3 [&>h3]:mb-1.5 [&>h3]:text-[13px] [&>h3]:font-semibold [&>h3]:text-zinc-300 [&>h3]:uppercase [&>h3]:tracking-wider",
          "[&>p]:mb-2.5",
          "[&>ul]:my-2 [&>ul]:space-y-1.5 [&>ul]:list-none [&>ul]:pl-0",
          "[&>ul>li]:relative [&>ul>li]:pl-4 [&>ul>li]:text-[13.5px] [&>ul>li]:text-zinc-200",
          "[&>ul>li:before]:content-['•'] [&>ul>li:before]:absolute [&>ul>li:before]:left-1 [&>ul>li:before]:text-cyan-400 [&>ul>li:before]:font-bold",
          "[&>ol]:my-2 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-1",
          "[&>ol>li]:text-[13.5px] [&>ol>li]:text-zinc-200 [&>ol>li]:pl-1",
          "[&_strong]:text-zinc-50 [&_strong]:font-semibold",
          "[&_em]:italic [&_em]:text-zinc-400",
          "[&_code]:rounded [&_code]:bg-zinc-800/80 [&_code]:px-1.5 [&_code]:py-0.5",
          "[&_code]:font-mono [&_code]:text-[12px] [&_code]:text-cyan-300",
          "[&_a]:text-cyan-400 [&_a]:underline [&_a]:underline-offset-2",
          "[&_table]:my-3 [&_table]:w-full [&_table]:text-[12.5px] [&_table]:border-collapse",
          "[&_thead]:bg-zinc-900/50",
          "[&_th]:border [&_th]:border-zinc-800 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-zinc-300",
          "[&_td]:border [&_td]:border-zinc-800/70 [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:text-zinc-200 [&_td]:align-top",
          "[&_hr]:my-3 [&_hr]:border-zinc-800",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-cyan-700 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-zinc-400"
        )}
      >
        {text ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        ) : (
          <span className="caret text-zinc-500">Composing answer</span>
        )}
      </div>
    </motion.div>
  );
}
