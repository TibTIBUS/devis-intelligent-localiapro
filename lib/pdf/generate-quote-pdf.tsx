import { renderToBuffer } from "@react-pdf/renderer";

import { QuoteDocument } from "@/lib/pdf/quote-template";
import { parseQuotePdfData } from "@/lib/pdf/quote-snapshot";

export async function generateQuotePdf(
  snapshot: unknown,
  complianceSnapshot: unknown,
  options: { logoDataUrl?: string | null } = {},
) {
  const data = parseQuotePdfData(snapshot, complianceSnapshot);
  return renderToBuffer(<QuoteDocument data={data} logoDataUrl={options.logoDataUrl ?? null} />);
}
