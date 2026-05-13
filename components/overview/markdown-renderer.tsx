"use client";

import React, { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";
import { Check, Copy, FileText } from "lucide-react";

// ── Inline code copy helper ──

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-white/40 transition-colors hover:text-white/70"
      aria-label="Copy code"
    >
      {copied ? (
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

// ── Components ──

const components: Components = {
  // ── Code blocks ──
  code({ className, children, ...props }) {
    const isBlock = className?.startsWith("language-");
    const lang = className?.replace("language-", "") ?? "";
    const codeString = String(children).replace(/\n$/, "");

    if (isBlock) {
      return (
        <div className="group relative my-4 overflow-hidden rounded-lg border border-[var(--border)] bg-[#0d1117]">
          {/* Header bar */}
          <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-white/30" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-white/30">
                {lang || "code"}
              </span>
            </div>
            <CopyButton text={codeString} />
          </div>
          <pre className="overflow-x-auto p-4 text-[13px] leading-[1.6]">
            <code className="font-mono text-white/80">{codeString}</code>
          </pre>
        </div>
      );
    }

    return (
      <code
        className="rounded-md border border-[var(--border)] bg-[var(--sidebar-bg)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--accent)]"
        {...props}
      >
        {children}
      </code>
    );
  },

  // ── Headings ──
  h1({ children }) {
    return (
      <h1 className="mb-3 mt-6 text-xl font-bold text-[var(--foreground)]">
        {children}
      </h1>
    );
  },
  h2({ children }) {
    return (
      <h2 className="mb-2.5 mt-5 text-lg font-semibold text-[var(--foreground)]">
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return (
      <h3 className="mb-2 mt-4 text-base font-semibold text-[var(--foreground)]">
        {children}
      </h3>
    );
  },
  h4({ children }) {
    return (
      <h4 className="mb-1.5 mt-3.5 text-[15px] font-semibold text-[var(--foreground)]">
        {children}
      </h4>
    );
  },
  h5({ children }) {
    return (
      <h5 className="mb-1 mt-3 text-[14px] font-semibold text-[var(--muted)]">
        {children}
      </h5>
    );
  },
  h6({ children }) {
    return (
      <h6 className="mb-1 mt-3 text-[13px] font-semibold text-[var(--muted)]">
        {children}
      </h6>
    );
  },

  // ── Paragraphs ──
  p({ children }) {
    return (
      <p className="mb-3 last:mb-0 leading-[1.7] whitespace-pre-wrap">
        {children}
      </p>
    );
  },

  // ── Lists ──
  ul({ children, ...props }) {
    const isTaskList = (props as { className?: string })?.className?.includes("contains-task-list");
    return (
      <ul
        className={`my-2 pl-5 ${isTaskList ? "list-none pl-0" : "list-disc"}`}
      >
        {children}
      </ul>
    );
  },
  ol({ children }) {
    return (
      <ol className="my-2 list-decimal pl-5">{children}</ol>
    );
  },
  li({ children, ...props }) {
    const isTaskItem = (props as { className?: string })?.className?.includes("task-list-item");
    if (isTaskItem) {
      return (
        <li className="flex items-start gap-2 my-1 text-[15px] leading-[1.6]">
          {children}
        </li>
      );
    }
    return (
      <li className="my-0.5 text-[15px] leading-[1.6] [&>p]:mb-0">
        {children}
      </li>
    );
  },

  // ── Task list checkbox ──
  input({ ...props }) {
    return (
      <input
        type="checkbox"
        readOnly
        checked={(props as { checked?: boolean })?.checked ?? false}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-[var(--border)] bg-transparent accent-[var(--accent)]"
      />
    );
  },

  // ── Links ──
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--accent)] underline decoration-[var(--accent)]/30 underline-offset-2 transition-colors hover:decoration-[var(--accent)]/60"
      >
        {children}
      </a>
    );
  },

  // ── Blockquotes ──
  blockquote({ children }) {
    return (
      <blockquote className="my-3 border-l-3 border-[var(--accent)]/40 bg-[var(--sidebar-bg)] pl-4 py-1 pr-2 rounded-r-md text-[15px] text-[var(--muted)] italic">
        {children}
      </blockquote>
    );
  },

  // ── Horizontal rules ──
  hr() {
    return <hr className="my-5 border-t border-[var(--border)]" />;
  },

  // ── Images ──
  img({ src, alt }) {
    return (
      <img
        src={src}
        alt={alt ?? ""}
        className="my-3 max-w-full rounded-lg border border-[var(--border)]"
        loading="lazy"
      />
    );
  },

  // ── Tables ──
  table({ children }) {
    return (
      <div className="my-4 overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full border-collapse text-[14px] leading-[1.6]">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }) {
    return (
      <thead className="border-b border-[var(--border)] bg-[var(--sidebar-bg)]">
        {children}
      </thead>
    );
  },
  tbody({ children }) {
    return <tbody>{children}</tbody>;
  },
  th({ children }) {
    return (
      <th className="border-r border-[var(--border)] px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--foreground)] last:border-r-0">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border-r border-[var(--border)] px-3 py-2 text-[var(--foreground)] last:border-r-0 [&_code]:text-[13px]">
        {children}
      </td>
    );
  },
  tr({ children }) {
    return (
      <tr className="border-b border-[var(--border)] last:border-b-0 even:bg-[var(--hover-bg)]/30">
        {children}
      </tr>
    );
  },

  // ── Inline formatting ──
  strong({ children }) {
    return <strong className="font-semibold text-[var(--foreground)]">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
  del({ children }) {
    return <del className="line-through text-[var(--muted)]">{children}</del>;
  },

  // ── Definition lists (some models output these) ──
  dl({ children }) {
    return <dl className="my-2 space-y-1">{children}</dl>;
  },
  dt({ children }) {
    return <dt className="font-semibold text-[var(--foreground)]">{children}</dt>;
  },
  dd({ children }) {
    return <dd className="ml-4 text-[var(--muted)]">{children}</dd>;
  },
};

// ── Main export ──

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={components}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
    >
      {content}
    </ReactMarkdown>
  );
}
