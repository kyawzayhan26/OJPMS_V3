// src/routes/applications.js
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

/**
 * GET /applications
 * Supports: ?search, ?status, ?prospect_id, ?job_id, ?page, ?limit, ?sort
 */
router.get('/',
  requireAuth,
  can('applications:read'),
  query('search').optional().isString(),
  query('status').optional().isIn(['Draft','Submitted','Rejected','Shortlisted']),
  query('prospect_id').optional().toInt().isInt({ min: 1 }),
  query('job_id').optional().toInt().isInt({ min: 1 }),
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
  query('sort').optional().isString(),
  handleValidation,
  paginate({ maxLimit: 100, defaultLimit: 20 }),
  async (req, res, next) => {
    try {
      const { search = '', status = null, prospect_id = null, job_id = null } = req.query;
      const { page, limit, offset, sort } = req;

      const q = likeParam(search);
      const orderBy = orderByClause(
        ['created_at', 'status', 'prospect_name', 'job_title', 'submitted_at', 'employer_response_at', 'updated_at', 'id'],
        sort,
        'created_at DESC'
      );

      const pool = getPool();

      // total
      const totalRs = await pool.request()
        .input('q', q)
        .input('status', status)
        .input('prospect_id', prospect_id)
        .input('job_id', job_id)
        .query(`
          SELECT COUNT(*) AS total
          FROM Applications a
          JOIN Prospects p ON p.id = a.prospect_id
          JOIN Jobs j      ON j.id = a.job_id
          WHERE a.isDeleted = 0
            ${status       ? 'AND a.status = @status'           : ''}
            ${prospect_id  ? 'AND a.prospect_id = @prospect_id' : ''}
            ${job_id       ? 'AND a.job_id = @job_id'           : ''}
            AND (
              @q = '%%'
              OR p.full_name LIKE @q
              OR j.title     LIKE @q
              OR a.notes     LIKE @q
            );
        `);
      const total = totalRs.recordset[0].total;

      // rows
      const rowsRs = await pool.request()
        .input('q', q)
        .input('status', status)
        .input('prospect_id', prospect_id)
        .input('job_id', job_id)
        .input('limit', limit)
        .input('offset', offset)
        .query(`
          SELECT
            a.*,
            p.full_name AS prospect_name,
            j.title     AS job_title
          FROM Applications a
          JOIN Prospects p ON p.id = a.prospect_id
          JOIN Jobs j      ON j.id = a.job_id
          WHERE a.isDeleted = 0
            ${status       ? 'AND a.status = @status'           : ''}
            ${prospect_id  ? 'AND a.prospect_id = @prospect_id' : ''}
            ${job_id       ? 'AND a.job_id = @job_id'           : ''}
            AND (
              @q = '%%'
              OR p.full_name LIKE @q
              OR j.title     LIKE @q
              OR a.notes     LIKE @q
            )
          ${orderBy}
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        `);
      const rows = rowsRs.recordset;

      res.json({
        rows,
        page,
        pageSize: limit,
        total,
        hasMore: offset + rows.length < total
      });
    } catch (err) { next(err); }
  }
);

/**
 * POST /applications
 * Uses all relevant fields (including employer_response_at)
 * - submitted_at set on first Submitted
 * - employer_response_at set if status in (Rejected, Shortlisted) and none provided
 */
