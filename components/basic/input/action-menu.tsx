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
}

export function ActionMenu({ options, onSelect, className = "" }: ActionMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="sr-only">Open options</span>
        <MoreVertical className="h-5 w-5" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-48 origin-top-right overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)] shadow-lg animate-in fade-in zoom-in-95 duration-100">
          <div className="py-0 flex flex-col" role="menu" aria-orientation="vertical">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(option.value);
                }}
                className={`flex w-full items-center px-4 py-2 text-sm transition-colors hover:bg-[var(--hover-bg)] ${
                  option.destructive ? "text-red-500 hover:text-red-600" : "text-[var(--foreground)]"
                }`}
                role="menuitem"
              >
                {option.icon && <span className="mr-2 h-4 w-4">{option.icon}</span>}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
