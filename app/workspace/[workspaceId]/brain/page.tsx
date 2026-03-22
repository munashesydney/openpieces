import { Brain } from "lucide-react";

export default function BrainPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Brain className="h-16 w-16 text-[var(--muted)]" />
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">Brain</h1>
      <p className="text-[var(--muted)]">To be designed...</p>
    </div>
  );
}
