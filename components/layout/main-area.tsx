export function MainArea({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={`relative flex-1 overflow-hidden ${className}`}>
      <div className="absolute inset-0 overflow-auto pl-[max(0px,env(safe-area-inset-left))] pr-[max(0px,env(safe-area-inset-right))] pb-[max(0px,env(safe-area-inset-bottom))]">
        <div className="relative h-full min-h-full">{children}</div>
      </div>
    </main>
  );
}