router.post('/',
  requireAuth,
  can('applications:write'),
  body('prospect_id').isInt().toInt(),
  body('job_id').isInt().toInt(),
  body('status').isIn(['Draft', 'Submitted', 'Rejected', 'Shortlisted']),
  body('notes').optional({ checkFalsy: true, nullable: true }).isString(),
  body('employer_response_at').optional({ checkFalsy: true, nullable: true }).isISO8601(),
  handleValidation,
  async (req, res, next) => {
    try {
      const { prospect_id, job_id, status } = req.body;
      const notes = normalizeNullable(req.body.notes);
      const employer_response_at = normalizeNullable(req.body.employer_response_at);

      const result = await getPool().request()
        .input('prospect_id', prospect_id)
        .input('job_id', job_id)
        .input('submitted_by', req.user?.userId || null)
        .input('status', status)
        .input('notes', notes)
        .input('employer_response_at', employer_response_at)
        .query(`
          INSERT INTO Applications (
            prospect_id, job_id, submitted_by, status, submitted_at, employer_response_at, notes, created_at, isDeleted
          )
          OUTPUT INSERTED.*
          VALUES (
            @prospect_id,
            @job_id,
            @submitted_by,
            @status,
            CASE WHEN @status='Submitted' THEN SYSUTCDATETIME() ELSE NULL END,
            CASE
              WHEN @employer_response_at IS NOT NULL THEN @employer_response_at
              WHEN @status IN ('Rejected','Shortlisted') THEN SYSUTCDATETIME()
              ELSE NULL
            END,
            @notes,
            SYSUTCDATETIME(),
            0
          );
        `);

      const row = result.recordset[0];
      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'APPLICATION_CREATE',
        entity: 'Applications',
        entityId: row.id,
        details: row
      });

      res.status(201).json(row);
    } catch (err) { next(err); }
  }
);

// UPDATE application (status/notes/employer_response_at)
// - preserves first submitted_at timestamp
// - sets employer_response_at if moving to Rejected/Shortlisted and not provided
router.put(
  '/:id',
  requireAuth,
  can('applications:write'),
  param('id').toInt().isInt({ min: 1 }),
  body('status').optional().isIn(['Draft','Submitted','Rejected','Shortlisted']),
  body('notes').optional({ checkFalsy: true, nullable: true }).isString(),
  body('employer_response_at').optional({ checkFalsy: true, nullable: true }).isISO8601(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const { status = null } = req.body;
      const notes = normalizeNullable(req.body.notes);
      const employer_response_at = normalizeNullable(req.body.employer_response_at);

      const result = await getPool().request()
        .input('id', id)
        .input('status', status)
        .input('notes', notes)
        .input('employer_response_at', employer_response_at)
        .query(`
          UPDATE Applications
             SET status = COALESCE(@status, status),
                 submitted_at =
                   CASE
                     WHEN @status='Submitted' THEN ISNULL(submitted_at, SYSUTCDATETIME())
                     ELSE submitted_at
                   END,
                 employer_response_at =
                   CASE
                     WHEN @employer_response_at IS NOT NULL THEN @employer_response_at
                     WHEN @status IN ('Rejected','Shortlisted') THEN ISNULL(employer_response_at, SYSUTCDATETIME())
                     ELSE employer_response_at
                   END,
                 updated_at = SYSUTCDATETIME(),
                 notes = COALESCE(@notes, notes)
           WHERE id=@id AND isDeleted=0;

          SELECT * FROM Applications WHERE id=@id;
        `);

      const row = result.recordset[0];
      if (!row) return res.status(404).json({ message: 'Not found' });

      await writeAudit({
        req,
        actorUserId: req.user?.userId,
        action: 'APPLICATION_UPDATE',
        entity: 'Applications',
        entityId: id,
        details: row
      });
      res.json(row);
    } catch (err) { next(err); }
  }
);

// SOFT DELETE application
router.delete(
  '/:id',
  requireAuth,
  can('applications:write'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool().request()
        .input('id', id)
        .query(`
          UPDATE Applications SET isDeleted=1, updated_at=SYSUTCDATETIME() WHERE id=@id AND isDeleted=0;
          SELECT * FROM Applications WHERE id=@id;
        `);
      if (!result.recordset[0]) return res.status(404).json({ message: 'Not found' });

      await writeAudit({
        req,
        actorUserId: req.user?.userId,
        action: 'APPLICATION_DELETE_SOFT',
        entity: 'Applications',
        entityId: id
      });
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

export default router;
