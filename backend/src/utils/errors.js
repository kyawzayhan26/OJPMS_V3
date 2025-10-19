// src/utils/errors.js
export class AppError extends Error {
  constructor(message, { status = 500, code = 'internal_error', details = null } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const BadRequest = (msg = 'Bad request', details) =>
  new AppError(msg, { status: 400, code: 'bad_request', details });

export const Unauthorized = (msg = 'Unauthorized') =>
  new AppError(msg, { status: 401, code: 'unauthorized' });

export const Forbidden = (msg = 'Forbidden') =>
  new AppError(msg, { status: 403, code: 'forbidden' });

export const NotFound = (msg = 'Not found') =>
  new AppError(msg, { status: 404, code: 'not_found' });

export const Conflict = (msg = 'Conflict', details) =>
  new AppError(msg, { status: 409, code: 'conflict', details });

export const Unprocessable = (msg = 'Validation failed', details) =>
  new AppError(msg, { status: 422, code: 'validation_error', details });

// Translate common MSSQL errors -> AppError
export function mapSqlError(err) {
  // Unique constraint violation
  if (err?.number === 2627 || err?.number === 2601) {
    return Conflict('Duplicate value violates a unique constraint.');
  }
  return null;
}
