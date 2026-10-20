import Link from "next/link";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-ivory hover:bg-ink-soft disabled:bg-ink/40",
  secondary: "bg-paper text-ink border border-sand-strong hover:bg-ivory disabled:text-muted",
  ghost: "text-ink hover:bg-sand/60 disabled:text-muted",
  danger: "bg-danger text-paper hover:bg-danger/90 disabled:bg-danger/40",
  gold: "bg-gold text-ink hover:bg-gold/85 disabled:bg-gold/40",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center rounded-[var(--radius-control)] font-medium transition-colors disabled:cursor-not-allowed [&_svg]:size-4",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
