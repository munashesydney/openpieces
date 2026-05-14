"use client";

import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { ThemeToggle } from "../theme-toggle";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  backHref?: string;
  onBack?: () => void;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  backHref,
  onBack,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left — Brand Panel (matches openpieces-website #040114 palette) */}
      <div className="relative hidden w-1/2 lg:flex flex-col items-center justify-center overflow-hidden bg-[#040114] p-12">


        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-8 flex items-center justify-center">
            <img
              src="/op-not-moving.png"
              alt="OpenPieces"
              className="h-24 w-24 object-contain drop-shadow-[0_0_40px_rgba(124,58,237,0.25)]"
            />
          </div>

          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-white">
            openpieces
          </h1>

          <p className="max-w-sm text-sm leading-relaxed text-violet-200/60">
            Your open-source AI orchestration platform. Build, deploy, and scale
            intelligent workflows with ease.
          </p>
        </div>

        {/* Footer */}
        <p className="absolute bottom-8 z-10 text-[10px] text-violet-300/30">
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
          {(backHref || onBack) && (
            <a
              href={backHref}
              onClick={(e) => {
                if (onBack) {
                  e.preventDefault();
                  onBack();
                }
              }}
              className="mb-6 flex items-center gap-1.5 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </a>
          )}
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
