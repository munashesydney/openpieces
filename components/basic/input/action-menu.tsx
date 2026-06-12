"use client";

import * as React from "react";
import { MoreVertical } from "lucide-react";

export interface ActionMenuOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
  destructive?: boolean;
}

export interface ActionMenuProps {
  options: ActionMenuOption[];
  onSelect: (value: string) => void;
  className?: string;
  triggerClassName?: string;
}

export function ActionMenu({
  options,
  onSelect,
  className = "",
  triggerClassName = "",
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onSelect(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      className={`relative inline-block text-left ${className}`}
      ref={containerRef}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex h-7 w-7 items-center justify-center rounded border border-transparent text-[var(--muted)] transition-all hover:border-[var(--border)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${triggerClassName}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="sr-only">Open options</span>
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-44 origin-top-right overflow-hidden rounded border border-[var(--border)] bg-[var(--sidebar-bg)] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div
            className="py-0 flex flex-col"
            role="menu"
            aria-orientation="vertical"
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(option.value);
                }}
                className={`flex w-full items-center px-3 py-2 text-[13px] transition-all hover:bg-[var(--hover-bg)] ${
                  option.destructive
                    ? "text-red-500 hover:text-red-400"
                    : "text-[var(--foreground)]"
                }`}
                role="menuitem"
              >
                {option.icon && (
                  <span className="mr-2 h-4 w-4">{option.icon}</span>
                )}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
