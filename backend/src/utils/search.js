// src/utils/search.js
export function likeParam(q) {
  const s = String(q || '').trim().slice(0, 100); // cap length
  return `%${s.replace(/[%_]/g, '')}%`; // strip SQL wildcards
}

export function orderByClause(allowed, sortArr, defaultClause = '') {
  const whitelist = new Set(allowed);
  const parsed = (sortArr || [])
    .filter((s) => whitelist.has(s.col))
    .map((s) => `${s.col} ${s.dir}`);

  if (parsed.length) {
    return ` ORDER BY ${parsed.join(', ')}`;
  }

  const fallback = String(defaultClause || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [colRaw, dirRaw] = part.split(/\s+/);
      if (!colRaw || !whitelist.has(colRaw)) return null;
      const dir = String(dirRaw || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      return `${colRaw} ${dir}`;
    })
    .filter(Boolean);

  return fallback.length ? ` ORDER BY ${fallback.join(', ')}` : '';
}
