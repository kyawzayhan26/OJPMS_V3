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
 * GET /employers
 * Supports: ?search, ?country, ?page, ?limit, ?sort
 */
router.get(
  '/',
  requireAuth,
  can('employers:read'),
  query('search').optional().isString(),
  query('country').optional().isString(),
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
  query('sort').optional().isString(),
  handleValidation,
  paginate({ maxLimit: 100, defaultLimit: 20 }),
  async (req, res, next) => {
    try {
      const { search = '', country = null } = req.query;
      const { page, limit, offset, sort } = req;

      const q = likeParam(search);
      const orderBy = orderByClause(
        ['created_at', 'updated_at', 'name', 'country', 'contact_name', 'contact_email', 'contact_phone', 'id'],
        sort,
        'created_at DESC'
      );

      const pool = getPool();

      // total
      const totalRs = await pool.request()
        .input('q', q)
        .input('country', country)
        .query(`
          SELECT COUNT(*) AS total
          FROM Employers
          WHERE isDeleted = 0
            ${country ? 'AND country = @country' : ''}
            AND (
              @q = '%%'
              OR name          LIKE @q
              OR country       LIKE @q
              OR contact_name  LIKE @q
              OR contact_email LIKE @q
              OR contact_phone LIKE @q
              OR address       LIKE @q
            );
        `);
      const total = totalRs.recordset[0].total;

      // rows
      const rowsRs = await pool.request()
        .input('q', q)
        .input('country', country)
        .input('limit', limit)
        .input('offset', offset)
        .query(`
          SELECT *
          FROM Employers
          WHERE isDeleted = 0
            ${country ? 'AND country = @country' : ''}
            AND (
              @q = '%%'
              OR name          LIKE @q
              OR country       LIKE @q
              OR contact_name  LIKE @q
              OR contact_email LIKE @q
              OR contact_phone LIKE @q
              OR address       LIKE @q
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
 * POST /employers
 */
router.post(
  '/',
  requireAuth,
  can('employers:write'),
  body('name').isString().isLength({ min: 2 }),
  body('country').isString().isLength({ min: 2 }),
  body('contact_phone').isString().isLength({ min: 6 }),
  body('contact_email').optional().isEmail().normalizeEmail(),
  handleValidation,
  async (req, res, next) => {
    try {
      const { name, country, contact_name = null, contact_email = null, contact_phone = null, address = null } = req.body;

      const result = await getPool()
        .request()
        .input('name', name)
        .input('country', country)
        .input('contact_name', contact_name)
        .input('contact_email', contact_email)
        .input('contact_phone', contact_phone)
        .input('address', address)
        .query(`
          INSERT INTO Employers (name, country, contact_name, contact_email, contact_phone, address, created_at, isDeleted)
          OUTPUT INSERTED.*
          VALUES (@name, @country, @contact_name, @contact_email, @contact_phone, @address, SYSUTCDATETIME(), 0);
        `);

      const row = result.recordset[0];
      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'EMPLOYER_CREATE',
        entity: 'Employers',
        entityId: row.id,
        details: row
      });

      res.status(201).json(row);
    } catch (err) { next(err); }
  }
);

// UPDATE employer
router.put(
  '/:id',
  requireAuth,
  can('employers:write'),
  param('id').toInt().isInt({ min: 1 }),
  body('name').isString().isLength({ min: 2 }),
  body('country').isString().isLength({ min: 2 }),
  body('contact_phone').isString().isLength({ min: 6 }),
  body('contact_email').optional().isEmail().normalizeEmail(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const { name, country, contact_name = null, contact_email = null, contact_phone = null, address = null } = req.body;

      const result = await getPool().request()
        .input('id', id)
        .input('name', name)
        .input('country', country)
        .input('contact_name', contact_name)
        .input('contact_email', contact_email)
        .input('contact_phone', contact_phone)
        .input('address', address)
        .query(`
          UPDATE Employers
             SET name=@name,
                 country=@country,
                 contact_name=@contact_name,
                 contact_email=@contact_email,
                 contact_phone=@contact_phone,
                 address=@address,
                 updated_at = SYSUTCDATETIME()
           WHERE id=@id AND isDeleted=0;

          SELECT * FROM Employers WHERE id=@id;
        `);

      const row = result.recordset[0];
      if (!row) return res.status(404).json({ message: 'Not found' });

      await writeAudit({ req, actorUserId: req.user?.userId, action: 'EMPLOYER_UPDATE', entity: 'Employers', entityId: id, details: row });
      res.json(row);
    } catch (err) { next(err); }
  }
);

// SOFT DELETE employer
router.delete(
  '/:id',
  requireAuth,
  can('employers:write'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool().request()
        .input('id', id)
        .query(`
          UPDATE Employers SET isDeleted=1, updated_at=SYSUTCDATETIME() WHERE id=@id AND isDeleted=0;
          SELECT * FROM Employers WHERE id=@id;
        `);

      if (!result.recordset[0]) return res.status(404).json({ message: 'Not found' });
      await writeAudit({ req, actorUserId: req.user?.userId, action: 'EMPLOYER_DELETE_SOFT', entity: 'Employers', entityId: id });
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

export default router;
