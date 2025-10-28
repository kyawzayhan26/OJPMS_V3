import { Router } from 'express';
import { query, body, param } from 'express-validator';
import { getPool } from '../utils/db.js';
import { requireAuth, can } from '../middleware/auth.js';
import { writeAudit } from '../utils/audit.js';
import { handleValidation } from '../middleware/validate.js';
import { paginate } from '../middleware/paginate.js';
import { likeParam, orderByClause } from '../utils/search.js';
import { normalizeNullable } from '../utils/normalize.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  can('visaApplications:read'),
  query('search').optional().isString(),
  query('status').optional().isString(),
  query('prospect_id').optional({ checkFalsy: true }).toInt().isInt({ min: 1 }),
  query('client_id').optional({ checkFalsy: true }).toInt().isInt({ min: 1 }),
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
  query('sort').optional().isString(),
  handleValidation,
  paginate({ maxLimit: 100, defaultLimit: 20 }),
  async (req, res, next) => {
    try {
      const { search = '', status = null, prospect_id = null, client_id = null } = req.query;
      const { page, limit, offset, sort } = req;

      const q = likeParam(search);
      const orderBy = orderByClause(
        ['created_at', 'updated_at', 'status', 'prospect_name', 'client_name', 'application_no'],
        sort,
        'created_at DESC'
      );

      const pool = getPool();

      const totalRs = await pool.request()
        .input('q', q)
        .input('status', status)
        .input('prospect_id', prospect_id)
        .input('client_id', client_id)
        .query(`
          SELECT COUNT(*) AS total
          FROM VisaApplications v
          JOIN Prospects p ON p.id = v.prospect_id
          LEFT JOIN Clients c ON c.id = v.client_id
          WHERE v.isDeleted = 0
            ${status      ? 'AND v.status = @status'           : ''}
            ${prospect_id ? 'AND v.prospect_id = @prospect_id' : ''}
            ${client_id   ? 'AND v.client_id = @client_id'     : ''}
            AND (
              @q = '%%'
              OR p.full_name LIKE @q
              OR c.full_name LIKE @q
              OR v.application_no LIKE @q
              OR v.notes LIKE @q
              OR v.visa_type LIKE @q
            );
        `);
      const total = totalRs.recordset[0]?.total ?? 0;

      const rowsRs = await pool.request()
        .input('q', q)
        .input('status', status)
        .input('prospect_id', prospect_id)
        .input('client_id', client_id)
        .input('limit', limit)
        .input('offset', offset)
        .query(`
          SELECT
            v.*,
            p.full_name AS prospect_name,
            c.full_name AS client_name
          FROM VisaApplications v
          JOIN Prospects p ON p.id = v.prospect_id
          LEFT JOIN Clients c ON c.id = v.client_id
          WHERE v.isDeleted = 0
            ${status      ? 'AND v.status = @status'           : ''}
            ${prospect_id ? 'AND v.prospect_id = @prospect_id' : ''}
            ${client_id   ? 'AND v.client_id = @client_id'     : ''}
            AND (
              @q = '%%'
              OR p.full_name LIKE @q
              OR c.full_name LIKE @q
              OR v.application_no LIKE @q
              OR v.notes LIKE @q
              OR v.visa_type LIKE @q
            )
          ${orderBy}
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        `);
      const rows = rowsRs.recordset || [];

      res.json({ rows, page, pageSize: limit, total, hasMore: offset + rows.length < total });
    } catch (err) { next(err); }
  }
);

router.get(
  '/:id',
  requireAuth,
  can('visaApplications:read'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool().request()
        .input('id', id)
        .query(`
          SELECT
            v.*,
            p.full_name AS prospect_name,
            c.full_name AS client_name
          FROM VisaApplications v
          JOIN Prospects p ON p.id = v.prospect_id
          LEFT JOIN Clients c ON c.id = v.client_id
          WHERE v.id = @id;
        `);
      const row = result.recordset[0];
      if (!row) return res.status(404).json({ message: 'Not found' });
      res.json(row);
    } catch (err) { next(err); }
  }
);

