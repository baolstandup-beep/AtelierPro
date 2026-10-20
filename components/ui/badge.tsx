import { cn } from "./cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "gold" | "dark";
const tones: Record<Tone, string> = {
  neutral: "bg-sand/70 text-ink-soft",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  gold: "bg-gold/20 text-gold-deep",
  dark: "bg-ink text-ivory",
};

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}

export function StockBadge({ status, qty }: { status: string; qty: number }) {
  if (status === "out") return <Badge tone="danger">Rupture</Badge>;
  if (status === "low") return <Badge tone="warning">Stock faible · {qty}</Badge>;
  return <Badge tone="success">{qty} en stock</Badge>;
}
