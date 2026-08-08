import { randomUUID } from "node:crypto";

export type TechnicalLogContext = {
  actionType?: string;
  documentId?: string;
  organizationId?: string;
  quoteId?: string;
  requestId?: string;
  ruleCodes?: string[];
  toolName?: string;
  userId?: string;
};

type LogLevel = "error" | "info" | "warn";

function safeToken(value: unknown) {
  return typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,100}$/.test(value) ? value : undefined;
}

function safeErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  return safeToken(error.code);
}

function serialize(level: LogLevel, event: string, context: TechnicalLogContext, error?: unknown) {
  return JSON.stringify({
    action_type: safeToken(context.actionType),
    document_id: safeToken(context.documentId),
    error_code: safeErrorCode(error),
    event,
    level,
    organization_id: safeToken(context.organizationId),
    quote_id: safeToken(context.quoteId),
    request_id: safeToken(context.requestId),
    rule_codes: context.ruleCodes?.map(safeToken).filter((code): code is string => Boolean(code)).slice(0, 20),
    tool_name: safeToken(context.toolName),
    user_id: safeToken(context.userId),
  });
}

export function createRequestId() {
  return randomUUID();
}

export function logTechnicalError(event: string, context: TechnicalLogContext, error: unknown) {
  console.error(serialize("error", event, context, error));
}

export function logTechnicalInfo(event: string, context: TechnicalLogContext) {
  console.info(serialize("info", event, context));
}

export function logTechnicalWarning(event: string, context: TechnicalLogContext) {
  console.warn(serialize("warn", event, context));
}
