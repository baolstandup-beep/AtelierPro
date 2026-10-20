import { cn } from "./cn";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("rounded-[var(--radius-panel)] border border-sand bg-paper", className)} {...props} />;
}

export function PanelHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sand px-5 py-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
