import { Router } from 'express';
import { query, body, param } from 'express-validator';
import { getPool } from '../utils/db.js';
import { requireAuth, can } from '../middleware/auth.js';
import sql from 'mssql';
import { writeAudit } from '../utils/audit.js';
import { handleValidation } from '../middleware/validate.js';
import { paginate } from '../middleware/paginate.js';
import { likeParam, orderByClause } from '../utils/search.js';

const router = Router();

/**
 * GET /clients
 * Supports: ?search, ?status, ?prospect_id, ?page, ?limit, ?sort
 */
router.get(
  '/',
  requireAuth,
  can('clients:read'),
  query('search').optional().isString(),
  query('status').optional().isIn([
    'SmartCard_InProgress',
    'Visa_InProgress',
    'Payment_Pending',
    'FlightBooking_Pending',
    'Accommodation_Pending',
    'Approved_For_Deployment',
    'Departed'
  ]),
  query('prospect_id').optional().toInt().isInt({ min: 1 }),
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
  query('sort').optional().isString(),
  handleValidation,
  paginate({ maxLimit: 100, defaultLimit: 20 }),
  async (req, res, next) => {
    try {
      const { search = '', status = null, prospect_id = null } = req.query;
      const { page, limit, offset, sort } = req;

      const q = likeParam(search);
      const orderBy = orderByClause(
        ['created_at', 'updated_at', 'full_name', 'passport_no', 'status', 'id'],
        sort,
        'created_at DESC'
      );

      const pool = getPool();

      // total
      const totalRs = await pool.request()
        .input('q', q)
        .input('status', status)
        .input('prospect_id', prospect_id)
        .query(`
          SELECT COUNT(*) AS total
          FROM Clients
          WHERE isDeleted = 0
            ${status       ? 'AND status = @status' : ''}
            ${prospect_id  ? 'AND prospect_id = @prospect_id' : ''}
            AND (
              @q = '%%'
              OR full_name   LIKE @q
              OR passport_no LIKE @q
              OR remarks1    LIKE @q
            );
        `);
      const total = totalRs.recordset[0].total;

      // rows
      const rowsRs = await pool.request()
        .input('q', q)
        .input('status', status)
        .input('prospect_id', prospect_id)
        .input('limit', limit)
        .input('offset', offset)
        .query(`
          SELECT *
          FROM Clients
          WHERE isDeleted = 0
            ${status       ? 'AND status = @status' : ''}
            ${prospect_id  ? 'AND prospect_id = @prospect_id' : ''}
            AND (
              @q = '%%'
              OR full_name   LIKE @q
              OR passport_no LIKE @q
              OR remarks1    LIKE @q
            )
          ${orderBy}
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        `);
      const rows = rowsRs.recordset;

      res.json({ rows, page, pageSize: limit, total, hasMore: offset + rows.length < total });
    } catch (err) { next(err); }
  }
);

// CREATE client
router.post(
  '/',
  requireAuth,
  can('clients:write'),
  body('prospect_id').isInt().toInt(),
  body('full_name').isString().isLength({ min: 2 }),
  body('passport_no').optional().isString(),
  body('status').isIn([
    'SmartCard_InProgress','Visa_InProgress','Payment_Pending','FlightBooking_Pending',
    'Accommodation_Pending','Approved_For_Deployment','Departed'
  ]),
  handleValidation,
  async (req, res, next) => {
    const pool = getPool();
    const tx = new (await import('mssql')).default.Transaction(pool);
    try {
      await tx.begin();
      const { prospect_id, full_name, passport_no=null, status, remarks1=null } = req.body;

      const ins = await new (await import('mssql')).default.Request(tx)
        .input('prospect_id', (await import('mssql')).default.BigInt, prospect_id)
        .input('full_name', (await import('mssql')).default.VarChar, full_name)
        .input('passport_no', (await import('mssql')).default.VarChar, passport_no)
        .input('status', (await import('mssql')).default.VarChar, status)
        .input('remarks1', (await import('mssql')).default.NVarChar, remarks1)
        .query(`
          INSERT INTO Clients (prospect_id, full_name, passport_no, status, remarks1, created_at, isDeleted)
          OUTPUT INSERTED.*
          VALUES (@prospect_id, @full_name, @passport_no, @status, @remarks1, SYSUTCDATETIME(), 0);
        `);
      const row = ins.recordset[0];

      await new (await import('mssql')).default.Request(tx)
        .input('client_id', (await import('mssql')).default.BigInt, row.id)
        .input('status', (await import('mssql')).default.VarChar, status)
        .input('changed_by', (await import('mssql')).default.BigInt, req.user?.userId || null)
        .query(`
          INSERT INTO ClientStatusHistory (client_id, from_status, to_status, changed_by, changed_at, remarks)
          VALUES (@client_id, @status, @status, @changed_by, SYSUTCDATETIME(), N'Client created');
        `);

      await tx.commit();
      await writeAudit({ req, actorUserId: req.user?.userId, action: 'CLIENT_CREATE', entity: 'Clients', entityId: row.id, details: row });
      res.status(201).json(row);
    } catch (err) {
      try { await tx.rollback(); } catch(_) {}
      next(err);
    }
  }
);

