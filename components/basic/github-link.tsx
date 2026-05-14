import Link from "next/link";
import { Github } from "lucide-react";

interface GithubLinkProps {
  href?: string;
  className?: string;
  stars?: string;
}

export function GithubLink({ 
  href = "https://github.com/openpieces/openpieces", 
  className = "",
  stars = "179,001"
}: GithubLinkProps) {
  return (
    <Link 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      aria-label="GitHub Repository"
      className={`group flex items-center overflow-hidden rounded border border-[var(--border)] bg-[var(--sidebar-bg)] text-[13px] font-medium text-[var(--foreground)] transition-all hover:border-[var(--accent)]/20 ${className}`}
    >
      <div className="flex items-center gap-2 border-r border-[var(--border)] bg-[var(--hover-bg)] px-3 py-1.5 transition-colors group-hover:bg-[var(--hover-bg-strong)]">
        <Github className="h-4 w-4" />
        <span>Star</span>
      </div>
      <div className="bg-[var(--card)] px-3 py-1.5 transition-colors group-hover:text-[var(--foreground)] text-[var(--foreground)]/90">
        {stars}
      </div>
    </Link>
  );
}
