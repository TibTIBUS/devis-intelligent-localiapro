import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Home from "../../app/page";

// Ce projet n'active pas `test.globals` dans vitest.config.mts, donc le
// nettoyage automatique de @testing-library/react (qui s'appuie sur un
// afterEach global) ne se déclenche pas seul entre les deux cas ci-dessous.
afterEach(cleanup);

describe("home page", () => {
  it("provides clear entry points to registration and login", async () => {
    render(await Home());

    expect(
      screen.getByRole("heading", {
        name: "Dictez les travaux. Nalto prépare le devis.",
      }),
    ).toBeTruthy();

    const trialLinks = screen.getAllByRole("link", { name: /Essayer Nalto gratuitement/ });
    expect(trialLinks.length).toBeGreaterThan(0);
    for (const link of trialLinks) {
      expect(link.getAttribute("href")).toBe("/inscription");
    }

    expect(screen.getByRole("link", { name: "Se connecter" }).getAttribute("href")).toBe(
      "/connexion",
    );
  });

  it("never promises a hardcoded trial length or price outside the real configuration", async () => {
    render(await Home());

    // Sans variables Stripe en environnement de test, aucun montant ne doit
    // être affiché : seul l'essai gratuit (durée réelle du produit) l'est.
    expect(screen.getByText(/14 jours d’essai gratuit/)).toBeTruthy();
    expect(screen.queryByText(/HT \/ mois/)).toBeNull();
  });
});
