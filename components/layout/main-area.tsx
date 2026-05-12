export function MainArea({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex-1 overflow-hidden dot-grid">
      <div className="absolute inset-0 overflow-auto pl-[max(0px,env(safe-area-inset-left))] pr-[max(0px,env(safe-area-inset-right))] pb-[max(0px,env(safe-area-inset-bottom))]">
        <div className="h-full min-h-full">{children}</div>
      </div>
    </main>
  );
}
