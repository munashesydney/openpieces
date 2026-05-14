"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 rounded font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary: "bg-[var(--accent)] text-white shadow-sm hover:opacity-90",
      secondary: "bg-[var(--hover-bg)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--hover-bg-strong)]",
      ghost: "text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]",
      danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
      outline: "bg-transparent border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--hover-bg)]",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
      icon: "h-9 w-9",
    };

    const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={combinedClassName}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!isLoading && children}
      </button>
    );
  }
);

Button.displayName = "Button";
