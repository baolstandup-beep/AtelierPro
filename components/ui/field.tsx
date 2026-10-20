import { cn } from "./cn";

export const controlClass =
  "w-full rounded-[var(--radius-control)] border border-sand-strong bg-paper px-3 text-sm text-ink placeholder:text-muted/70 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 disabled:bg-ivory disabled:text-muted aria-[invalid=true]:border-danger";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-gold-deep"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, invalid, ...props }: React.ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
      className={cn(controlClass, "h-10", className)}
      {...props}
    />
  );
}

export function Textarea({ className, invalid, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea aria-invalid={invalid || undefined} className={cn(controlClass, "min-h-20 py-2", className)} {...props} />;
}

export function Select({ className, invalid, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select aria-invalid={invalid || undefined} className={cn(controlClass, "h-10 pr-8", className)} {...props} />;
}

export function Checkbox({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm", className)}>
      <input type="checkbox" className="size-4 rounded border-sand-strong accent-ink" {...props} />
      <span>{label}</span>
    </label>
  );
}
