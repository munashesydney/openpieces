import { ReactNode, HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = "", hoverable = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] shadow-sm transition-all ${
          hoverable ? "hover:bg-[var(--hover-bg)]" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

const CardHeader = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`flex flex-col space-y-1.5 p-8 pb-4 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <h3 className={`text-xl font-semibold leading-none tracking-tight text-[var(--foreground)] ${className}`}>
    {children}
  </h3>
);

const CardDescription = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <p className={`text-sm text-[var(--muted)] ${className}`}>{children}</p>
);

const CardContent = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`p-8 pt-4 ${className}`}>{children}</div>
);

const CardFooter = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`flex items-center p-8 pt-0 ${className}`}>{children}</div>
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
