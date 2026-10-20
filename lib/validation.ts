import { z } from "zod";
import { parseAmount } from "@/lib/format";

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const optionalText = (max = 500) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, `${max} caractères maximum.`).optional());

export const requiredText = (label: string, max = 200) =>
  z.string({ error: `${label} est obligatoire.` }).trim().min(1, `${label} est obligatoire.`).max(max, `${max} caractères maximum.`);

/** Montant FCFA entier positif ou nul (« 12 500 » accepté). */
export const amount = (label = "Le montant") =>
  z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : parseAmount(v) ?? Number.NaN),
    z
      .number({ error: `${label} est obligatoire.` })
      .refine((n) => Number.isInteger(n), `${label} doit être un nombre entier de FCFA.`)
      .refine((n) => n >= 0, `${label} ne peut pas être négatif.`)
      .refine((n) => n <= 1_000_000_000, `${label} est trop élevé.`),
  );

export const positiveAmount = (label = "Le montant") => amount(label).refine((n) => n > 0, `${label} doit être supérieur à zéro.`);

export const optionalAmount = (label = "Le montant") => z.preprocess(emptyToUndefined, amount(label).optional());

export const integer = (label: string, min = 0) =>
  z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number({ error: `${label} est obligatoire.` }).int(`${label} doit être un entier.`).min(min, `${label} doit être ≥ ${min}.`),
  );

export const optionalInteger = (label: string, min = 0) => z.preprocess(emptyToUndefined, integer(label, min).optional());

export const uuid = (label = "Identifiant") => z.uuid({ error: `${label} invalide.` });
export const optionalUuid = () => z.preprocess(emptyToUndefined, z.uuid().optional());

export const phone = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s.-]/g, ""))
    .refine((v) => /^\+?\d{7,15}$/.test(v), "Numéro de téléphone invalide.")
    .optional(),
);

export const email = z.preprocess(emptyToUndefined, z.email("Adresse e-mail invalide.").optional());

export const paymentMethod = z.enum(["cash", "wave", "orange_money", "bank_transfer", "store_credit"], {
  error: "Moyen de paiement invalide.",
});

export function formToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") obj[k] = v;
  return obj;
}
