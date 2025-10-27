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
  can('flightBookings:read'),
  query('search').optional().isString(),
  query('client_id').optional().toInt().isInt({ min: 1 }),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
  query('sort').optional().isString(),
  handleValidation,
  paginate({ maxLimit: 100, defaultLimit: 20 }),
  async (req, res, next) => {
    try {
      const { search = '', client_id = null, from = null, to = null } = req.query;
      const { page, limit, offset, sort } = req;

      const q = likeParam(search);
      const orderBy = orderByClause(
        ['flight_datetime', 'created_at', 'airline', 'booking_reference', 'id'],
        sort,
        'flight_datetime DESC'
      );

      const pool = getPool();

      const totalRs = await pool.request()
        .input('q', q)
        .input('client_id', client_id)
        .input('from', from)
        .input('to', to)
        .query(`
          SELECT COUNT(*) AS total
            FROM FlightBookings f
            JOIN Clients c ON c.id = f.client_id
           WHERE f.isDeleted = 0
             ${client_id ? 'AND f.client_id = @client_id' : ''}
             ${from ? 'AND f.flight_datetime >= @from' : ''}
             ${to ? 'AND f.flight_datetime <= @to' : ''}
             AND (
               @q = '%%'
               OR f.airline LIKE @q
               OR f.booking_reference LIKE @q
               OR f.remarks LIKE @q
               OR c.full_name LIKE @q
             );
        `);
      const total = totalRs.recordset[0]?.total ?? 0;

      const rowsRs = await pool.request()
        .input('q', q)
        .input('client_id', client_id)
        .input('from', from)
        .input('to', to)
        .input('limit', limit)
        .input('offset', offset)
        .query(`
          SELECT f.*, c.full_name AS client_name
            FROM FlightBookings f
            JOIN Clients c ON c.id = f.client_id
           WHERE f.isDeleted = 0
             ${client_id ? 'AND f.client_id = @client_id' : ''}
             ${from ? 'AND f.flight_datetime >= @from' : ''}
             ${to ? 'AND f.flight_datetime <= @to' : ''}
             AND (
               @q = '%%'
               OR f.airline LIKE @q
               OR f.booking_reference LIKE @q
               OR f.remarks LIKE @q
               OR c.full_name LIKE @q
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
  can('flightBookings:read'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const result = await getPool().request()
        .input('id', id)
        .query(`
          SELECT f.*, c.full_name AS client_name
            FROM FlightBookings f
            JOIN Clients c ON c.id = f.client_id
           WHERE f.id = @id;
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
  can('flightBookings:write'),
  body('client_id').isInt().toInt(),
  body('airline').isString().isLength({ min: 2 }),
  body('flight_datetime').isISO8601(),
  body('booking_reference').isString().isLength({ min: 2 }),
  body('remarks').optional({ checkFalsy: true, nullable: true }).isString(),
  handleValidation,
  async (req, res, next) => {
    try {
      const { client_id, airline, flight_datetime, booking_reference } = req.body;
      const remarks = normalizeNullable(req.body.remarks);
      const result = await getPool().request()
        .input('client_id', client_id)
        .input('airline', airline)
        .input('flight_datetime', flight_datetime)
        .input('booking_reference', booking_reference)
        .input('remarks', remarks)
        .query(`
          INSERT INTO FlightBookings (
            client_id, airline, flight_datetime, booking_reference, remarks, created_at, updated_at, isDeleted
          )
          OUTPUT INSERTED.*
          VALUES (
            @client_id, @airline, @flight_datetime, @booking_reference, @remarks,
            SYSUTCDATETIME(), SYSUTCDATETIME(), 0
          );
        `);

      const row = result.recordset[0];

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'FLIGHT_BOOKING_CREATE',
        entity: 'FlightBookings',
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
  can('flightBookings:write'),
  param('id').toInt().isInt({ min: 1 }),
  body('client_id').optional({ checkFalsy: true, nullable: true }).toInt().isInt({ min: 1 }),
  body('airline').optional().isString().isLength({ min: 2 }),
  body('flight_datetime').optional().isISO8601(),
  body('booking_reference').optional().isString().isLength({ min: 2 }),
  body('remarks').optional({ checkFalsy: true, nullable: true }).isString(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const client_id = req.body.client_id ?? null;
      const airline = normalizeNullable(req.body.airline);
      const flight_datetime = normalizeNullable(req.body.flight_datetime);
      const booking_reference = normalizeNullable(req.body.booking_reference);
      const remarks = normalizeNullable(req.body.remarks);

      const result = await getPool().request()
        .input('id', id)
        .input('client_id', client_id)
        .input('airline', airline)
        .input('flight_datetime', flight_datetime)
        .input('booking_reference', booking_reference)
        .input('remarks', remarks)
        .query(`
          UPDATE FlightBookings
             SET client_id         = COALESCE(@client_id, client_id),
                 airline           = COALESCE(@airline, airline),
                 flight_datetime   = COALESCE(@flight_datetime, flight_datetime),
                 booking_reference = COALESCE(@booking_reference, booking_reference),
                 remarks           = COALESCE(@remarks, remarks),
                 updated_at        = SYSUTCDATETIME()
           WHERE id = @id AND isDeleted = 0;

          SELECT f.*, c.full_name AS client_name
            FROM FlightBookings f
            JOIN Clients c ON c.id = f.client_id
           WHERE f.id = @id;
        `);

      const row = result.recordset[0];
      if (!row) return res.status(404).json({ message: 'Not found' });

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'FLIGHT_BOOKING_UPDATE',
        entity: 'FlightBookings',
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
  can('flightBookings:write'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const result = await getPool().request()
        .input('id', id)
        .query(`
          UPDATE FlightBookings
             SET isDeleted = 1,
                 updated_at = SYSUTCDATETIME()
           WHERE id = @id AND isDeleted = 0;

          SELECT * FROM FlightBookings WHERE id = @id;
        `);

      if (!result.recordset[0]) return res.status(404).json({ message: 'Not found' });

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'FLIGHT_BOOKING_DELETE',
        entity: 'FlightBookings',
        entityId: id,
      });

      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

export default router;
