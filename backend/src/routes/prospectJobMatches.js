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
  can('prospectJobMatches:read'),
  query('search').optional().isString(),
  query('status').optional().isString(),
  query('prospect_id').optional().toInt().isInt({ min: 1 }),
  query('job_id').optional().toInt().isInt({ min: 1 }),
  query('is_current').optional().isBoolean().toBoolean(),
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
  query('sort').optional().isString(),
  handleValidation,
  paginate({ maxLimit: 100, defaultLimit: 20 }),
  async (req, res, next) => {
    try {
      const { search = '', status = null, prospect_id = null, job_id = null, is_current = null } = req.query;
      const { page, limit, offset, sort } = req;

      const q = likeParam(search);
      const orderBy = orderByClause(
        ['created_at', 'updated_at', 'status', 'prospect_name', 'job_title', 'id'],
        sort,
        'created_at DESC'
      );

      const pool = getPool();

      const totalRs = await pool.request()
        .input('q', q)
        .input('status', status)
        .input('prospect_id', prospect_id)
        .input('job_id', job_id)
        .input('is_current', is_current === null ? null : (is_current ? 1 : 0))
        .query(`
          SELECT COUNT(*) AS total
          FROM ProspectJobMatches m
          JOIN Prospects p ON p.id = m.prospect_id
          JOIN Jobs j ON j.id = m.job_id
          WHERE m.[insDeleted] = 0
            ${status      ? 'AND m.status = @status'           : ''}
            ${prospect_id ? 'AND m.prospect_id = @prospect_id' : ''}
            ${job_id      ? 'AND m.job_id = @job_id'           : ''}
            ${is_current !== null ? 'AND m.is_current = @is_current' : ''}
            AND (
              @q = '%%'
              OR p.full_name LIKE @q
              OR j.title      LIKE @q
              OR m.rationale  LIKE @q
            );
        `);
      const total = totalRs.recordset[0]?.total ?? 0;

      const rowsRs = await pool.request()
        .input('q', q)
        .input('status', status)
        .input('prospect_id', prospect_id)
        .input('job_id', job_id)
        .input('is_current', is_current === null ? null : (is_current ? 1 : 0))
        .input('limit', limit)
        .input('offset', offset)
        .query(`
          SELECT
            m.*,
            p.full_name AS prospect_name,
            j.title     AS job_title
          FROM ProspectJobMatches m
          JOIN Prospects p ON p.id = m.prospect_id
          JOIN Jobs j ON j.id = m.job_id
          WHERE m.[insDeleted] = 0
            ${status      ? 'AND m.status = @status'           : ''}
            ${prospect_id ? 'AND m.prospect_id = @prospect_id' : ''}
            ${job_id      ? 'AND m.job_id = @job_id'           : ''}
            ${is_current !== null ? 'AND m.is_current = @is_current' : ''}
            AND (
              @q = '%%'
              OR p.full_name LIKE @q
              OR j.title      LIKE @q
              OR m.rationale  LIKE @q
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
  '/prospect/:prospectId',
  requireAuth,
  can('prospectJobMatches:read'),
  param('prospectId').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const prospectId = +req.params.prospectId;
      const result = await getPool().request()
        .input('prospect_id', prospectId)
        .query(`
          SELECT TOP 50
            m.*,
            p.full_name AS prospect_name,
            j.title     AS job_title
          FROM ProspectJobMatches m
          JOIN Prospects p ON p.id = m.prospect_id
          JOIN Jobs j ON j.id = m.job_id
          WHERE m.[insDeleted] = 0 AND m.prospect_id = @prospect_id
          ORDER BY m.updated_at DESC, m.created_at DESC;
        `);
      res.json({ rows: result.recordset || [] });
    } catch (err) { next(err); }
  }
);

router.get(
  '/:id',
  requireAuth,
  can('prospectJobMatches:read'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool().request()
        .input('id', id)
        .query(`
          SELECT
            m.*,
            p.full_name AS prospect_name,
            j.title     AS job_title
          FROM ProspectJobMatches m
          JOIN Prospects p ON p.id = m.prospect_id
          JOIN Jobs j ON j.id = m.job_id
          WHERE m.id = @id;
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
  can('prospectJobMatches:write'),
  body('prospect_id').isInt().toInt(),
  body('job_id').isInt().toInt(),
  body('rationale').optional().isString(),
  body('status').optional().isString(),
  body('is_current').optional().isBoolean().toBoolean(),
  handleValidation,
  async (req, res, next) => {
    try {
      const {
        prospect_id,
        job_id,
        rationale = null,
        status = 'pending_review',
        is_current = true,
      } = req.body;

      const pool = getPool();
      const request = pool.request()
        .input('prospect_id', prospect_id)
        .input('job_id', job_id)
        .input('matched_by', req.user?.userId || null)
        .input('status', status)
        .input('rationale', rationale)
        .input('is_current', is_current ? 1 : 0);

      const queryText = `
        IF @is_current = 1
        BEGIN
          UPDATE ProspectJobMatches
             SET is_current = 0,
                 updated_at = SYSUTCDATETIME()
           WHERE prospect_id = @prospect_id AND [insDeleted] = 0;
        END;

        INSERT INTO ProspectJobMatches
          (prospect_id, job_id, matched_by, status, rationale, is_current, created_at, updated_at, [insDeleted])
        OUTPUT INSERTED.*
        VALUES
          (@prospect_id, @job_id, @matched_by, @status, @rationale, @is_current, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
      `;

      const result = await request.query(queryText);
      const row = result.recordset[0];

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'PROSPECT_JOB_MATCH_CREATE',
        entity: 'ProspectJobMatches',
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
  can('prospectJobMatches:write'),
  param('id').toInt().isInt({ min: 1 }),
  body('job_id').optional().toInt().isInt({ min: 1 }),
  body('status').optional().isString(),
  body('rationale').optional().isString(),
  body('is_current').optional().isBoolean().toBoolean(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const {
        job_id = null,
        status = null,
        rationale = null,
        is_current = null,
      } = req.body;

      const pool = getPool();
      const request = pool.request()
        .input('id', id)
        .input('job_id', job_id)
        .input('status', status)
        .input('rationale', rationale)
        .input('is_current', is_current === null ? null : (is_current ? 1 : 0));

      const queryText = `
        DECLARE @prospect_id BIGINT;
        SELECT @prospect_id = prospect_id FROM ProspectJobMatches WHERE id = @id;

        IF @prospect_id IS NULL
        BEGIN
          SELECT NULL AS missing;
          RETURN;
        END;

        IF @is_current = 1
        BEGIN
          UPDATE ProspectJobMatches
             SET is_current = 0,
                 updated_at = SYSUTCDATETIME()
           WHERE prospect_id = @prospect_id AND id <> @id AND [insDeleted] = 0;
        END;

        UPDATE ProspectJobMatches
           SET job_id    = COALESCE(@job_id, job_id),
               status    = COALESCE(@status, status),
               rationale = COALESCE(@rationale, rationale),
               is_current = COALESCE(@is_current, is_current),
               updated_at = SYSUTCDATETIME()
         WHERE id = @id AND [insDeleted] = 0;

        SELECT m.*, p.full_name AS prospect_name, j.title AS job_title
        FROM ProspectJobMatches m
        JOIN Prospects p ON p.id = m.prospect_id
        JOIN Jobs j ON j.id = m.job_id
        WHERE m.id = @id;
      `;

      const result = await request.query(queryText);
      const row = result.recordset[0];
      if (!row || row.missing === null) return res.status(404).json({ message: 'Not found' });

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'PROSPECT_JOB_MATCH_UPDATE',
        entity: 'ProspectJobMatches',
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
  can('prospectJobMatches:write'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool().request()
        .input('id', id)
        .query(`
          UPDATE ProspectJobMatches
             SET [insDeleted] = 1,
                 updated_at = SYSUTCDATETIME()
           WHERE id = @id AND [insDeleted] = 0;

          SELECT * FROM ProspectJobMatches WHERE id = @id;
        `);
      if (!result.recordset[0]) return res.status(404).json({ message: 'Not found' });

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'PROSPECT_JOB_MATCH_DELETE',
        entity: 'ProspectJobMatches',
        entityId: id,
      });

      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

export default router;
