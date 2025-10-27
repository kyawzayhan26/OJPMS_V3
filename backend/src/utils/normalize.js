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
  return normalized;
}
