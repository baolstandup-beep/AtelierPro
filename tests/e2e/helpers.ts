import { expect, type Page } from "@playwright/test";

export const ADMIN = { email: process.env.E2E_ADMIN_EMAIL ?? "aicha@elegance.test", password: process.env.E2E_ADMIN_PASSWORD ?? "" };

export async function login(page: Page, email: string, password: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/connexion/, { timeout: 15_000 });
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

export function uid() {
  return Math.random().toString(36).slice(2, 8);
}

/** Lit un montant « 12 500 FCFA » affiché → 12500. */
export function amountOf(text: string | null): number {
  return Number((text ?? "").replace(/[^\d-]/g, ""));
}