router.post(
  '/',
  requireAuth,
  can('visaApplications:write'),
  body('prospect_id').isInt().toInt(),
  body('client_id').optional({ checkFalsy: true, nullable: true }).toInt().isInt({ min: 1 }),
  body('visa_type').optional({ checkFalsy: true, nullable: true }).isString(),
  body('application_no').optional({ checkFalsy: true, nullable: true }).isString(),
  body('status').isString(),
  body('submitted_at').optional({ checkFalsy: true, nullable: true }).isISO8601(),
  body('approved_at').optional({ checkFalsy: true, nullable: true }).isISO8601(),
  body('notes').optional({ checkFalsy: true, nullable: true }).isString(),
  handleValidation,
  async (req, res, next) => {
    try {
      const { prospect_id, status } = req.body;
      const client_id = req.body.client_id ?? null;
      const visa_type = normalizeNullable(req.body.visa_type);
      const application_no = normalizeNullable(req.body.application_no);
      const submitted_at = normalizeNullable(req.body.submitted_at);
      const approved_at = normalizeNullable(req.body.approved_at);
      const notes = normalizeNullable(req.body.notes);

      const result = await getPool().request()
        .input('prospect_id', prospect_id)
        .input('client_id', client_id)
        .input('visa_type', visa_type)
        .input('application_no', application_no)
        .input('status', status)
        .input('submitted_at', submitted_at)
        .input('approved_at', approved_at)
        .input('notes', notes)
        .query(`
          INSERT INTO VisaApplications
            (prospect_id, client_id, visa_type, application_no, status, submitted_at, approved_at, notes, created_at, updated_at, isDeleted)
          OUTPUT INSERTED.*
          VALUES
            (@prospect_id, @client_id, @visa_type, @application_no, @status,
             @submitted_at, @approved_at, @notes, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
        `);

      const row = result.recordset[0];

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'VISA_APPLICATION_CREATE',
        entity: 'VisaApplications',
        entityId: row.id,
        details: row,
      });

      res.status(201).json(row);
    } catch (err) { next(err); }
  }
);

router.put(
  '/:id',
  requireAuth,
  can('visaApplications:write'),
  param('id').toInt().isInt({ min: 1 }),
  body('client_id').optional({ checkFalsy: true, nullable: true }).toInt().isInt({ min: 1 }),
  body('visa_type').optional({ checkFalsy: true, nullable: true }).isString(),
  body('application_no').optional({ checkFalsy: true, nullable: true }).isString(),
  body('status').optional().isString(),
  body('submitted_at').optional({ checkFalsy: true, nullable: true }).isISO8601(),
  body('approved_at').optional({ checkFalsy: true, nullable: true }).isISO8601(),
  body('notes').optional({ checkFalsy: true, nullable: true }).isString(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const client_id = req.body.client_id ?? null;
      const visa_type = normalizeNullable(req.body.visa_type);
      const application_no = normalizeNullable(req.body.application_no);
      const status = req.body.status ?? null;
      const submitted_at = normalizeNullable(req.body.submitted_at);
      const approved_at = normalizeNullable(req.body.approved_at);
      const notes = normalizeNullable(req.body.notes);

      const result = await getPool().request()
        .input('id', id)
        .input('client_id', client_id)
        .input('visa_type', visa_type)
        .input('application_no', application_no)
        .input('status', status)
        .input('submitted_at', submitted_at)
        .input('approved_at', approved_at)
        .input('notes', notes)
        .query(`
          UPDATE VisaApplications
             SET client_id      = COALESCE(@client_id, client_id),
                 visa_type      = COALESCE(@visa_type, visa_type),
                 application_no = COALESCE(@application_no, application_no),
                 status         = COALESCE(@status, status),
                 submitted_at   = COALESCE(@submitted_at, submitted_at),
                 approved_at    = COALESCE(@approved_at, approved_at),
                 notes          = COALESCE(@notes, notes),
                 updated_at     = SYSUTCDATETIME()
           WHERE id = @id AND isDeleted = 0;

          SELECT
            v.*,
            p.full_name AS prospect_name,
            c.full_name AS client_name
          FROM VisaApplications v
          JOIN Prospects p ON p.id = v.prospect_id
          LEFT JOIN Clients c ON c.id = v.client_id
          WHERE v.id = @id;
        `);

      const row = result.recordset[0];
      if (!row) return res.status(404).json({ message: 'Not found' });

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'VISA_APPLICATION_UPDATE',
        entity: 'VisaApplications',
        entityId: id,
        details: row,
      });

      res.json(row);
    } catch (err) { next(err); }
  }
);

router.delete(
  '/:id',
  requireAuth,
  can('visaApplications:write'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool().request()
        .input('id', id)
        .query(`
          UPDATE VisaApplications
             SET isDeleted = 1,
                 updated_at = SYSUTCDATETIME()
           WHERE id = @id AND isDeleted = 0;

          SELECT * FROM VisaApplications WHERE id = @id;
        `);
      if (!result.recordset[0]) return res.status(404).json({ message: 'Not found' });

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'VISA_APPLICATION_DELETE',
        entity: 'VisaApplications',
        entityId: id,
      });

      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

export default router;
