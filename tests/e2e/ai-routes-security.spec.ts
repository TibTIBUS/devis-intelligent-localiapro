import { chromium, expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const finalizedQuoteId = process.env.E2E_FINALIZED_QUOTE_ID;
const otherEmail = process.env.E2E_OTHER_EMAIL;
const otherPassword = process.env.E2E_OTHER_PASSWORD;

async function authenticate(emailAddress: string, userPassword: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL: baseUrl });
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(emailAddress);
  await page.getByLabel("Mot de passe").fill(userPassword);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/tableau-de-bord|\/onboarding/);
  return { browser, page };
}

function assistantRequestBody() {
  return {
    messages: [{ content: "Bonjour", role: "user" }],
    quoteId: finalizedQuoteId,
  };
}

test.describe.configure({ mode: "serial" });

test("les routes IA refusent un type de contenu et un corps non borné", async () => {
  test.skip(!baseUrl || !email || !password || !finalizedQuoteId, "Configurez les variables E2E isolées pour tester les routes IA.");
  const { browser, page } = await authenticate(email!, password!);

  const nonJsonResponse = await page.request.post("/api/ai/quote-assistant", {
    data: "quoteId=invalid",
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  expect(nonJsonResponse.status()).toBe(415);

  const oversizedResponse = await page.request.post("/api/ai/quote-assistant", {
    data: {
      messages: [{ content: "a".repeat(16 * 1024), role: "user" }],
      quoteId: finalizedQuoteId,
    },
  });
  expect(oversizedResponse.status()).toBe(413);
  await browser.close();
});

test("un devis finalisé déclenche le quota sans appeler OpenAI", async () => {
  test.skip(!baseUrl || !email || !password || !finalizedQuoteId, "Configurez les variables E2E isolées pour tester les routes IA.");
  const { browser, page } = await authenticate(email!, password!);

  for (let requestIndex = 0; requestIndex < 10; requestIndex += 1) {
    const response = await page.request.post("/api/ai/quote-assistant", { data: assistantRequestBody() });
    expect(response.status()).toBe(409);
  }

  const limitedResponse = await page.request.post("/api/ai/quote-assistant", { data: assistantRequestBody() });
  expect(limitedResponse.status()).toBe(429);
  expect(limitedResponse.headers()["retry-after"]).toBe("60");
  await browser.close();
});

test("une autre organisation ne peut pas interroger le devis E2E", async () => {
  test.skip(!baseUrl || !otherEmail || !otherPassword || !finalizedQuoteId, "Configurez E2E_OTHER_EMAIL et E2E_OTHER_PASSWORD pour le contrôle inter-organisation.");
  const { browser, page } = await authenticate(otherEmail!, otherPassword!);

  const response = await page.request.post("/api/ai/quote-assistant", { data: assistantRequestBody() });
  expect(response.status()).toBe(404);
  await browser.close();
});
