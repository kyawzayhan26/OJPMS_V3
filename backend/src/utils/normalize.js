export function normalizeNullable(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return value;
}

export function normalizeNullableDate(value) {
  const normalized = normalizeNullable(value);
  if (!normalized) return null;
  if (normalized instanceof Date && !Number.isNaN(normalized.getTime())) {
    return normalized.toISOString();
  }
  if (typeof normalized === 'number' && Number.isFinite(normalized)) {
    return new Date(normalized).toISOString();
  }
  if (typeof normalized === 'string') {
    const isoDateOnly = normalized.match(/^\d{4}-\d{2}-\d{2}$/);
    if (isoDateOnly) {
      return `${normalized}T00:00:00.000Z`;
    }
    const parsed = Date.parse(normalized);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return normalized;
}
