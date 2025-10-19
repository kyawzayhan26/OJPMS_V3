import { Router } from 'express';
import { query, body, param } from 'express-validator';
import { getPool } from '../utils/db.js';
import { requireAuth, can } from '../middleware/auth.js';
import { writeAudit } from '../utils/audit.js';
import { handleValidation } from '../middleware/validate.js';
import { paginate } from '../middleware/paginate.js';
import { likeParam, orderByClause } from '../utils/search.js';

const router = Router();

/**
 * GET /interviews
 * Supports: ?search, ?prospect_id, ?employer_id, ?outcome, ?from, ?to, ?page, ?limit, ?sort
 */
router.get(
  '/',
  requireAuth,
  can('interviews:read'),
  query('search').optional().isString(),
  query('prospect_id').optional().toInt().isInt({ min: 1 }),
  query('employer_id').optional().toInt().isInt({ min: 1 }),
  query('outcome').optional().isIn(['Pending','Pass','Fail','NoShow']),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
  query('sort').optional().isString(),
  handleValidation,
  paginate({ maxLimit: 100, defaultLimit: 20 }),
  async (req, res, next) => {
    try {
      const {
        search = '',
        prospect_id = null,
        employer_id = null,
        outcome = null,
        from = null,
        to = null
      } = req.query;
      const { page, limit, offset, sort } = req;

      const q = likeParam(search);
      const orderBy = orderByClause(
        ['created_at', 'updated_at', 'scheduled_time', 'prospect_name', 'employer_name', 'job_title', 'outcome', 'id'],
        sort,
        'created_at DESC'
      );

      const pool = getPool();

      // total
      const totalRs = await pool.request()
        .input('q', q)
        .input('prospect_id', prospect_id)
        .input('employer_id', employer_id)
        .input('outcome', outcome)
        .input('from', from)
        .input('to', to)
        .query(`
          SELECT COUNT(*) AS total
          FROM Interviews i
          LEFT JOIN Prospects    p ON p.id = i.prospect_id
          LEFT JOIN Employers    e ON e.id = i.employer_id
          LEFT JOIN Applications a ON a.id = i.application_id
          LEFT JOIN Jobs         j ON j.id = a.job_id
          WHERE i.isDeleted = 0
            ${prospect_id ? 'AND i.prospect_id = @prospect_id' : ''}
            ${employer_id ? 'AND i.employer_id = @employer_id' : ''}
            ${outcome     ? 'AND i.outcome = @outcome'         : ''}
            ${from        ? 'AND i.scheduled_time >= @from'    : ''}
            ${to          ? 'AND i.scheduled_time <= @to'      : ''}
            AND (
              @q = '%%'
              OR p.full_name     LIKE @q
              OR e.name          LIKE @q
              OR j.title         LIKE @q
              OR i.mode          LIKE @q
              OR i.location      LIKE @q
              OR i.outcome_notes LIKE @q
            );
        `);
      const total = totalRs.recordset[0].total;

      // rows
      const rowsRs = await pool.request()
        .input('q', q)
        .input('prospect_id', prospect_id)
        .input('employer_id', employer_id)
        .input('outcome', outcome)
        .input('from', from)
        .input('to', to)
        .input('limit', limit)
        .input('offset', offset)
        .query(`
          SELECT
            i.*,
            p.full_name AS prospect_name,
            e.name      AS employer_name,
            j.title     AS job_title
          FROM Interviews i
          LEFT JOIN Prospects    p ON p.id = i.prospect_id
          LEFT JOIN Employers    e ON e.id = i.employer_id
          LEFT JOIN Applications a ON a.id = i.application_id
          LEFT JOIN Jobs         j ON j.id = a.job_id
          WHERE i.isDeleted = 0
            ${prospect_id ? 'AND i.prospect_id = @prospect_id' : ''}
            ${employer_id ? 'AND i.employer_id = @employer_id' : ''}
            ${outcome     ? 'AND i.outcome = @outcome'         : ''}
            ${from        ? 'AND i.scheduled_time >= @from'    : ''}
            ${to          ? 'AND i.scheduled_time <= @to'      : ''}
            AND (
              @q = '%%'
              OR p.full_name     LIKE @q
              OR e.name          LIKE @q
              OR j.title         LIKE @q
              OR i.mode          LIKE @q
              OR i.location      LIKE @q
              OR i.outcome_notes LIKE @q
            )
          ${orderBy}
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        `);
      const rows = rowsRs.recordset;

      res.json({ rows, page, pageSize: limit, total, hasMore: offset + rows.length < total });
    } catch (err) { next(err); }
  }
);

