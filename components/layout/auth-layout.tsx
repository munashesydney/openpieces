"use client";

import { ReactNode } from "react";
import { ThemeToggle } from "../theme-toggle";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left — Brand Panel */}
      <div className="relative hidden w-1/2 lg:flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a0533] via-[#0d001a] to-[#1a0533] p-12">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--accent-glow)_0%,_transparent_60%)] opacity-30 animate-pulse" />

        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-[var(--accent)] opacity-[0.08] blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-56 w-56 rounded-full bg-purple-400 opacity-[0.06] blur-[80px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-8 flex items-center justify-center">
            <img
              src="/op-not-moving.png"
              alt="OpenPieces"
              className="h-28 w-28 object-contain drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]"
            />
          </div>

          <h1 className="mb-3 text-4xl font-bold tracking-tight text-white">
            openpieces
          </h1>

          <p className="max-w-sm text-base leading-relaxed text-purple-200/70">
            Your open-source AI orchestration platform. Build, deploy, and scale
            intelligent workflows with ease.
          </p>
        </div>

        {/* Footer */}
        <p className="absolute bottom-8 z-10 text-xs text-purple-300/40">
          © {new Date().getFullYear()} OpenPieces
        </p>
      </div>

      {/* Right — Form Panel */}
      <div className="relative flex w-full flex-col items-center justify-center bg-[var(--background)] px-6 lg:w-1/2">
        {/* Theme toggle */}
        <div className="absolute right-6 top-6 z-10">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              {title}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
