import type { ReactNode } from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`p-10 text-center flex flex-col items-center justify-center rounded-xl border border-dashed border-warm-border bg-ivory-light/40 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-ivory flex items-center justify-center text-slate-text mb-4 border border-warm-border shadow-xs">
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-charcoal tracking-tight mb-1">{title}</h4>
      <p className="text-sm text-slate-text max-w-md leading-relaxed mb-6">{description}</p>
      <div className="flex items-center gap-3">
        {onSecondaryAction && secondaryActionLabel && (
          <Button variant="outline" size="sm" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
        {onAction && actionLabel && (
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
