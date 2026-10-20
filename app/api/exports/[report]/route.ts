import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { isReportKey, loadReport } from "@/lib/reports";
import { resolvePeriod } from "@/lib/periods";
import { toCsv } from "@/lib/csv";
import { dbErrorMessage } from "@/lib/errors";

// Export CSV (séparateur « ; », UTF-8 avec BOM : s'ouvre directement dans Excel).
export async function GET(request: NextRequest, ctx: RouteContext<"/api/exports/[report]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (!can(user.permissions, "reports.view")) return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  const { report } = await ctx.params;
  if (!isReportKey(report)) return NextResponse.json({ error: "Rapport inconnu." }, { status: 404 });
  const sp = request.nextUrl.searchParams;
  const period = resolvePeriod({ period: sp.get("period") ?? "month", from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined });
  try {
    const data = await loadReport(report, period);
    const csv = toCsv(
      data.columns.map((c) => c.label),
      data.rows.map((r) => data.columns.map((c) => r[c.key])),
    );
    const suffix = data.usesPeriod ? `_${period.fromDate}_${period.toDate}` : "";
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="elegance_${report}${suffix}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: dbErrorMessage(error) }, { status: 500 });
  }
}
