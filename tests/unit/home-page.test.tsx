import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "../../app/page";

describe("home page", () => {
  it("provides clear entry points to registration and login", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: "Vos devis se font sur le chantier.",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Créer mon premier devis/ }).getAttribute("href"),
    ).toBe("/inscription");
    expect(screen.getByRole("link", { name: "J’ai déjà un compte" }).getAttribute("href")).toBe(
      "/connexion",
    );
  });
});
