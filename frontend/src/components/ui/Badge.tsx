import type { ReactNode } from "react";

export type BadgeVariant =
  | "mint"
  | "coral"
  | "lavender"
  | "aubergine"
  | "amber"
  | "red"
  | "neutral";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  withDot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = "neutral",
  withDot = false,
  className = "",
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, { bg: string; dot: string }> = {
    mint: {
      bg: "bg-mint-light text-mint-dark border-mint/40",
      dot: "bg-mint-dark",
    },
    coral: {
      bg: "bg-coral-light text-coral-dark border-coral/30",
      dot: "bg-coral",
    },
    lavender: {
      bg: "bg-lavender-light text-lavender-dark border-lavender/50",
      dot: "bg-lavender-dark",
    },
    aubergine: {
      bg: "bg-aubergine-light/10 text-aubergine border-aubergine/20",
      dot: "bg-aubergine",
    },
    amber: {
      bg: "bg-amber-50 text-amber-800 border-amber-200",
      dot: "bg-amber-500",
    },
    red: {
      bg: "bg-red-50 text-red-700 border-red-200",
      dot: "bg-red-500",
    },
    neutral: {
      bg: "bg-ivory-dark/60 text-slate-text border-warm-border",
      dot: "bg-slate-text",
    },
  };

  const current = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.bg} ${className}`}
    >
      {withDot && <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />}
      {children}
    </span>
  );
}
