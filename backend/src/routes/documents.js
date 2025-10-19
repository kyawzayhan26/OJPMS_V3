// src/routes/documents.js
import { Router } from 'express';
import { query, body, param } from 'express-validator';
import fs from 'fs';
import path from 'path';

import { getPool } from '../utils/db.js';
import { requireAuth, can } from '../middleware/auth.js';
import { writeAudit } from '../utils/audit.js';
import { handleValidation } from '../middleware/validate.js';
import { uploadSingleDocument, resolvePublicPath } from '../middleware/upload.js';

const router = Router();

/**
 * GET /documents
 * Anyone with documents:read (Admin or Staff) can view document metadata
 * Filters:
 *   ?client_id=123
 *   ?prospect_id=456   (via Clients table)
 * (No pagination by design — small per-client/prospect sets)
 */
router.get(
  '/',
  requireAuth,
  can('documents:read'),
  query('client_id').optional().isInt({ min: 1 }).toInt(),
  query('prospect_id').optional().isInt({ min: 1 }).toInt(),
  handleValidation,
  async (req, res, next) => {
    try {
      const { client_id = null, prospect_id = null } = req.query;

      // Build WHERE clause safely with parameterized inputs
      const where = ['d.isDeleted = 0'];
      if (client_id !== null) where.push('d.client_id = @client_id');
      if (prospect_id !== null) where.push('c.prospect_id = @prospect_id');

      const sql = `
        SELECT
          d.*,
          c.prospect_id,
          p.full_name AS prospect_name
        FROM Documents d
        LEFT JOIN Clients   c ON c.id = d.client_id
        LEFT JOIN Prospects p ON p.id = c.prospect_id
        WHERE ${where.join(' AND ')}
        ORDER BY d.created_at DESC;
      `;

      const reqDb = getPool().request();
      if (client_id !== null)   reqDb.input('client_id', client_id);
      if (prospect_id !== null) reqDb.input('prospect_id', prospect_id);

      const result = await reqDb.query(sql);
      res.json({ rows: result.recordset });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /documents/:clientId/files
 * Upload a file and create a new Documents row with status "Uploaded".
 * multipart/form-data with:
 *   - field "file" (the uploaded file)
 *   - field "type" (one of the allowed enum values)
 *   - optional "remarks"
 */
router.post(
  '/:clientId/files',
  requireAuth,
  can('documents:write'),

  // 1) param validator can run before Multer
  param('clientId').isInt({ min: 1 }).toInt(),

  // 2) Multer must run BEFORE body validators so multipart fields are parsed
  (req, res, next) => uploadSingleDocument(req, res, (err) => err ? next(err) : next()),

  // 3) Now body validators see parsed fields
  body('type')
    .trim()
    .customSanitizer(v => (v || '').trim())
    .isIn([
      'Passport',
      'Photo',
      'EducationCert',
      'MedicalCheck',
      'PoliceClearance',
      'SmartCardForm',
      'VisaForm',
      'Other',
    ]),
  body('remarks').optional().isString().trim(),
  handleValidation,

  // 4) Handler
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: { code: 'bad_request', message: 'No file uploaded' },
          requestId: req.id
        });
      }

      const { clientId } = req.params;
      const { type, remarks = null } = req.body;

      // ensure client exists
      const clientCheck = await getPool().request()
        .input('id', clientId)
        .query('SELECT id FROM Clients WHERE id=@id AND isDeleted=0;');
      if (clientCheck.recordset.length === 0) {
        return res.status(404).json({ error: { code: 'not_found', message: 'Client not found' }, requestId: req.id });
      }

      const relDir = req._uploadRelDir || 'documents';
      const relPathFs = path.join(relDir, req.file.filename);           // filesystem path
      const relPathUrl = relPathFs.replace(/\\/g, '/');                  // URL-friendly path
      const fileUrl = `${process.env.PUBLIC_BASE_URL || ''}/documents/files/${encodeURI(relPathUrl)}`;

      const result = await getPool()
        .request()
        .input('client_id', clientId)
        .input('type', type)
        .input('status', 'Uploaded')
        .input('file_url', fileUrl)
        .input('remarks', remarks ?? req.file.originalname ?? null)
        .query(`
          INSERT INTO Documents
            (client_id, type, status, file_url, remarks, created_at)
          OUTPUT INSERTED.*
          VALUES
            (@client_id, @type, @status, @file_url, @remarks, SYSUTCDATETIME());
        `);

      const row = result.recordset[0];

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'DOCUMENT_UPLOAD',
        entity: 'Documents',
        entityId: row.id,
        details: {
          file_url: row.file_url,
          type: row.type,
          size_bytes: req.file.size,
          mime: req.file.mimetype,
          original: req.file.originalname || null
        }
      });

      res.status(201).json(row);
    } catch (e) { next(e); }
  }
);

/**
 * GET /documents/files/<relative path from uploads root>
 * Streams a file (auth required). We use a wildcard to keep year/month/filename flexible.
 */
router.get('/files/*', requireAuth, can('documents:read'), async (req, res, next) => {
  try {
    const rel = decodeURIComponent(req.params[0] || '').replace(/\\/g, '/');
    const abs = resolvePublicPath(rel);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ error: { code: 'not_found', message: 'File not found' }, requestId: req.id });
    }
    res.sendFile(abs);
  } catch (e) { next(e); }
});

// UPDATE document (status / file_url / remarks)
router.patch(
  '/:id',
  requireAuth,
  can('documents:write'),
  param('id').isInt({ min: 1 }).toInt(),
  body('status').optional().isIn(['Pending', 'Uploaded', 'Verified', 'Rejected', 'Expired']),
  body('file_url').optional().isString(),
  body('remarks').optional().isString(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const { status = null, file_url = null, remarks = null } = req.body;

      const result = await getPool().request()
        .input('id', id)
        .input('status', status)
        .input('file_url', file_url)
        .input('remarks', remarks)
        .query(`
          UPDATE Documents
             SET status   = COALESCE(@status, status),
                 file_url = COALESCE(@file_url, file_url),
                 remarks  = COALESCE(@remarks, remarks)
           WHERE id=@id AND isDeleted=0;

          SELECT * FROM Documents WHERE id=@id;
        `);

      const row = result.recordset[0];
      if (!row) return res.status(404).json({ error: { code: 'not_found', message: 'Not found' }, requestId: req.id });

      await writeAudit({
        req,
        actorUserId: req.user?.userId,
        action: 'DOCUMENT_UPDATE',
        entity: 'Documents',
        entityId: id,
        details: row
      });

      res.json(row);
    } catch (err) { next(err); }
  }
);

// SOFT DELETE document
router.delete(
  '/:id',
  requireAuth,
  can('documents:write'),
  param('id').isInt({ min: 1 }).toInt(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool().request()
        .input('id', id)
        .query(`
          UPDATE Documents SET isDeleted=1 WHERE id=@id AND isDeleted=0;
          SELECT * FROM Documents WHERE id=@id;
        `);

      if (!result.recordset[0]) {
        return res.status(404).json({ error: { code: 'not_found', message: 'Not found' }, requestId: req.id });
      }

      await writeAudit({
        req,
        actorUserId: req.user?.userId,
        action: 'DOCUMENT_DELETE_SOFT',
        entity: 'Documents',
        entityId: id
      });

      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

export default router;
