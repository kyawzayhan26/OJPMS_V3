// src/middleware/errorHandler.js
import { mapSqlError, AppError } from '../utils/errors.js';

// Send the 404 here to avoid pushing it into the error pipeline
export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: { code: 'not_found', message: 'Endpoint not found' },
    requestId: req.id,
  });
}

// MUST be a 4-arity function for Express to treat it as an error handler
export function errorHandler(err, req, res, next) {
  // If a previous middleware already started/finished the response, delegate
  if (res && res.headersSent) return next(err);

  // Map SQL driver errors to friendly ones
  const mapped = mapSqlError(err);
  if (mapped) err = mapped;

  const status = err?.status || 500;
  const code = err?.code || 'internal_error';
  const message = err?.message || 'Server error';

  const body = { error: { code, message }, requestId: req.id };
  if (err?.details) body.error.details = err.details;

  console.error(
    `[${req?.id ?? '-'}] ${status} ${code} ${message}`,
    err?.stack ? '\n' + err.stack : ''
  );

  // If somehow res is missing (bad pipeline), fail gracefully
  if (!res) return;

  res.status(status).json(body);
}
