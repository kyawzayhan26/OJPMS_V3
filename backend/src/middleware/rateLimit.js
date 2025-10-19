// src/middleware/rateLimit.js
const BUCKET = new Map();
const WINDOW_MS = 60_000;
const LIMIT = 300; // 300 req/min/ip for an internal app is generous

export function rateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const entry = BUCKET.get(key) || { count: 0, ts: now };
  if (now - entry.ts > WINDOW_MS) { entry.count = 0; entry.ts = now; }
  entry.count += 1;
  BUCKET.set(key, entry);
  if (entry.count > LIMIT) return res.status(429).json({
    error: { code: 'too_many_requests', message: 'Rate limit exceeded' }, requestId: req.id
  });
  next();
}
