"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "../basic/buttons/button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClassName?: string;
  danger?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClassName = "max-w-2xl",
  danger = false,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"
          } backdrop-blur-sm`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
      >
        <div
          className={`w-full ${maxWidthClassName} rounded border border-[var(--border)] bg-[var(--sidebar-bg)] shadow-[0_20px_60px_rgba(0,0,0,0.35),0_0_40px_rgba(124,58,237,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition-all duration-200 ease-out ${isOpen ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0"
            }`}
          role="dialog"
          aria-modal="true"
          aria-label={title || "Modal"}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-3.5">
            <div className="pr-4">
              {title && (
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  {title}
                </h2>
              )}
              {description && <p className="mt-0.5 text-[13px] text-[var(--muted)]">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>

          {footer && <div className="border-t border-[var(--border)] px-5 py-3.5">{footer}</div>}
        </div>
      </div>
    </>,
    document.body
  );
}
