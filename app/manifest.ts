import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NALTO",
    short_name: "NALTO",
    description: "Du chantier au devis, sans repasser au bureau.",
    start_url: "/tableau-de-bord",
    display: "standalone",
    background_color: "#F5F1E8",
    theme_color: "#17382D",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
