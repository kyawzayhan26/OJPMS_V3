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
import { likeParam } from '../utils/search.js';

const DOCUMENT_TYPES = [
  'Passport',
  'Photo',
  'EducationCert',
  'MedicalCheck',
  'PoliceClearance',
  'SmartCardForm',
  'VisaForm',
  'Other',
];

const DOCUMENT_STATUSES = ['Pending', 'Uploaded', 'Verified', 'Rejected', 'Expired'];

const router = Router();

/**
 * GET /documents
 * Anyone with documents:read (Admin or Staff) can view document metadata
 * Filters:
 *   ?client_id=123
 *   ?prospect_id=456   (via Clients table)
 *   ?type=SmartCardForm[,VisaForm]
 *   ?status=Uploaded
 *   ?search=keyword
 * (No pagination by design — small per-client/prospect sets)
 */
router.get(
  '/',
  requireAuth,
  can('documents:read'),
  query('prospect_id').optional().isInt({ min: 1 }).toInt(),
  query('search').optional().isString(),
  query('status').optional().isIn(DOCUMENT_STATUSES),
  query('type')
    .optional()
    .customSanitizer((value) => {
      if (Array.isArray(value)) {
        return value
          .map((v) => (typeof v === 'string' ? v.trim() : ''))
          .filter(Boolean);
      }
      if (typeof value === 'string' && value.includes(',')) {
        return value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      }
      return value ? [String(value).trim()] : [];
    })
    .custom((value) => {
      if (!value || !value.length) return true;
      const invalid = value.find((v) => !DOCUMENT_TYPES.includes(v));
      if (invalid) throw new Error('Invalid document type');
      return true;
    }),
  handleValidation,
  async (req, res, next) => {
    try {
      const {
        prospect_id = null,
        search = '',
        status = null,
        type: typeParam = [],
      } = req.query;

      const types = Array.isArray(typeParam) ? typeParam : [];

      const where = ['d.isDeleted = 0'];
      if (prospect_id !== null) where.push('d.prospect_id = @prospect_id');
      if (status) where.push('d.status = @status');

      if (types.length === 1) {
        where.push('d.type = @type0');
      } else if (types.length > 1) {
        const placeholders = types.map((_, idx) => `@type${idx}`).join(', ');
        where.push(`d.type IN (${placeholders})`);
      }

      const q = likeParam(search || '');
      where.push(`(
        @q = '%%'
        OR p.full_name LIKE @q
        OR p.full_name LIKE @q
        OR p.passport_no LIKE @q
        OR c.full_name LIKE @q
        OR CAST(d.id AS NVARCHAR(50)) LIKE @q
        OR d.remarks LIKE @q
        OR d.type LIKE @q
        OR d.status LIKE @q
      )`);

      const sql = `
        SELECT
          d.*,
          p.full_name   AS prospect_name,
          p.passport_no,
          c.id          AS client_id,
          c.full_name   AS client_name
        FROM Documents d
        LEFT JOIN Prospects p ON p.id = d.prospect_id
        LEFT JOIN Clients   c ON c.prospect_id = d.prospect_id AND c.isDeleted = 0
        WHERE ${where.join(' AND ')}
        ORDER BY d.created_at DESC;
      `;

      const reqDb = getPool().request();
      if (prospect_id !== null) reqDb.input('prospect_id', prospect_id);
      reqDb.input('q', q);
      if (status) reqDb.input('status', status);
      types.forEach((t, idx) => {
        reqDb.input(`type${idx}`, t);
      });

      const result = await reqDb.query(sql);
      res.json({ rows: result.recordset });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /documents/:prospectId/files
 * Upload a file and create a new Documents row with status "Uploaded".
 * multipart/form-data with:
 *   - field "file" (the uploaded file)
 *   - field "type" (one of the allowed enum values)
 *   - optional "remarks"
 *   - optional "status" (defaults to Uploaded)
 */
router.post(
  '/:prospectId/files',
  requireAuth,
  can('documents:write'),

  // 1) param validator can run before Multer
  param('prospectId').isInt({ min: 1 }).toInt(),

  // 2) Multer must run BEFORE body validators so multipart fields are parsed
  (req, res, next) => uploadSingleDocument(req, res, (err) => err ? next(err) : next()),

  // 3) Now body validators see parsed fields
  body('type')
    .trim()
    .customSanitizer((v) => (v || '').trim())
    .isIn(DOCUMENT_TYPES),
  body('remarks').optional().isString().trim(),
  body('status').optional().isIn(DOCUMENT_STATUSES),
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

      const { prospectId } = req.params;
      const { type, remarks = null, status: statusInput = null } = req.body;

      // ensure prospect exists
      const prospectCheck = await getPool().request()
        .input('id', prospectId)
        .query('SELECT id FROM Prospects WHERE id=@id AND isDeleted=0;');
      if (prospectCheck.recordset.length === 0) {
        return res.status(404).json({ error: { code: 'not_found', message: 'Prospect not found' }, requestId: req.id });
      }

      const status = DOCUMENT_STATUSES.includes(statusInput) ? statusInput : 'Uploaded';

      const clientLookup = await getPool().request()
        .input('prospect_id', prospectId)
        .query('SELECT TOP 1 id FROM Clients WHERE prospect_id=@prospect_id AND isDeleted=0 ORDER BY created_at DESC;');
      const linkedClientId = clientLookup.recordset[0]?.id || null;

      const relDir = req._uploadRelDir || 'documents';
      const relPathFs = path.join(relDir, req.file.filename);           // filesystem path
      const relPathUrl = relPathFs.replace(/\\/g, '/');                  // URL-friendly path
      const fileUrl = `${process.env.PUBLIC_BASE_URL || ''}/documents/files/${encodeURI(relPathUrl)}`;

      const result = await getPool()
        .request()
        .input('prospect_id', prospectId)
        .input('client_id', linkedClientId)
        .input('type', type)
        .input('status', status)
        .input('file_url', fileUrl)
        .input('remarks', remarks ?? req.file.originalname ?? null)
        .query(`
          INSERT INTO Documents
            (prospect_id, client_id, type, status, file_url, remarks, created_at)
          OUTPUT INSERTED.*
          VALUES
            (@prospect_id, @client_id, @type, @status, @file_url, @remarks, SYSUTCDATETIME());
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
          original: req.file.originalname || null,
          prospect_id: row.prospect_id,
          client_id: row.client_id || null,
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

// GET single document by id (joined with client + prospect context)
router.get(
  '/:id',
  requireAuth,
  can('documents:read'),
  param('id').isInt({ min: 1 }).toInt(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool()
        .request()
        .input('id', id)
        .query(`
          SELECT
            d.*,
            p.full_name   AS prospect_name,
            p.passport_no,
            c.id          AS client_id,
            c.full_name   AS client_name
          FROM Documents d
          LEFT JOIN Prospects p ON p.id = d.prospect_id
          LEFT JOIN Clients   c ON c.prospect_id = d.prospect_id AND c.isDeleted = 0
          WHERE d.id = @id AND d.isDeleted = 0;
        `);

      const row = result.recordset[0];
      if (!row) {
        return res.status(404).json({ error: { code: 'not_found', message: 'Document not found' }, requestId: req.id });
      }

      res.json(row);
    } catch (err) { next(err); }
  }
);

// UPDATE document (status / file_url / remarks)
router.patch(
  '/:id',
  requireAuth,
  can('documents:write'),
  param('id').isInt({ min: 1 }).toInt(),
  body('status').optional().isIn(DOCUMENT_STATUSES),
  body('file_url').optional().isString(),
  body('remarks').optional().isString(),
  body('type').optional().isIn(DOCUMENT_TYPES),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const { status = null, file_url = null, remarks = null, type = null } = req.body;

      const result = await getPool().request()
        .input('id', id)
        .input('status', status)
        .input('file_url', file_url)
        .input('remarks', remarks)
        .input('type', type)
        .query(`
          UPDATE Documents
             SET status   = COALESCE(@status, status),
                 file_url = COALESCE(@file_url, file_url),
                 remarks  = COALESCE(@remarks, remarks),
                 type     = COALESCE(@type, type),
                 updated_at = SYSUTCDATETIME()
           WHERE id=@id AND isDeleted=0;

          SELECT
            d.*,
            p.full_name   AS prospect_name,
            p.passport_no,
            c.id          AS client_id,
            c.full_name   AS client_name
          FROM Documents d
          LEFT JOIN Prospects p ON p.id = d.prospect_id
          LEFT JOIN Clients   c ON c.prospect_id = d.prospect_id AND c.isDeleted = 0
          WHERE d.id=@id;
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
