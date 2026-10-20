import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="no-print mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            <ChevronLeft className="size-4" aria-hidden />
            {back.label}
          </Link>
        ) : null}
        <h1 className="font-display text-3xl leading-tight font-medium tracking-tight md:text-4xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-prose text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="no-print flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
