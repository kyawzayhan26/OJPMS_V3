// src/middleware/requestDebug.js
export function requestDebug({ maxBodyLen = 2000 } = {}) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();

    // capture a lightweight response "message" if provided
    const originalJson = res.json.bind(res);
    res.json = (payload) => {
      try {
        if (payload && typeof payload === 'object') {
          res.locals.responseMessage = payload.message ?? null;
        }
      } catch {}
      return originalJson(payload);
    };

    res.on('finish', () => {
      const stop = process.hrtime.bigint();
      const ms = Number(stop - start) / 1e6;
      const safe = (v) => {
        try { return JSON.stringify(v ?? {}); } catch { return '[unserializable]'; }
      };
      const bodyStr = safe(req.body);
      const queryStr = safe(req.query);

      console.log('[REQ]', JSON.stringify({
        ts: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        userId: req.user?.userId ?? null,
        role: req.user?.role ?? null,
        status: res.statusCode,
        message: res.locals.responseMessage ?? null,
        duration_ms: Math.round(ms),
        ip: req.headers['x-forwarded-for'] || req.ip,
        ua: req.headers['user-agent'],
        query: queryStr,
        body: bodyStr.length > maxBodyLen ? (bodyStr.slice(0, maxBodyLen) + '...<truncated>') : bodyStr
      }));
    });

    next();
  };
}
