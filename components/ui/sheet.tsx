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
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-[480px] border-l border-[var(--border)] bg-[var(--background)] shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <div>
              {title && <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>}
              {description && <p className="text-sm text-[var(--muted)]">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 font-Inter">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-[var(--border)] px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
