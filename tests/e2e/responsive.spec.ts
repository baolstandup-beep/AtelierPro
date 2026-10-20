import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./helpers";

async function noHorizontalScroll(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test("page de connexion utilisable sur téléphone", async ({ page }) => {
  await page.goto("/connexion");
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  await noHorizontalScroll(page);
});

test("navigation mobile, caisse et listes sans débordement", async ({ page }) => {
  test.skip(!ADMIN.password, "E2E_ADMIN_PASSWORD non défini");
  await login(page, ADMIN.email, ADMIN.password);
  for (const path of ["/tableau-de-bord", "/caisse", "/produits", "/ventes", "/rapports"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await noHorizontalScroll(page);
  }
  await expect(page.getByRole("navigation", { name: "Navigation rapide" })).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Dépenses" })).toBeVisible();
});
