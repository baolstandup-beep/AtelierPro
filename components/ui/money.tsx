import { formatFCFA } from "@/lib/format";
import { cn } from "./cn";

export function Money({ value, className, signed }: { value: number | null | undefined; className?: string; signed?: boolean }) {
  const n = Number(value ?? 0);
  return (
    <span className={cn("tabular whitespace-nowrap", signed && n < 0 && "text-danger", className)}>
      {signed && n > 0 ? "+" : ""}
      {formatFCFA(n)}
    </span>
  );
}
