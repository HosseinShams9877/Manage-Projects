import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: ReactNode;
  noPadding?: boolean;
}

export function Card({
  className = "",
  title,
  description,
  actions,
  noPadding,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface shadow-sm ${className}`}
      {...props}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
          <div>
            {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
            {description && <p className="text-sm text-foreground-muted mt-1">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-4"}>{children}</div>
    </div>
  );
}
