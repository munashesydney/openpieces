"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption {
  label: string;
  value: string;
}

export interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Applied only to the trigger button (not menu options). */
  triggerClassName?: string;
  error?: string;
}

export function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  triggerClassName = "",
  error,
}: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

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
    onChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`w-full space-y-1.5 font-Inter ${className}`} ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-left text-sm transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] hover:bg-[var(--hover-bg)] ${
            isOpen ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : ""
          } ${triggerClassName}`}
        >
          <span className={`whitespace-nowrap truncate ${selectedOption ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-[var(--muted)] transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 min-w-full w-max max-w-[250px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-xl animate-in fade-in zoom-in-95 duration-150 right-0">
            <div className="max-h-60 overflow-y-auto p-1.5">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-[var(--hover-bg)] ${
                    option.value === value ? "bg-[var(--hover-bg)] text-[var(--accent)]" : "text-[var(--foreground)]"
                  }`}
                >
                  <span className="whitespace-nowrap">{option.label}</span>
                  {option.value === value && <Check className="h-4 w-4 shrink-0 ml-4" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}
