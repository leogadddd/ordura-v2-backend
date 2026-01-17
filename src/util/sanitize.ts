// empty

/**
 * Utility helpers for sanitizing request input before create/update handlers.
 *
 * The helpers are intentionally small and pure so they can be composed in
 * route handlers (e.g. only pick allowed fields, trim strings, parse numbers).
 */

export type SanitizeOptions = {
  /** Only keep these keys if provided. */
  allowedFields?: string[];
  /** Trim string values. Defaults to true. */
  trimStrings?: boolean;
  /** Remove empty strings and undefined/null values. Defaults to true. */
  removeEmpty?: boolean;
  /** Keys that should be parsed into numbers. */
  parseNumbers?: string[];
  /** Keys that should be parsed into integers (overrides parseNumbers for those keys). */
  parseIntegers?: string[];
  /** Keys that should be parsed into booleans. */
  parseBooleans?: string[];
};

const DEFAULT_OPTS: Required<
  Pick<SanitizeOptions, "trimStrings" | "removeEmpty">
> = {
  trimStrings: true,
  removeEmpty: true,
};

function isNumericString(v: string) {
  // allow integers and decimals, optional leading +/-, optional commas
  const s = v.replace(/,/g, "").trim();
  return /^[-+]?\d+(?:\.\d+)?$/.test(s);
}

/**
 * Try to coerce a value to a number. Returns `fallback` when not possible.
 */
export function sanitizeNumber(
  value: unknown,
  fallback: number | null = null,
  opts?: { integer?: boolean }
): number | null {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return fallback;
    return opts?.integer ? Math.trunc(value) : value;
  }
  if (typeof value === "string") {
    const s = value.replace(/,/g, "").trim();
    if (!isNumericString(s)) return fallback;
    const n = opts?.integer ? parseInt(s, 10) : parseFloat(s);
    if (Number.isNaN(n) || !Number.isFinite(n)) return fallback;
    return n;
  }
  return fallback;
}

/**
 * Parse simple boolean-like values from strings/numbers.
 */
function sanitizeBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return null;
}

/**
 * Sanitize an input object for create/update routes.
 * - Optionally keeps only `allowedFields`.
 * - Trims strings (by default) and removes empty values (by default).
 * - Can coerce specified fields to numbers or integers.
 * - Can coerce specified fields to booleans.
 */
export function sanitizeInput<T extends Record<string, any>>(
  input: unknown,
  opts?: SanitizeOptions
): Partial<T> {
  const o = { ...DEFAULT_OPTS, ...(opts ?? {}) } as Required<SanitizeOptions> &
    SanitizeOptions;
  if (!input || typeof input !== "object") return {};

  const result: Partial<T> = {};
  for (const [rawKey, rawValue] of Object.entries(
    input as Record<string, unknown>
  )) {
    const key = rawKey as keyof T as string;

    if (o.allowedFields && !o.allowedFields.includes(key)) continue;

    let value: unknown = rawValue;

    if (typeof value === "string" && o.trimStrings) value = value.trim();

    // parse numbers first when configured
    if (o.parseNumbers && o.parseNumbers.includes(key)) {
      const wantInt = Boolean(o.parseIntegers && o.parseIntegers.includes(key));
      value = sanitizeNumber(value, null, { integer: wantInt });
    }

    // parse booleans
    if (o.parseBooleans && o.parseBooleans.includes(key)) {
      value = sanitizeBoolean(value);
    }

    // remove empty values when requested
    if (o.removeEmpty) {
      if (value === "" || value === null || value === undefined) continue;
      if (typeof value === "number" && Number.isNaN(value)) continue;
    }

    // final assignment
    (result as any)[key] = value;
  }

  return result;
}

/**
 * Convenience helper to sanitize a numeric field on an object in-place.
 */
export function sanitizeNumberField<T extends Record<string, any>>(
  obj: T,
  field: keyof T,
  fallback: number | null = null,
  opts?: { integer?: boolean }
) {
  if (!obj || typeof obj !== "object") return obj;
  const val = sanitizeNumber(obj[field], fallback, opts);
  if (val === null) delete obj[field];
  else obj[field] = val as any;
  return obj;
}

export default {
  sanitizeInput,
  sanitizeNumber,
  sanitizeNumberField,
};
