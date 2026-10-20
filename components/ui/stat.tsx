import Link from "next/link";
import { cn } from "./cn";

export function Stat({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  tone?: "warning" | "danger";
}) {
  const body = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular tracking-tight",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </>
  );
  const cls = "block rounded-[var(--radius-panel)] border border-sand bg-paper p-4";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-sand-strong")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
