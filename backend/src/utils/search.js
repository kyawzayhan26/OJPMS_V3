// src/utils/search.js
export function likeParam(q) {
  const s = String(q || '').trim().slice(0, 100); // cap length
  return `%${s.replace(/[%_]/g, '')}%`; // strip SQL wildcards
}

export function orderByClause(allowed, sortArr) {
  const whitelist = new Set(allowed);
  const parts = (sortArr || [])
    .filter(s => whitelist.has(s.col))
    .map(s => `${s.col} ${s.dir}`);
  return parts.length ? ` ORDER BY ${parts.join(', ')}` : '';
}
