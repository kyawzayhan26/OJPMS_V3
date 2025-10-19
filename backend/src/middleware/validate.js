// src/middleware/validate.js
import { validationResult } from 'express-validator';
import { Unprocessable } from '../utils/errors.js';

export function handleValidation(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map(e => ({
    field: e.path, issue: e.msg, value: e.value
  }));
  next(Unprocessable('Invalid input', details));
}
