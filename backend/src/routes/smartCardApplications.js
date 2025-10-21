import { Router } from 'express';
import { query, body, param } from 'express-validator';
import { getPool } from '../utils/db.js';
import { requireAuth, can } from '../middleware/auth.js';
import { writeAudit } from '../utils/audit.js';
import { handleValidation } from '../middleware/validate.js';
import { paginate } from '../middleware/paginate.js';
import { likeParam, orderByClause } from '../utils/search.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  can('smartCardApplications:read'),
  query('search').optional().isString(),
  query('status').optional().isString(),
  query('prospect_id').optional().toInt().isInt({ min: 1 }),
  query('client_id').optional().toInt().isInt({ min: 1 }),
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
        ['created_at', 'updated_at', 'status', 'prospect_name', 'client_name', 'card_number'],
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
          FROM SmartCardApplications s
          JOIN Prospects p ON p.id = s.prospect_id
          LEFT JOIN Clients c ON c.id = s.client_id
          WHERE s.isDeleted = 0
            ${status      ? 'AND s.status = @status'           : ''}
            ${prospect_id ? 'AND s.prospect_id = @prospect_id' : ''}
            ${client_id   ? 'AND s.client_id = @client_id'     : ''}
            AND (
              @q = '%%'
              OR p.full_name LIKE @q
              OR c.full_name LIKE @q
              OR s.card_number LIKE @q
              OR s.notes LIKE @q
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
            s.*,
            p.full_name AS prospect_name,
            c.full_name AS client_name
          FROM SmartCardApplications s
          JOIN Prospects p ON p.id = s.prospect_id
          LEFT JOIN Clients c ON c.id = s.client_id
          WHERE s.isDeleted = 0
            ${status      ? 'AND s.status = @status'           : ''}
            ${prospect_id ? 'AND s.prospect_id = @prospect_id' : ''}
            ${client_id   ? 'AND s.client_id = @client_id'     : ''}
            AND (
              @q = '%%'
              OR p.full_name LIKE @q
              OR c.full_name LIKE @q
              OR s.card_number LIKE @q
              OR s.notes LIKE @q
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
  can('smartCardApplications:read'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool().request()
        .input('id', id)
        .query(`
          SELECT
            s.*,
            p.full_name AS prospect_name,
            c.full_name AS client_name
          FROM SmartCardApplications s
          JOIN Prospects p ON p.id = s.prospect_id
          LEFT JOIN Clients c ON c.id = s.client_id
          WHERE s.id = @id;
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
  can('smartCardApplications:write'),
  body('prospect_id').isInt().toInt(),
  body('client_id').optional().toInt().isInt({ min: 1 }),
  body('card_number').optional().isString(),
  body('status').isString(),
  body('submitted_at').optional().isISO8601(),
  body('issued_at').optional().isISO8601(),
  body('expires_at').optional().isISO8601(),
  body('notes').optional().isString(),
  handleValidation,
  async (req, res, next) => {
    try {
      const {
        prospect_id,
        client_id = null,
        card_number = null,
        status,
        submitted_at = null,
        issued_at = null,
        expires_at = null,
        notes = null,
      } = req.body;

      const result = await getPool().request()
        .input('prospect_id', prospect_id)
        .input('client_id', client_id)
        .input('card_number', card_number)
        .input('status', status)
        .input('submitted_at', submitted_at)
        .input('issued_at', issued_at)
        .input('expires_at', expires_at)
        .input('notes', notes)
        .query(`
          INSERT INTO SmartCardApplications
            (prospect_id, client_id, card_number, status, submitted_at, issued_at, expires_at, notes, created_at, updated_at, isDeleted)
          OUTPUT INSERTED.*
          VALUES
            (@prospect_id, @client_id, @card_number, @status,
             @submitted_at, @issued_at, @expires_at, @notes, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
        `);

      const row = result.recordset[0];

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'SMARTCARD_APPLICATION_CREATE',
        entity: 'SmartCardApplications',
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
  can('smartCardApplications:write'),
  param('id').toInt().isInt({ min: 1 }),
  body('client_id').optional().toInt().isInt({ min: 1 }),
  body('card_number').optional().isString(),
  body('status').optional().isString(),
  body('submitted_at').optional().isISO8601(),
  body('issued_at').optional().isISO8601(),
  body('expires_at').optional().isISO8601(),
  body('notes').optional().isString(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const {
        client_id = null,
        card_number = null,
        status = null,
        submitted_at = null,
        issued_at = null,
        expires_at = null,
        notes = null,
      } = req.body;

      const result = await getPool().request()
        .input('id', id)
        .input('client_id', client_id)
        .input('card_number', card_number)
        .input('status', status)
        .input('submitted_at', submitted_at)
        .input('issued_at', issued_at)
        .input('expires_at', expires_at)
        .input('notes', notes)
        .query(`
          UPDATE SmartCardApplications
             SET client_id    = COALESCE(@client_id, client_id),
                 card_number  = COALESCE(@card_number, card_number),
                 status       = COALESCE(@status, status),
                 submitted_at = COALESCE(@submitted_at, submitted_at),
                 issued_at    = COALESCE(@issued_at, issued_at),
                 expires_at   = COALESCE(@expires_at, expires_at),
                 notes        = COALESCE(@notes, notes),
                 updated_at   = SYSUTCDATETIME()
           WHERE id = @id AND isDeleted = 0;

          SELECT
            s.*,
            p.full_name AS prospect_name,
            c.full_name AS client_name
          FROM SmartCardApplications s
          JOIN Prospects p ON p.id = s.prospect_id
          LEFT JOIN Clients c ON c.id = s.client_id
          WHERE s.id = @id;
        `);

      const row = result.recordset[0];
      if (!row) return res.status(404).json({ message: 'Not found' });

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'SMARTCARD_APPLICATION_UPDATE',
        entity: 'SmartCardApplications',
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
  can('smartCardApplications:write'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool().request()
        .input('id', id)
        .query(`
          UPDATE SmartCardApplications
             SET isDeleted = 1,
                 updated_at = SYSUTCDATETIME()
           WHERE id = @id AND isDeleted = 0;

          SELECT * FROM SmartCardApplications WHERE id = @id;
        `);
      if (!result.recordset[0]) return res.status(404).json({ message: 'Not found' });

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'SMARTCARD_APPLICATION_DELETE',
        entity: 'SmartCardApplications',
        entityId: id,
      });

      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

export default router;