/**
 * POST /interviews
 */
router.post(
  '/',
  requireAuth,
  can('interviews:write'),
  body('prospect_id').isInt().toInt(),
  body('application_id').isInt().toInt(),
  body('employer_id').isInt().toInt(),
  body('scheduled_time').isISO8601(),
  body('mode').optional().isString(),
  body('location').optional().isString(),
  handleValidation,
  async (req, res, next) => {
    try {
      const { prospect_id, application_id, employer_id, scheduled_time, mode = null, location = null } = req.body;

      const result = await getPool()
        .request()
        .input('prospect_id', prospect_id)
        .input('application_id', application_id)
        .input('employer_id', employer_id)
        .input('scheduled_time', scheduled_time)
        .input('mode', mode)
        .input('location', location)
        .input('recorded_by', req.user?.userId || null)
        .query(`
          INSERT INTO Interviews
            (prospect_id, application_id, employer_id, scheduled_time, mode, location, outcome, recorded_by, created_at, isDeleted)
          OUTPUT INSERTED.*
          VALUES
            (@prospect_id, @application_id, @employer_id, @scheduled_time, @mode, @location, 'Pending', @recorded_by, SYSUTCDATETIME(), 0);
        `);

      const row = result.recordset[0];
      await writeAudit({ req, actorUserId: req.user?.userId || null, action: 'INTERVIEW_SCHEDULE', entity: 'Interviews', entityId: row.id, details: row });

      res.status(201).json(row);
    } catch (err) { next(err); }
  }
);

// CHANGE outcome/status
router.patch(
  '/:id/outcome',
  requireAuth,
  can('interviews:write'),
  param('id').toInt().isInt({ min: 1 }),
  body('outcome').isIn(['Pending','Pass','Fail','NoShow']),
  body('outcome_notes').optional().isString(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const { outcome, outcome_notes=null } = req.body;

      const result = await getPool().request()
        .input('id', id)
        .input('outcome', outcome)
        .input('outcome_notes', outcome_notes)
        .query(`
          UPDATE Interviews
             SET outcome=@outcome,
                 outcome_notes=COALESCE(@outcome_notes, outcome_notes),
                 updated_at=SYSUTCDATETIME()
           WHERE id=@id AND isDeleted=0;

          SELECT * FROM Interviews WHERE id=@id;
        `);

      const row = result.recordset[0];
      if (!row) return res.status(404).json({ message: 'Not found' });
      await writeAudit({ req, actorUserId: req.user?.userId, action: 'INTERVIEW_OUTCOME_UPDATE', entity: 'Interviews', entityId: id, details: row });
      res.json(row);
    } catch (err) { next(err); }
  }
);

// SOFT DELETE interview
router.delete(
  '/:id',
  requireAuth,
  can('interviews:write'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool().request()
        .input('id', id)
        .query(`
          UPDATE Interviews SET isDeleted=1, updated_at=SYSUTCDATETIME() WHERE id=@id AND isDeleted=0;
          SELECT * FROM Interviews WHERE id=@id;
        `);
      if (!result.recordset[0]) return res.status(404).json({ message: 'Not found' });
      await writeAudit({ req, actorUserId: req.user?.userId, action: 'INTERVIEW_DELETE_SOFT', entity: 'Interviews', entityId: id });
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

export default router;
