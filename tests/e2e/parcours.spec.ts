import { expect, test } from "@playwright/test";
import { ADMIN, amountOf, login, logout, uid } from "./helpers";

// Parcours complet : produit → caisse → vente mixte → ticket → retour →
// clôture → rapports, puis contrôle des droits d'un caissier.
test.describe.serial("parcours boutique", () => {
  const tag = uid();
  const productName = `Parfum Oud ${tag}`;
  const cashier = { email: `fatou.${tag}@elegance.test`, password: `Caisse-${tag}-2026!` };
  let barcode = "";
  let saleUrl = "";

  test.beforeEach(async ({ page }) => {
    test.skip(!ADMIN.password, "E2E_ADMIN_PASSWORD non défini");
    await login(page, ADMIN.email, ADMIN.password);
  });

  test("créer un produit à deux variantes avec stock initial", async ({ page }) => {
    await page.goto("/produits/nouveau");
    await page.getByLabel("Nom du produit").fill(productName);
    await page.getByLabel("Prix de vente (FCFA)").fill("8000");
    await page.getByLabel("Prix d'achat (FCFA)").fill("5000");
    await page.getByLabel("Nom affiché").first().fill("50 ml");
    await page.getByLabel("Stock initial").first().fill("10");
    await page.getByRole("button", { name: "Ajouter une variante" }).click();
    await page.getByLabel("Nom affiché").nth(1).fill("100 ml");
    await page.getByLabel("Prix spécifique (FCFA)").nth(1).fill("14000");
    await page.getByLabel("Stock initial").nth(1).fill("4");
    await page.getByRole("button", { name: "Créer le produit" }).click();
    await expect(page.getByRole("heading", { name: productName })).toBeVisible({ timeout: 15_000 });
    const row = page.locator("table").first().getByRole("row", { name: /50 ml/ });
    await expect(row.getByText("10 en stock")).toBeVisible();
    barcode = ((await row.textContent()) ?? "").match(/200\d{9}/)?.[0] ?? "";
    expect(barcode).toMatch(/^200\d{9}$/);
  });

  test("créer un compte caissier", async ({ page }) => {
    await page.goto("/utilisateurs");
    await page.getByLabel("Nom complet").fill(`Fatou ${tag}`);
    await page.getByLabel("E-mail de connexion").fill(cashier.email);
    await page.getByLabel("Rôle", { exact: true }).selectOption("cashier");
    await page.getByLabel("Mot de passe provisoire").fill(cashier.password);
    await page.getByRole("button", { name: "Créer le compte" }).click();
    await expect(page.getByText(`Fatou ${tag}`).first()).toBeVisible();
  });

  test("ouvrir la caisse, scanner, paiement mixte, ticket", async ({ page }) => {
    await page.goto("/caisse");
    const openBtn = page.getByRole("button", { name: "Ouvrir la caisse" });
    if (await openBtn.isVisible().catch(() => false)) {
      await page.getByLabel("Fond de caisse (FCFA)").fill("10000");
      await openBtn.click();
    }
    const search = page.getByLabel("Scanner ou rechercher un article");
    await expect(search).toBeVisible({ timeout: 15_000 });
    // Lecteur clavier : code + Entrée, deux fois → quantité 2
    await search.fill(barcode);
    await search.press("Enter");
    await expect(page.getByLabel(`Quantité ${productName}`)).toHaveValue("1");
    await search.fill(barcode);
    await search.press("Enter");
    await expect(page.getByLabel(`Quantité ${productName}`)).toHaveValue("2");
    await expect(page.getByRole("button", { name: /Encaisser 16\s000/ })).toBeVisible();

    // Paiement mixte : 6 000 espèces (10 000 remis) + reste en Wave
    await page.getByLabel("Montant 1").fill("6000");
    await page.getByRole("button", { name: /Paiement mixte/ }).click();
    await page.getByLabel("Moyen de paiement 2").selectOption("wave");
    await expect(page.getByLabel("Montant 2")).toHaveValue("10000");
    await page.getByLabel("Espèces reçues").fill("10000");
    await expect(page.getByText("Monnaie à rendre")).toBeVisible();
    await page.getByRole("button", { name: /Encaisser/ }).click();

    const dialog = page.getByRole("dialog", { name: "Vente enregistrée" });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(/4\s000/)).toBeVisible(); // monnaie rendue
    await dialog.getByRole("link", { name: "Détail" }).click();
    await expect(page).toHaveURL(/\/ventes\/[0-9a-f-]{36}$/);
    saleUrl = page.url();
    await expect(page.getByText("Total dû")).toBeVisible();

    const ticket = await page.context().newPage();
    await ticket.goto(saleUrl.replace("/ventes/", "/tickets/"));
    await expect(ticket.getByText("TOTAL", { exact: true })).toBeVisible();
    await expect(ticket.getByText(/16\s000/).first()).toBeVisible();
    await expect(ticket.getByText("Wave", { exact: true })).toBeVisible();
    await ticket.close();
  });

  test("le stock a été déduit une seule fois", async ({ page }) => {
    await page.goto("/produits?q=" + encodeURIComponent(productName));
    await page.getByRole("link", { name: new RegExp(productName) }).click();
    await expect(page.locator("table").first().getByRole("row", { name: /50 ml/ }).getByText("8 en stock")).toBeVisible();
  });

  test("retour partiel remboursé, stock réintégré", async ({ page }) => {
    await page.goto(saleUrl + "/retour");
    await page.getByLabel(`Quantité retournée ${productName}`).fill("1");
    await page.getByLabel("Motif").fill("Le parfum ne convient pas");
    await page.getByLabel("Mode de remboursement").selectOption("wave");
    const popup = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Valider le retour" }).click();
    await (await popup).close();
    await expect(page).toHaveURL(saleUrl, { timeout: 15_000 });
    await expect(page.getByText("1 retourné(s)")).toBeVisible();
    // une deuxième tentative de retour total est bornée à la quantité restante
    await page.goto(saleUrl + "/retour");
    await expect(page.getByLabel(`Quantité retournée ${productName}`)).toHaveAttribute("max", "1");
  });

  test("clôturer la caisse sans écart", async ({ page }) => {
    await page.goto("/sessions-caisse");
    await page.getByRole("link", { name: "Caisse principale" }).first().click();
    const expected = amountOf(await page.getByText(/Espèces théoriques :/).locator("strong").textContent());
    // La session peut contenir d'autres ventes en espèces : on vérifie au moins
    // le fond (10 000) + la part espèces de notre vente (6 000).
    expect(expected).toBeGreaterThanOrEqual(10000 + 6000);
    await page.getByLabel("Espèces comptées (FCFA)").fill(String(expected));
    await expect(page.getByText("Aucun écart.")).toBeVisible();
    await page.getByRole("button", { name: "Clôturer la caisse" }).click();
    await expect(page.getByText("Clôturée").first()).toBeVisible({ timeout: 15_000 });
  });

  test("tableau de bord et rapports alimentés par les données réelles", async ({ page }) => {
    await page.goto("/tableau-de-bord");
    await expect(page.getByText("Chiffre d'affaires du jour")).toBeVisible();
    await page.goto("/rapports?onglet=produits&period=today");
    await expect(page.getByRole("cell", { name: new RegExp(`${productName} — 50 ml`) })).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: /CSV/ }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^elegance_produits_.*\.csv$/);
  });

  test("un caissier ne peut pas administrer ni voir les rapports", async ({ page }) => {
    await logout(page);
    await login(page, cashier.email, cashier.password);
    await page.goto("/utilisateurs");
    await expect(page).toHaveURL(/acces-refuse/);
    await page.goto("/rapports");
    await expect(page).toHaveURL(/acces-refuse/);
    const res = await page.request.get("/api/exports/produits");
    expect(res.status()).toBe(403);
    await page.goto(saleUrl);
    await expect(page.getByText("Page introuvable")).toBeVisible(); // vente d'un autre caissier : invisible (RLS)
  });
});
