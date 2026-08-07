import { z } from "zod";

export const organizationAssetsBucket = "organization-assets";
export const organizationLogoMaxBytes = 2 * 1024 * 1024;
export const organizationLogoMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const organizationLogoFileSchema = z
  .file("Sélectionnez un logo.")
  .min(1, "Le fichier est vide.")
  .max(organizationLogoMaxBytes, "Le logo ne doit pas dépasser 2 Mo.")
  .mime(
    [...organizationLogoMimeTypes],
    "Utilisez une image JPEG, PNG ou WebP.",
  );

export type LogoFormState = {
  message?: string;
  status: "error" | "idle";
};

export const initialLogoFormState: LogoFormState = { status: "idle" };

export function getOrganizationLogoPath(organizationId: string) {
  return `organizations/${organizationId}/logo/logo`;
}

export function detectLogoMimeType(bytes: Uint8Array): string | null {
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  if (isJpeg) return "image/jpeg";
  if (isPng) return "image/png";
  if (isWebp) return "image/webp";
  return null;
}

export async function validateOrganizationLogo(
  input: unknown,
): Promise<
  | { data: { contentType: string; file: File }; success: true }
  | { message: string; success: false }
> {
  const parsed = organizationLogoFileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message ?? "Le logo est invalide.",
      success: false,
    };
  }

  const header = new Uint8Array(
    await parsed.data.slice(0, 12).arrayBuffer(),
  );
  const detectedContentType = detectLogoMimeType(header);

  if (!detectedContentType || detectedContentType !== parsed.data.type) {
    return {
      message: "Le contenu du fichier ne correspond pas à une image autorisée.",
      success: false,
    };
  }

  return {
    data: { contentType: detectedContentType, file: parsed.data },
    success: true,
  };
}
