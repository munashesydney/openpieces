"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconComponent = React.ComponentType<{
  className?: string;
}>;

type SecondaryButtonProps = {
  label: string;
  icon?: IconComponent;
  iconPosition?: "left" | "right";
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function SecondaryButton({
  label,
  icon: Icon,
  iconPosition = "left",
  className = "",
  ...props
}: SecondaryButtonProps) {
  const content: ReactNode = (
    <>
      {Icon && iconPosition === "left" && (
        <Icon className="h-3.5 w-3.5" />
      )}
      <span>{label}</span>
      {Icon && iconPosition === "right" && (
        <Icon className="h-3.5 w-3.5" />
      )}
    </>
  );

  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--hover-bg)] ${className}`}
      {...props}
    >
      {content}
    </button>
  );
}

