import { Router } from 'express';
import { query, body } from 'express-validator';
import { getPool } from '../utils/db.js';
import { requireAuth, can } from '../middleware/auth.js';
import { writeAudit } from '../utils/audit.js';
import { handleValidation } from '../middleware/validate.js';
import { paginate } from '../middleware/paginate.js';
import { likeParam, orderByClause } from '../utils/search.js';

const router = Router();

/**
 * GET /payments
 * Supports: ?search, ?client_id, ?status, ?currency, ?min_amount, ?max_amount, ?from, ?to, ?page, ?limit, ?sort
 */
router.get(
  '/',
  requireAuth,
  can('payments:read'),
  query('search').optional().isString(),
  query('client_id').optional().toInt().isInt({ min: 1 }),
  query('status').optional().isIn(['Pending', 'Paid', 'Waived', 'Refunded']),
  query('currency').optional().isLength({ min: 3, max: 3 }),
  query('min_amount').optional().toFloat().isFloat({ min: 0 }),
  query('max_amount').optional().toFloat().isFloat({ min: 0 }),
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
        client_id = null,
        status = null,
        currency = null,
        min_amount = null,
        max_amount = null,
        from = null,
        to = null
      } = req.query;

      const { page, limit, offset, sort } = req;

      const q = likeParam(search);
      const orderBy = orderByClause(
        ['created_at', 'collected_at', 'amount', 'currency', 'status', 'client_name', 'id'],
        sort,
        'created_at DESC'
      );

      const pool = getPool();

      // total
      const totalRs = await pool.request()
        .input('q', q)
        .input('client_id', client_id)
        .input('status', status)
        .input('currency', currency)
        .input('min_amount', min_amount)
        .input('max_amount', max_amount)
        .input('from', from)
        .input('to', to)
        .query(`
          SELECT COUNT(*) AS total
          FROM Payments p
          LEFT JOIN Clients c ON c.id = p.client_id
          WHERE 1=1
            ${client_id ? 'AND p.client_id = @client_id' : ''}
            ${status    ? 'AND p.status    = @status'    : ''}
            ${currency  ? 'AND p.currency  = @currency'  : ''}
            ${min_amount !== null ? 'AND p.amount >= @min_amount' : ''}
            ${max_amount !== null ? 'AND p.amount <= @max_amount' : ''}
            ${from ? 'AND p.created_at >= @from' : ''}
            ${to   ? 'AND p.created_at <= @to'   : ''}
            AND (
              @q = '%%'
              OR c.full_name    LIKE @q
              OR p.reference_no LIKE @q
              OR p.currency     LIKE @q
            );
        `);
      const total = totalRs.recordset[0].total;

      // rows
      const rowsRs = await pool.request()
        .input('q', q)
        .input('client_id', client_id)
        .input('status', status)
        .input('currency', currency)
        .input('min_amount', min_amount)
        .input('max_amount', max_amount)
        .input('from', from)
        .input('to', to)
        .input('limit', limit)
        .input('offset', offset)
        .query(`
          SELECT
            p.*,
            c.full_name AS client_name
          FROM Payments p
          LEFT JOIN Clients c ON c.id = p.client_id
          WHERE 1=1
            ${client_id ? 'AND p.client_id = @client_id' : ''}
            ${status    ? 'AND p.status    = @status'    : ''}
            ${currency  ? 'AND p.currency  = @currency'  : ''}
            ${min_amount !== null ? 'AND p.amount >= @min_amount' : ''}
            ${max_amount !== null ? 'AND p.amount <= @max_amount' : ''}
            ${from ? 'AND p.created_at >= @from' : ''}
            ${to   ? 'AND p.created_at <= @to'   : ''}
            AND (
              @q = '%%'
              OR c.full_name    LIKE @q
              OR p.reference_no LIKE @q
              OR p.currency     LIKE @q
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
 * POST /payments
 */
router.post(
  '/',
  requireAuth,
  can('payments:write'),
  body('client_id').isInt().toInt(),
  body('amount').isFloat({ gt: 0 }),
  body('currency').isLength({ min: 3, max: 3 }),
  body('status').isIn(['Pending', 'Paid', 'Waived', 'Refunded']),
  body('reference_no').optional().isString(),
  handleValidation,
  async (req, res, next) => {
    try {
      const { client_id, amount, currency, status, reference_no = null } = req.body;

      const result = await getPool()
        .request()
        .input('client_id', client_id)
        .input('amount', amount)
        .input('currency', currency)
        .input('status', status)
        .input('collected_by', req.user?.userId || null)
        .input('reference_no', reference_no)
        .query(`
          INSERT INTO Payments
            (client_id, amount, currency, status, collected_by, collected_at, reference_no, created_at)
          OUTPUT INSERTED.*
          VALUES
            (
              @client_id, @amount, @currency, @status, @collected_by,
              CASE WHEN @status='Paid' THEN SYSUTCDATETIME() ELSE NULL END,
              @reference_no, SYSUTCDATETIME()
            );
        `);

      const row = result.recordset[0];
      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'PAYMENT_CREATE',
        entity: 'Payments',
        entityId: row.id,
        details: row
      });

      res.status(201).json(row);
    } catch (err) { next(err); }
  }
);

export default router;
