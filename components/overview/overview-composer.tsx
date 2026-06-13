"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Paperclip, Plus, Send, Square, Upload, X } from "lucide-react";
import { ContextProgressRing } from "./context-progress-ring";
import { ModelPicker } from "./model-picker";
import { ModeToggle, type ComposerMode } from "./mode-toggle";
import { Card } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import type { ContextInfo } from "./overview-chat-area";
import type { FileAttachment } from "@/lib/ai-chat/types";
import type { ModelCapabilities } from "@/lib/ai-chat/models";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

type OverviewComposerProps = {
  onSend?: (value: string, attachments?: FileAttachment[]) => void;
  onStop?: () => void;
  onCompact?: () => void;
  disabled?: boolean;
  isSending?: boolean;
  isRunning?: boolean;
  isCompacting?: boolean;
  contextInfo?: ContextInfo | null;
  model?: string | null;
  onModelChange?: (model: string) => void;
  mode?: ComposerMode;
  onModeChange?: (mode: ComposerMode) => void;
  /** Capabilities of the currently selected model, for gating uploads. */
  modelCapabilities?: ModelCapabilities;
};

/** Read a File as a base64 data URL + produce a FileAttachment object. */
function readFileAsAttachment(file: File): Promise<FileAttachment> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(
        new Error(`File "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit.`),
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        mediaType: file.type || "application/octet-stream",
        url: reader.result as string,
        size: file.size,
      });
    };
    reader.onerror = () =>
      reject(new Error(`Failed to read file "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

export function OverviewComposer({
  onSend,
  onStop,
  onCompact,
  disabled = false,
  isSending = false,
  isRunning = false,
  isCompacting = false,
  contextInfo,
  model,
  onModelChange,
  mode: externalMode,
  onModeChange,
  modelCapabilities,
}: OverviewComposerProps) {
  const [internalMode, setInternalMode] = useState<ComposerMode>("agent");
  const mode = externalMode ?? internalMode;
  const setMode = onModeChange ?? setInternalMode;
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const dragCounterRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAttach =
    modelCapabilities && (modelCapabilities.vision || modelCapabilities.files);

  const canCompact =
    contextInfo && contextInfo.percentage >= 50 && onCompact && !isCompacting;

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (
      (!trimmed && attachments.length === 0) ||
      !onSend ||
      disabled ||
      isSending
    )
      return;
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setValue("");
    setAttachments([]);
    setUploadError(null);
  }, [value, attachments, onSend, disabled, isSending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /** Shared file ingestion — used by both the file input and drag-drop. */
  const processFiles = async (files: File[]) => {
    setUploadError(null);
    const newAttachments: FileAttachment[] = [];

    for (const file of files) {
      try {
        const att = await readFileAsAttachment(file);
        newAttachments.push(att);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Failed to add file.",
        );
        break;
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  // ── Drag-and-drop handlers ──
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canAttach || disabled || isSending) return;
      dragCounterRef.current++;
      if (e.dataTransfer.types.includes("Files")) {
        setIsDragOver(true);
      }
    },
    [canAttach, disabled, isSending],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounterRef.current = 0;
      if (!canAttach || disabled || isSending) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
      await processFiles(files);
    },
    [canAttach, disabled, isSending],
  );

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 300);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  // Close image preview on Escape
  useEffect(() => {
    if (!previewImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewImage(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [previewImage]);

  return (
    <div className="flex w-full justify-center px-4 pb-8 pt-8 sm:px-6 sm:pb-14 sm:pt-14">
      <div className="relative w-full max-w-[820px] min-w-0">
        <Card
          className="rounded border border-[var(--border)] bg-[var(--card-bg)] shadow-[0_18px_60px_rgba(0,0,0,0.2)] transition-all duration-300"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            <div className="grid grid-cols-[40px_1fr] items-center gap-x-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[var(--muted)]"
                aria-label="Attach file or image"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canAttach || disabled}
              >
                <Plus className="h-4 w-4" />
              </Button>

              <div className="min-w-0">
                <ModeToggle mode={mode} onChange={setMode} />
              </div>

              <div className="col-span-2 mt-4 min-w-0 px-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={disabled || isSending}
                  placeholder={
                    mode === "agent"
                      ? "What shall we automate today?"
                      : "Ask me anything!"
                  }
                  className="w-full resize-none overflow-y-auto bg-transparent py-1 text-base text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none scrollbar-hide sm:text-lg"
                  style={{ minHeight: "32px" }}
                />
              </div>
            </div>

            {/* Attachment previews */}
            {attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 px-2">
                {attachments.map((att, i) => {
                  const isImage = att.mediaType?.startsWith("image/");
                  return (
                    <div
                      key={`${att.name}-${i}`}
                      className={`group relative flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--hover-bg)] px-3 py-1.5 text-xs ${isImage ? "cursor-pointer hover:bg-[var(--hover-bg-strong)]" : ""}`}
                      onClick={
                        isImage ? () => setPreviewImage(att.url) : undefined
                      }
                    >
                      {isImage ? (
                        <img
                          src={att.url}
                          alt={att.name}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <Paperclip className="h-4 w-4 text-[var(--muted)]" />
                      )}
                      <span className="max-w-[120px] truncate text-[var(--foreground)]">
                        {att.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAttachment(i);
                        }}
                        className="ml-1 rounded p-0.5 text-[var(--muted)] hover:bg-[var(--hover-bg-strong)] hover:text-[var(--foreground)]"
                        aria-label={`Remove ${att.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {uploadError && (
              <p className="mt-2 px-2 text-xs text-red-500">{uploadError}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 gap-y-3 px-3 pb-3 sm:gap-3 sm:px-4 sm:pb-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {/* File upload button — gated by model capabilities */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.txt,.csv,.json,.md,.js,.ts,.tsx,.py,.html,.css"
                onChange={handleFileChange}
                className="hidden"
                aria-hidden
              />
              <Button
                variant="secondary"
                size="icon"
                aria-label="Attach file or image"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canAttach || disabled}
                title={
                  !canAttach
                    ? "Current model does not support file uploads"
                    : "Attach file or image"
                }
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              {contextInfo ? (
                <ContextProgressRing
                  info={contextInfo}
                  onClick={canCompact ? onCompact : undefined}
                  disabled={isCompacting}
                />
              ) : null}

              <ModelPicker
                initialModel={model ?? undefined}
                onModelChange={onModelChange}
              />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isRunning ? (
                <Button size="icon" aria-label="Stop" onClick={onStop}>
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  aria-label="Send"
                  onClick={handleSend}
                  isLoading={isSending}
                  disabled={disabled}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Drag-and-drop overlay */}
          {isDragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded bg-[var(--accent)]/10 border-2 border-dashed border-[var(--accent)]">
              <div className="flex flex-col items-center gap-2 text-[var(--accent)]">
                <Upload className="h-8 w-8" />
                <span className="text-sm font-semibold">Drop files here</span>
              </div>
            </div>
          )}
        </Card>

        {/* Dynamic ambient glow based on mode */}
        <div
          className={`pointer-events-none absolute -inset-x-10 -bottom-10 -top-20 -z-10 transition-opacity duration-1000 ${
            mode === "agent" ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute left-[15%] top-1/4 h-32 w-1/3 rounded-[100%] bg-[var(--accent)] opacity-25 blur-[60px]" />
          <div className="absolute right-[15%] top-1/4 h-32 w-1/3 rounded-[100%] bg-[var(--secondary)] opacity-25 blur-[60px]" />
        </div>
      </div>

      {/* Fullscreen image preview — portal to body so it escapes any parent stacking contexts */}
      {previewImage &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setPreviewImage(null)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors cursor-pointer"
              onClick={() => setPreviewImage(null)}
              aria-label="Close preview"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
