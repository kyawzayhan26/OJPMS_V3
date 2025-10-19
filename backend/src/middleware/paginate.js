// src/middleware/paginate.js
export function paginate({ maxLimit = 100, defaultLimit = 20 } = {}) {
  return (req, _res, next) => {
    const p = Number(req.query.page ?? 1) || 1;
    const l = Number(req.query.limit ?? defaultLimit) || defaultLimit;
    req.page = Math.max(1, p);
    req.limit = Math.min(Math.max(1, l), maxLimit);
    req.offset = (req.page - 1) * req.limit;

    // Optional sort parsing: ?sort=created_at:desc,name:asc
    const sort = String(req.query.sort || '').trim();
    req.sort = sort
      ? sort.split(',').map(s => {
          const [col, dirRaw] = s.split(':');
          const dir = (dirRaw || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
          return { col: col.trim(), dir };
        })
      : [];
    next();
  };
}
