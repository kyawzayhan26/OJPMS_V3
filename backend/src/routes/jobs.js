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
 * GET /jobs
 * Supports: ?search, ?employer_id, ?is_active, ?country, ?page, ?limit, ?sort
 */
router.get(
  '/',
  requireAuth,
  can('jobs:read'),
  query('search').optional().isString(),
  query('employer_id').optional().toInt().isInt({ min: 1 }),
  query('is_active').optional().isBoolean().toBoolean(),
  query('country').optional().isString(),
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
  query('sort').optional().isString(),
  handleValidation,
  paginate({ maxLimit: 100, defaultLimit: 20 }),
  async (req, res, next) => {
    try {
      const { search = '', employer_id = null, is_active = null, country = null } = req.query;
      const { page, limit, offset, sort } = req;

      const q = likeParam(search);
      const orderBy = orderByClause(
        ['created_at', 'updated_at', 'title', 'employer_name', 'location_country', 'salary', 'is_active', 'id'],
        sort,
        'created_at DESC'
      );

      const pool = getPool();

      // total
      const totalRs = await pool.request()
        .input('q', q)
        .input('employer_id', employer_id)
        .input('is_active', is_active === null ? null : (is_active ? 1 : 0))
        .input('country', country)
        .query(`
          SELECT COUNT(*) AS total
          FROM Jobs j
          JOIN Employers e ON e.id = j.employer_id
          WHERE j.isDeleted = 0
            ${employer_id ? 'AND j.employer_id = @employer_id' : ''}
            ${country     ? 'AND j.location_country = @country' : ''}
            ${is_active !== null ? 'AND j.is_active = @is_active' : ''}
            AND (
              @q = '%%'
              OR j.title            LIKE @q
              OR e.name             LIKE @q
              OR j.location_country LIKE @q
              OR j.description      LIKE @q
              OR j.requirements     LIKE @q
            );
        `);
      const total = totalRs.recordset[0].total;

      // rows
      const rowsRs = await pool.request()
        .input('q', q)
        .input('employer_id', employer_id)
        .input('is_active', is_active === null ? null : (is_active ? 1 : 0))
        .input('country', country)
        .input('limit', limit)
        .input('offset', offset)
        .query(`
          SELECT
            j.*,
            e.name AS employer_name
          FROM Jobs j
          JOIN Employers e ON e.id = j.employer_id
          WHERE j.isDeleted = 0
            ${employer_id ? 'AND j.employer_id = @employer_id' : ''}
            ${country     ? 'AND j.location_country = @country' : ''}
            ${is_active !== null ? 'AND j.is_active = @is_active' : ''}
            AND (
              @q = '%%'
              OR j.title            LIKE @q
              OR e.name             LIKE @q
              OR j.location_country LIKE @q
              OR j.description      LIKE @q
              OR j.requirements     LIKE @q
            )
          ${orderBy}
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        `);
      const rows = rowsRs.recordset;

      res.json({ rows, page, pageSize: limit, total, hasMore: offset + rows.length < total });
    } catch (err) { next(err); }
  }
);

router.get(
  '/:id',
  requireAuth,
  can('jobs:read'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool().request()
        .input('id', id)
        .query(`
          SELECT j.*, e.name AS employer_name
          FROM Jobs j
          JOIN Employers e ON e.id = j.employer_id
          WHERE j.id = @id AND j.isDeleted = 0;
        `);
      const row = result.recordset[0];
      if (!row) return res.status(404).json({ message: 'Not found' });
      res.json(row);
    } catch (err) { next(err); }
  }
);

/**
 * POST /jobs
 */
router.post(
  '/',
  requireAuth,
  can('jobs:write'),
  body('employer_id').isInt().toInt(),
  body('title').isString().isLength({ min: 2 }),
  body('location_country').isString().isLength({ min: 2 }),
  body('description').optional().isString(),
  body('requirements').optional().isString(),
  body('salary').optional(),
  body('is_active').optional().isBoolean().toBoolean(),
  handleValidation,
  async (req, res, next) => {
    try {
      const {
        employer_id,
        title,
        description = null,
        location_country,
        requirements = null,
        salary = null,
        is_active = true
      } = req.body;

      const result = await getPool()
        .request()
        .input('employer_id', employer_id)
        .input('title', title)
        .input('description', description)
        .input('location_country', location_country)
        .input('requirements', requirements)
        .input('salary', salary)
        .input('is_active', is_active ? 1 : 0)
        .query(`
          INSERT INTO Jobs
            (employer_id, title, description, location_country, requirements, salary, is_active, created_at, isDeleted)
          OUTPUT INSERTED.*
          VALUES
            (@employer_id, @title, @description, @location_country, @requirements, @salary, @is_active, SYSUTCDATETIME(), 0);
        `);

      const row = result.recordset[0];
      await writeAudit({ req, actorUserId: req.user?.userId || null, action: 'JOB_CREATE', entity: 'Jobs', entityId: row.id, details: row });

      res.status(201).json(row);
    } catch (err) { next(err); }
  }
);

// UPDATE job
router.put(
  '/:id',
  requireAuth,
  can('jobs:write'),
  param('id').toInt().isInt({ min: 1 }),
  body('title').isString().isLength({ min: 2 }),
  body('location_country').isString().isLength({ min: 2 }),
  body('description').optional().isString(),
  body('requirements').optional().isString(),
  body('salary').optional(),
  body('is_active').optional().isBoolean().toBoolean(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const { title, description=null, location_country, requirements=null, salary=null, is_active=true } = req.body;

      const result = await getPool().request()
        .input('id', id)
        .input('title', title)
        .input('description', description)
        .input('location_country', location_country)
        .input('requirements', requirements)
        .input('salary', salary)
        .input('is_active', is_active ? 1 : 0)
        .query(`
          UPDATE Jobs
             SET title=@title,
                 description=@description,
                 location_country=@location_country,
                 requirements=@requirements,
                 salary=@salary,
                 is_active=@is_active,
                 updated_at=SYSUTCDATETIME()
           WHERE id=@id AND isDeleted=0;

          SELECT * FROM Jobs WHERE id=@id;
        `);

      const row = result.recordset[0];
      if (!row) return res.status(404).json({ message: 'Not found' });
      await writeAudit({ req, actorUserId: req.user?.userId, action: 'JOB_UPDATE', entity: 'Jobs', entityId: id, details: row });
      res.json(row);
    } catch (err) { next(err); }
  }
);

// SOFT DELETE job
router.delete(
  '/:id',
  requireAuth,
  can('jobs:write'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool().request()
        .input('id', id)
        .query(`
          UPDATE Jobs SET isDeleted=1, updated_at=SYSUTCDATETIME() WHERE id=@id AND isDeleted=0;
          SELECT * FROM Jobs WHERE id=@id;
        `);

      if (!result.recordset[0]) return res.status(404).json({ message: 'Not found' });
      await writeAudit({ req, actorUserId: req.user?.userId, action: 'JOB_DELETE_SOFT', entity: 'Jobs', entityId: id });
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

export default router;
