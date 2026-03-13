"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconComponent = React.ComponentType<{
  className?: string;
}>;

type PrimaryButtonProps = {
  label: string;
  icon?: IconComponent;
  iconPosition?: "left" | "right";
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({
  label,
  icon: Icon,
  iconPosition = "left",
  className = "",
  ...props
}: PrimaryButtonProps) {
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
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 ${className}`}
      {...props}
    >
      {content}
    </button>
  );
}

