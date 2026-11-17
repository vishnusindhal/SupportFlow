import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isPassword?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      isPassword = false,
      type = "text",
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-charcoal mb-1.5"
          >
            {label}
            {props.required && <span className="text-coral ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-text pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm text-charcoal placeholder:text-slate-text/50 transition-colors focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral disabled:bg-ivory-dark/40 disabled:cursor-not-allowed ${
              leftIcon ? "pl-9" : ""
            } ${rightIcon || isPassword ? "pr-10" : ""} ${
              error ? "border-status-error focus:ring-status-error/20 focus:border-status-error" : "border-warm-border hover:border-slate-text/40"
            } ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 text-slate-text hover:text-charcoal transition-colors cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          {!isPassword && rightIcon && (
            <div className="absolute right-3 text-slate-text pointer-events-none flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-status-error font-medium">{error}</p>}
        {!error && helperText && (
          <p className="mt-1 text-xs text-slate-text">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
