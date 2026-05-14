"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "../basic/buttons/button";
import { createPortal } from "react-dom";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Sheet({ isOpen, onClose, title, description, children, footer }: SheetProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
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
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-[480px] border-l border-[var(--border)] bg-[var(--sidebar-bg)] shadow-[0_0_60px_rgba(124,58,237,0.06)] dark:shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out ${
          isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
            <div>
              {title && <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>}
              {description && <p className="mt-0.5 text-[13px] text-[var(--muted)]">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-[var(--border)] px-5 py-3.5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