// SOFT DELETE client
router.delete(
  '/:id',
  requireAuth,
  can('clients:write'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool().request()
        .input('id', id)
        .query(`
          UPDATE Clients SET isDeleted=1, updated_at=SYSUTCDATETIME() WHERE id=@id AND isDeleted=0;
          SELECT * FROM Clients WHERE id=@id;
        `);
      if (!result.recordset[0]) return res.status(404).json({ message: 'Not found' });
      await writeAudit({ req, actorUserId: req.user?.userId, action: 'CLIENT_DELETE_SOFT', entity: 'Clients', entityId: id });
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

// UPDATE client status
router.patch(
  '/:id/status',
  requireAuth,
  can('clients:write'),
  param('id').toInt().isInt({ min: 1 }),
  body('to_status').isIn([
    'SmartCard_InProgress',
    'Visa_InProgress',
    'Payment_Pending',
    'FlightBooking_Pending',
    'Accommodation_Pending',
    'Approved_For_Deployment',
    'Departed',
  ]),
  body('remarks').optional().isString(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const { to_status, remarks = null } = req.body;

      const pool = getPool();
      const tx = new sql.Transaction(pool);
      await tx.begin();

      let from_status;
      try {
        const r1 = await new sql.Request(tx)
          .input('id', sql.BigInt, id)
          .query(`SELECT TOP 1 status FROM Clients WHERE id=@id AND isDeleted=0`);

        if (!r1.recordset[0]) {
          const e = new Error('Client not found');
          e.status = 404;
          throw e;
        }
        from_status = r1.recordset[0].status;

        if (from_status === to_status) {
          await tx.rollback();
          return res.status(200).json({ ok: true, from_status, to_status, note: 'No change' });
        }

        await new sql.Request(tx)
          .input('id', sql.BigInt, id)
          .input('to_status', sql.NVarChar, to_status)
          .query(`
            UPDATE Clients
               SET status = @to_status,
                   updated_at = SYSUTCDATETIME()
             WHERE id = @id
          `);

        await new sql.Request(tx)
          .input('client_id', sql.BigInt, id)
          .input('from_status', sql.NVarChar, from_status)
          .input('to_status', sql.NVarChar, to_status)
          .input('changed_by', sql.BigInt, req.user?.userId || null)
          .input('remarks', sql.NVarChar, remarks)
          .query(`
            INSERT INTO ClientStatusHistory
              (client_id, from_status, to_status, changed_by, changed_at, remarks)
            VALUES
              (@client_id, @from_status, @to_status, @changed_by, SYSUTCDATETIME(), @remarks)
          `);

        await tx.commit();
      } catch (e) {
        await tx.rollback();
        throw e;
      }

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'CLIENT_STATUS_CHANGE',
        entity: 'Clients',
        entityId: id,
        details: { from_status, to_status, remarks }
      });

      return res.json({ ok: true, from_status, to_status });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
