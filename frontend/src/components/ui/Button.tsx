import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "aubergine";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses: Record<ButtonSize, string> = {
      sm: "px-3 py-1.5 text-xs font-medium gap-1.5 rounded-md",
      md: "px-4 py-2 text-sm font-medium gap-2 rounded-lg",
      lg: "px-5 py-2.5 text-base font-semibold gap-2.5 rounded-lg",
    };

    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        "bg-coral text-white hover:bg-coral-hover active:bg-coral-dark shadow-sm focus-visible:ring-2 focus-visible:ring-coral/40",
      secondary:
        "bg-mint-light text-mint-dark hover:bg-mint/40 active:bg-mint/60 focus-visible:ring-2 focus-visible:ring-mint-dark/40",
      outline:
        "border border-warm-border bg-white text-charcoal hover:bg-ivory hover:border-slate-text/40 active:bg-ivory-dark focus-visible:ring-2 focus-visible:ring-aubergine/20",
      ghost:
        "bg-transparent text-charcoal hover:bg-ivory-dark/60 active:bg-ivory-dark focus-visible:ring-2 focus-visible:ring-aubergine/20",
      destructive:
        "bg-status-error text-white hover:bg-red-700 active:bg-red-800 shadow-sm focus-visible:ring-2 focus-visible:ring-status-error/40",
      aubergine:
        "bg-aubergine text-white hover:bg-aubergine-light active:bg-aubergine-dark shadow-sm focus-visible:ring-2 focus-visible:ring-aubergine/40",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none focus-visible:outline-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {!isLoading && leftIcon}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
