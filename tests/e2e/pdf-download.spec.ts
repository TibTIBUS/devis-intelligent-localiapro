import { chromium, expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const quoteId = process.env.E2E_FINALIZED_QUOTE_ID;

test("un artisan peut générer puis télécharger le PDF d'un devis finalisé", async () => {
  test.skip(!email || !password || !quoteId, "Configurez E2E_EMAIL, E2E_PASSWORD et E2E_FINALIZED_QUOTE_ID pour exécuter le parcours distant.");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email!);
  await page.getByLabel("Mot de passe").fill(password!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/tableau-de-bord|\/onboarding/);
  await page.goto(`/devis/${quoteId}`);

  const generateButton = page.getByRole("button", { name: "Générer et télécharger le PDF" });
  await expect(generateButton).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await generateButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^D-[0-9]{4}-[0-9]{5,}\.pdf$/);
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  await browser.close();
});
