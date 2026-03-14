"use client";

import Link from "next/link";
import { Ghost, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import { GithubLink } from "@/components/basic/github-link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--background)] px-6 font-Inter relative">
      {/* Brand logo */}
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)] to-purple-900">
          <span className="text-lg font-bold text-white">O</span>
        </div>
        <span className="text-xl font-semibold text-[var(--foreground)]">
          OpenPieces
        </span>
      </div>

      {/* GitHub Link */}
      <div className="absolute top-8 right-8">
        <GithubLink />
      </div>

      <div className="relative flex flex-col items-center justify-center text-center">
        {/* Background Glow */}
        <div className="absolute top-1/2 -z-10 h-64 w-64 -translate-y-1/2 rounded-full bg-[var(--accent)]/10 blur-[100px]" />

        {/* Animated Ghost Icon */}
        <div className="relative mb-8 flex h-32 w-32 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
          <Ghost className="h-16 w-16 animate-bounce text-[var(--accent)]" />
          <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--background)] border border-[var(--border)]">
             <span className="text-xs font-bold text-[var(--muted)]">404</span>
          </div>
        </div>

        {/* Content */}
        <h1 className="mb-4 text-6xl font-black tracking-tight text-[var(--foreground)]">
          Whoops!
        </h1>
        <p className="mb-8 max-w-[400px] text-lg text-[var(--muted)]">
          Looks like you wandered into the digital void. This page doesn't exist, or you don't have access to it. 
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-4 sm:flex-row">
           <Link href="/">
            <Button size="lg" className="w-full sm:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Take Me Home
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
        
        {/* Funny Footer Text */}
        <p className="mt-16 text-sm text-[var(--muted)]/50 italic">
           "If a router falls in the forest and nobody requests it, does it make a sound?"
        </p>
      </div>
    </div>
  );
}
