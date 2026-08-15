import { devices, expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const quoteId = process.env.E2E_FINALIZED_QUOTE_ID;

test.use({ ...devices["iPhone 15"] });

test("le mode voix reste utilisable sur un écran iPhone", async ({ page }) => {
  test.skip(!email || !password || !quoteId, "Configurez les variables E2E pour exécuter le smoke test mobile isolé.");

  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email!);
  await page.getByLabel("Mot de passe").fill(password!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/tableau-de-bord|\/onboarding/);

  await page.goto(`/devis/${quoteId}/voix`);
  await expect(page.getByRole("heading", { name: "Devis à la voix" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Maintenir pour parler" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Terminer la saisie vocale" })).toBeVisible();
  await expect(page.getByText("Les actions comprises sont appliquées directement au brouillon.")).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
