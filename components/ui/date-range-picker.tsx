"use client";

import React, { useState, useRef, useEffect } from "react";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className = "",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local state for the inputs inside the popover
  const [tempStart, setTempStart] = useState<string | null>(startDate);
  const [tempEnd, setTempEnd] = useState<string | null>(endDate);

  // Sync temp state when props change (if updated from outside)
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset temp state to actual applied state when closed without saving
        setTempStart(startDate);
        setTempEnd(endDate);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [startDate, endDate]);

  const handleApply = () => {
    onStartDateChange(tempStart);
    onEndDateChange(tempEnd);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    onStartDateChange(null);
    onEndDateChange(null);
    setIsOpen(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    // Add timezone offset to prevent picking the wrong day
    const adjustedDate = new Date(date.getTime() + Math.abs(date.getTimezoneOffset() * 60000));
    return adjustedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const displayString = 
    startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}`
    : startDate ? `After ${formatDate(startDate)}`
    : endDate ? `Before ${formatDate(endDate)}`
    : "Filter by Date";

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-left text-[13px] font-medium transition-all hover:bg-[var(--hover-bg)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 ${
          isOpen ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/50" : ""
        }`}
      >
        <CalendarIcon className="h-4 w-4 text-[var(--muted)]" />
        <span className={`${startDate || endDate ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
          {displayString}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--muted)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--sidebar-bg)] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div className="space-y-4">
            <h4 className="text-[13px] font-semibold text-[var(--foreground)]">Custom Range</h4>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--muted)]">Start Date</label>
                <div className="relative flex items-center">
                  <input
                    type="date"
                    value={tempStart || ""}
                    onChange={(e) => setTempStart(e.target.value || null)}
                    className="h-9 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--muted)]">End Date</label>
                <div className="relative flex items-center">
                  <input
                    type="date"
                    value={tempEnd || ""}
                    onChange={(e) => setTempEnd(e.target.value || null)}
                    min={tempStart || undefined}
                    className="h-9 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs">
                Clear
              </Button>
              <Button size="sm" onClick={handleApply} className="text-xs">
                Apply Range
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
