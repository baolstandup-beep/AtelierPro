import "server-only";
import { AuthorizationError } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-types";

export type { ActionResult };

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function fromZod(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, error: "Vérifiez les champs signalés.", fieldErrors };
}

/** Convertit toute exception (droits, base, réseau) en résultat affichable. */
export function fromError(error: unknown): ActionResult<never> {
  if (error instanceof AuthorizationError) return fail(error.message);
  return fail(dbErrorMessage(error));
}
