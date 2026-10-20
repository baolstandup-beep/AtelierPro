import { cn } from "./cn";

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="-mx-px overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}
export function Th({ className, align, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: "right" | "center" }) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-sand bg-ivory/60 px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  );
}
export function Td({ className, align, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: "right" | "center" }) {
  return (
    <td
      className={cn(
        "border-b border-sand/70 px-4 py-3 align-middle",
        align === "right" && "text-right tabular whitespace-nowrap",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  );
}
export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-ivory/50", className)} {...props} />;
}
