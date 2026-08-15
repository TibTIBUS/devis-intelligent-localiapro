import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

function isoDateInDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test("un artisan parcourt client → devis → finalisation → PDF", async ({ page }) => {
  test.skip(!email || !password, "Configurez E2E_EMAIL et E2E_PASSWORD pour exécuter le parcours artisan isolé.");

  const unique = Date.now().toString();
  const customerName = `Client E2E ${unique}`;
  const customerEmail = `client-${unique}@example.test`;

  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email!);
  await page.getByLabel("Mot de passe").fill(password!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/tableau-de-bord|\/onboarding/);

  await page.goto("/clients/nouveau");
  await page.getByLabel("Nom du client").fill(customerName);
  await page.getByLabel("Téléphone").fill("0600000000");
  await page.getByLabel("E-mail").fill(customerEmail);
  await page.getByLabel("Adresse", { exact: true }).fill("1 rue du Test");
  await page.getByLabel("Code postal").fill("50000");
  await page.getByLabel("Ville").fill("Saint-Lô");
  await page.getByRole("button", { name: "Créer le client" }).click();
  await expect(page).toHaveURL(/\/clients\/[0-9a-f-]+\?enregistre=1$/);
  await expect(page.getByLabel("Nom du client")).toHaveValue(customerName);
  await expect(page.getByLabel("E-mail")).toHaveValue(customerEmail);

  await page.goto("/devis/nouveau");
  await page.getByLabel("Client").selectOption({ label: customerName });
  await page.getByRole("button", { name: "Créer le devis" }).click();
  await expect(page).toHaveURL(/\/devis\/[0-9a-f-]+$/);

  await page.getByLabel("Acompte demandé (%)").fill("30");
  await page.getByLabel("Validité de l’offre jusqu’au").fill(isoDateInDays(30));

  const worksiteSelect = page.getByLabel("Lieu d’exécution");
  const worksiteOption = worksiteSelect.locator("option").filter({ hasText: "1 rue du Test" }).first();
  const worksiteValue = await worksiteOption.getAttribute("value");
  expect(worksiteValue).toBeTruthy();
  await worksiteSelect.selectOption(worksiteValue!);

  await page.getByLabel("Gratuit").check();
  await page.getByLabel("Aucun").check();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();

  await page.getByLabel("Début prévu des travaux").fill(isoDateInDays(7));
  await page.getByLabel("Durée / délai estimé").fill("2 jours ouvrés");
  await page.getByRole("button", { name: "Enregistrer l’exécution" }).click();

  await page.getByLabel("Libellé", { exact: true }).last().fill("Prise de courant E2E");
  await page.getByLabel("Unité", { exact: true }).last().fill("unité");
  await page.getByLabel("Quantité", { exact: true }).last().fill("8");
  await page.getByLabel("Prix unitaire HT (€)").last().fill("85");
  await page.getByLabel("TVA (%)").last().fill("20");
  await page.getByRole("button", { name: "Ajouter la ligne" }).click();
  await expect(page.getByText("Prise de courant E2E", { exact: true }).first()).toBeVisible();

  const finalizeButton = page.getByRole("button", { name: "Finaliser le devis" });
  await expect(finalizeButton).toBeVisible();
  await finalizeButton.click();
  await expect(page.getByText(/Devis finalisé et immuable\./)).toBeVisible();

  const generateButton = page.getByRole("button", { name: "Générer et télécharger le PDF" }).first();
  await expect(generateButton).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await generateButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^D-[0-9]{4}-[0-9]{5,}\.pdf$/);
});
