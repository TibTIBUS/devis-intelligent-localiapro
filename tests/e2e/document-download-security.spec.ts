import { chromium, expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL;
const documentId = process.env.E2E_DOCUMENT_ID ?? "00000000-0000-0000-0000-000000000001";
const otherEmail = process.env.E2E_OTHER_EMAIL;
const otherPassword = process.env.E2E_OTHER_PASSWORD;

test("un téléchargement PDF privé exige une session", async ({ request }) => {
  test.skip(!baseUrl, "Configurez E2E_BASE_URL pour exécuter les contrôles HTTP distants.");

  const response = await request.get(`${baseUrl}/api/documents/${documentId}/download`);
  expect(response.status()).toBe(401);
  expect(response.headers()["content-type"]).toContain("application/json");
});

test("un membre d'une autre organisation ne peut pas télécharger le document", async () => {
  test.skip(!baseUrl || !otherEmail || !otherPassword || !process.env.E2E_DOCUMENT_ID, "Configurez E2E_BASE_URL, E2E_DOCUMENT_ID, E2E_OTHER_EMAIL et E2E_OTHER_PASSWORD pour le contrôle inter-organisation.");

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL: baseUrl });
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(otherEmail!);
  await page.getByLabel("Mot de passe").fill(otherPassword!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/tableau-de-bord|\/onboarding/);

  const response = await page.request.get(`/api/documents/${process.env.E2E_DOCUMENT_ID}/download`);
  expect(response.status()).toBe(404);
  await browser.close();
});
