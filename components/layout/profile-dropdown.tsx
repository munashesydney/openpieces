"use client";

import { useState, useRef, useEffect } from "react";
import { User, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/basic/buttons/button";

export function ProfileDropdown() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!session?.user?.email) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-transparent text-[var(--muted)] transition-all hover:border-[var(--border)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
        aria-label="Profile"
      >
        <User className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded border border-[var(--border)] bg-[var(--sidebar-bg)] p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div className="mb-2.5 border-b border-[var(--border)] pb-2.5 px-1">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]/60">Signed in as</p>
            <p className="mt-1 truncate text-[13px] font-medium text-[var(--foreground)]">
              {session.user.email}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
          >
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </Button>
        </div>
      )}
    </div>
  );
}