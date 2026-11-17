import { forwardRef, type SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, options, children, className = "", id, ...props }, ref) => {
    const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-charcoal mb-1.5"
          >
            {label}
            {props.required && <span className="text-coral ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm text-charcoal transition-colors focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral disabled:bg-ivory-dark/40 disabled:cursor-not-allowed cursor-pointer ${
            error
              ? "border-status-error focus:ring-status-error/20 focus:border-status-error"
              : "border-warm-border hover:border-slate-text/40"
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="mt-1 text-xs text-status-error font-medium">{error}</p>}
        {!error && helperText && (
          <p className="mt-1 text-xs text-slate-text">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
