"use client";

import Link from "next/link";
import { Ghost, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import { GithubLink } from "@/components/basic/github-link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#040114] px-6 relative">


      {/* Brand logo */}
      <div className="absolute top-8 left-8 flex items-center gap-2.5">
        <img
          src="/op-not-moving.png"
          alt="OpenPieces"
          className="h-7 w-7 rounded object-cover"
        />
        <span className="text-sm font-semibold text-white">
          openpieces
        </span>
      </div>

      {/* GitHub Link */}
      <div className="absolute top-8 right-8">
        <GithubLink />
      </div>

      <div className="relative flex flex-col items-center justify-center text-center z-10">
        {/* Ghost Icon */}
        <div className="relative mb-8 flex h-28 w-28 items-center justify-center rounded border border-white/10 bg-[#09041d] shadow-[0_0_60px_rgba(124,58,237,0.1)]">
          <Ghost className="h-14 w-14 animate-bounce text-violet-400" />
          <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded bg-[#040114] border border-white/10">
             <span className="text-[10px] font-bold text-[var(--muted)]">404</span>
          </div>
        </div>

        {/* Content */}
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-white">
          Whoops!
        </h1>
        <p className="mb-8 max-w-[400px] text-base text-white/50">
          Looks like you wandered into the digital void. This page doesn&apos;t exist, or you don&apos;t have access to it. 
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
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
        <p className="mt-16 text-xs text-white/25 italic">
           &quot;If a router falls in the forest and nobody requests it, does it make a sound?&quot;
        </p>
      </div>
    </div>
  );
}
