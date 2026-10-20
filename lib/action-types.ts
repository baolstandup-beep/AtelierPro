// Types partagés client / serveur pour les résultats d'actions.
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const initialState: ActionResult<never> = { ok: true };

/** Signature commune des actions serveur utilisées avec useActionState. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormAction = (prev: any, formData: FormData) => Promise<ActionResult<any>>;
