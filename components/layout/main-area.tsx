export function MainArea({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex-1 overflow-hidden dot-grid">
      <div className="absolute inset-0 overflow-auto">
        <div className="min-h-full">{children}</div>
      </div>
    </main>
  );
}
