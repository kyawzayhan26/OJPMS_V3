// src/routes/clients.js
import { Router } from 'express';
import { query, body, param } from 'express-validator';
import { getPool } from '../utils/db.js';
import { requireAuth, can, canAny } from '../middleware/auth.js';
import sql from 'mssql';
import { writeAudit } from '../utils/audit.js';
import { handleValidation } from '../middleware/validate.js';
import { paginate } from '../middleware/paginate.js';
import { likeParam, orderByClause } from '../utils/search.js';
import { normalizeNullable } from '../utils/normalize.js';

const CLIENT_STATUSES = [
  'Newly_Promoted',
  'SmartCard_InProgress',
  'Visa_InProgress',
  'Payment_Pending',
  'FlightBooking_Pending',
  'Accommodation_Pending',
  'Approved_For_Deployment',
  'Departed'
];

const CLIENT_STATUSES = [
  'Newly_Promoted',
  'SmartCard_InProgress',
  'Visa_InProgress',
  'Payment_Pending',
  'FlightBooking_Pending',
  'Accommodation_Pending',
  'Approved_For_Deployment',
  'Departed'
];

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
  query('status').optional().isIn(CLIENT_STATUSES),
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
          FROM Clients c
          LEFT JOIN Prospects p ON p.id = c.prospect_id
          WHERE c.isDeleted = 0
            ${status       ? 'AND c.status = @status' : ''}
            ${prospect_id  ? 'AND c.prospect_id = @prospect_id' : ''}
            AND (
              @q = '%%'
              OR c.full_name   LIKE @q
              OR c.passport_no LIKE @q
              OR c.remarks1    LIKE @q
              OR p.full_name   LIKE @q
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
          SELECT c.*, p.full_name AS prospect_name
          FROM Clients c
          LEFT JOIN Prospects p ON p.id = c.prospect_id
          WHERE c.isDeleted = 0
            ${status       ? 'AND c.status = @status' : ''}
            ${prospect_id  ? 'AND c.prospect_id = @prospect_id' : ''}
            AND (
              @q = '%%'
              OR c.full_name   LIKE @q
              OR c.passport_no LIKE @q
              OR c.remarks1    LIKE @q
              OR p.full_name   LIKE @q
            )
          ${orderBy}
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        `);
      const rows = rowsRs.recordset;

      res.json({ rows, page, pageSize: limit, total, hasMore: offset + rows.length < total });
    } catch (err) { next(err); }
  }
);

// GET single client by id
router.get(
  '/:id',
  requireAuth,
  can('clients:read'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const result = await getPool()
        .request()
        .input('id', id)
        .query(`
          SELECT c.*, p.full_name AS prospect_name
            FROM Clients c
            LEFT JOIN Prospects p ON p.id = c.prospect_id
           WHERE c.id = @id AND c.isDeleted = 0;
        `);

      const row = result.recordset[0];
      if (!row) return res.status(404).json({ message: 'Not found' });
      res.json(row);
    } catch (err) { next(err); }
  }
);

// CREATE client (uses all available fields from schema)
router.post(
  '/',
  requireAuth,
  can('clients:write'),
  body('prospect_id').isInt().toInt(),
  body('full_name').isString().isLength({ min: 2 }),
  body('passport_no').optional({ checkFalsy: true, nullable: true }).isString(),
  body('status').isIn(CLIENT_STATUSES),
  body('remarks1').optional({ checkFalsy: true, nullable: true }).isString(),
  handleValidation,
  async (req, res, next) => {
    const pool = getPool();
    const tx = new sql.Transaction(pool);
    try {
      await tx.begin();
      const { prospect_id, full_name, status } = req.body;
      const passport_no = normalizeNullable(req.body.passport_no);
      const remarks1 = normalizeNullable(req.body.remarks1);

      // Insert client
      const ins = await new sql.Request(tx)
        .input('prospect_id', sql.BigInt, prospect_id)
        .input('full_name', sql.VarChar, full_name)
        .input('passport_no', sql.VarChar, passport_no)
        .input('status', sql.VarChar, status)
        .input('remarks1', sql.NVarChar, remarks1)
        .query(`
          INSERT INTO Clients (prospect_id, full_name, passport_no, status, remarks1, created_at, isDeleted)
          OUTPUT INSERTED.*
          VALUES (@prospect_id, @full_name, @passport_no, @status, @remarks1, SYSUTCDATETIME(), 0);
        `);
      const row = ins.recordset[0];

      // Status history
      await new sql.Request(tx)
        .input('client_id', sql.BigInt, row.id)
        .input('status', sql.VarChar, status)
        .input('changed_by', sql.BigInt, req.user?.userId || null)
        .query(`
          INSERT INTO ClientStatusHistory (client_id, from_status, to_status, changed_by, changed_at, remarks)
          VALUES (@client_id, @status, @status, @changed_by, SYSUTCDATETIME(), N'Client created');
        `);

      await tx.commit();

      await writeAudit({
        req,
        actorUserId: req.user?.userId,
        action: 'CLIENT_CREATE',
        entity: 'Clients',
        entityId: row.id,
        details: row
      });

      res.status(201).json(row);
    } catch (err) {
      try { await tx.rollback(); } catch(_) {}
      next(err);
    }
  }
);

// UPDATE client (non-status fields)
router.put(
  '/:id',
  requireAuth,
  can('clients:write'),
  param('id').toInt().isInt({ min: 1 }),
  body('prospect_id').optional().toInt().isInt({ min: 1 }),
  body('full_name').optional().isString().isLength({ min: 2 }),
  body('passport_no').optional({ checkFalsy: true, nullable: true }).isString(),
  body('remarks1').optional({ checkFalsy: true, nullable: true }).isString(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const prospect_id = req.body.prospect_id ?? null;
      const full_name = normalizeNullable(req.body.full_name) || null;
      const passport_no = normalizeNullable(req.body.passport_no);
      const remarks1 = normalizeNullable(req.body.remarks1);

      const result = await getPool().request()
        .input('id', id)
        .input('prospect_id', prospect_id)
        .input('full_name', full_name)
        .input('passport_no', passport_no)
        .input('remarks1', remarks1)
        .query(`
          UPDATE Clients
             SET prospect_id = COALESCE(@prospect_id, prospect_id),
                 full_name   = COALESCE(@full_name, full_name),
                 passport_no = COALESCE(@passport_no, passport_no),
                 remarks1    = COALESCE(@remarks1, remarks1),
                 updated_at  = SYSUTCDATETIME()
           WHERE id=@id AND isDeleted=0;

          SELECT * FROM Clients WHERE id=@id;
        `);

      const row = result.recordset[0];
      if (!row) return res.status(404).json({ message: 'Not found' });

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'CLIENT_UPDATE',
        entity: 'Clients',
        entityId: id,
        details: row
      });

      res.json(row);
    } catch (err) { next(err); }
  }
);

router.get(
  '/:id/history',
  requireAuth,
  can('clients:read'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const result = await getPool()
        .request()
        .input('id', id)
        .query(`
          SELECT TOP 50
            h.*,
            COALESCE(u.full_name, u.name) AS changed_by_name,
            u.email                       AS changed_by_email
          FROM ClientStatusHistory h
          LEFT JOIN Users u ON u.id = h.changed_by
          WHERE h.client_id = @id
          ORDER BY h.changed_at DESC;

          SELECT TOP 50
            a.*,
            COALESCE(u.full_name, u.name) AS actor_name,
            u.email                       AS actor_email
          FROM AuditLogs a
          LEFT JOIN Users u ON u.id = a.actor_user_id
          WHERE a.entity = 'Clients' AND a.entity_id = @id
          ORDER BY a.created_at DESC;
        `);

      const [statusHistory = [], auditLogs = []] = result.recordsets || [];
      res.json({ statusHistory, auditLogs });
    } catch (err) { next(err); }
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

      await writeAudit({
        req,
        actorUserId: req.user?.userId,
        action: 'CLIENT_DELETE_SOFT',
        entity: 'Clients',
        entityId: id
      });

      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

// UPDATE client status with workflow side-effects
router.patch(
  '/:id/status',
  requireAuth,
  canAny(['clients:write', 'clients:transition']),
  param('id').toInt().isInt({ min: 1 }),
  body('to_status').isIn(CLIENT_STATUSES),
  body('remarks').optional().isString(),
  handleValidation,
  async (req, res, next) => {
    const pool = getPool();
    const tx = new sql.Transaction(pool);
    try {
      await tx.begin();
      const id = Number(req.params.id);
      const to_status = req.body.to_status;
      let remarks = normalizeNullable(req.body.remarks);
      const context = req.body || {};
      const userId = req.user?.userId || null;

      const currentRes = await new sql.Request(tx)
        .input('id', sql.BigInt, id)
        .query('SELECT TOP 1 status FROM Clients WHERE id=@id AND isDeleted=0;');
      const currentRow = currentRes.recordset[0];
      if (!currentRow) {
        await tx.rollback();
        return res.status(404).json({ message: 'Client not found' });
      }

      const from_status = currentRow.status;
      if (from_status === to_status) {
        await tx.rollback();
        return res.json({ ok: true, from_status, to_status, note: 'No change' });
      }

      const fromIndex = CLIENT_STATUSES.indexOf(from_status);
      const toIndex = CLIENT_STATUSES.indexOf(to_status);
      if (fromIndex === -1 || toIndex === -1) {
        await tx.rollback();
        return res.status(400).json({ message: 'Unsupported status transition.' });
      }
      if (toIndex <= fromIndex) {
        await tx.rollback();
        return res.status(400).json({ message: 'Clients cannot move backwards in the pipeline.' });
      }
      if (toIndex - fromIndex > 1) {
        await tx.rollback();
        return res.status(400).json({ message: 'Clients must progress one stage at a time.' });
      }

      const meta = {};
      const transitionKey = `${from_status}->${to_status}`;

      switch (transitionKey) {
        case 'Newly_Promoted->SmartCard_InProgress': {
          const smartcard = context.smartcard || {};
          const applicationId = Number(smartcard.application_id);
          if (!Number.isInteger(applicationId) || applicationId <= 0) {
            await tx.rollback();
            return res.status(400).json({ message: 'application_id is required for SmartCard processing.' });
          }
          const scRemarks = smartcard.remarks ? smartcard.remarks.toString().trim() : null;
          const scInsert = await new sql.Request(tx)
            .input('client_id', sql.BigInt, id)
            .input('application_id', sql.BigInt, applicationId)
            .input('status', sql.NVarChar, 'Drafted')
            .input('attempt_count', sql.Int, 0)
            .input('remarks', sql.NVarChar, scRemarks)
            .query(`
              INSERT INTO SmartCardProcesses
                (client_id, application_id, status, attempt_count, remarks, created_at, updated_at, isDeleted)
              OUTPUT INSERTED.*
              VALUES
                (@client_id, @application_id, @status, @attempt_count, @remarks, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
            `);
          meta.smartcard_process = scInsert.recordset[0];
          if (!remarks) remarks = scRemarks || `SmartCard process started (application #${applicationId}).`;
          break;
        }
        case 'SmartCard_InProgress->Visa_InProgress': {
          const visa = context.visa || {};
          const applicationId = Number(visa.application_id);
          if (!Number.isInteger(applicationId) || applicationId <= 0) {
            await tx.rollback();
            return res.status(400).json({ message: 'application_id is required for Visa processing.' });
          }
          const visaType = visa.visa_type ? visa.visa_type.toString().trim() : null;
          const visaRemarks = visa.remarks ? visa.remarks.toString().trim() : null;
          const visaInsert = await new sql.Request(tx)
            .input('client_id', sql.BigInt, id)
            .input('application_id', sql.BigInt, applicationId)
            .input('visa_type', sql.NVarChar, visaType)
            .input('status', sql.NVarChar, 'Drafted')
            .input('attempt_count', sql.Int, 0)
            .input('remarks', sql.NVarChar, visaRemarks)
            .query(`
              INSERT INTO VisaProcesses
                (client_id, application_id, visa_type, status, attempt_count, remarks, created_at, updated_at, isDeleted)
              OUTPUT INSERTED.*
              VALUES
                (@client_id, @application_id, @visa_type, @status, @attempt_count, @remarks, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
            `);
          meta.visa_process = visaInsert.recordset[0];
          if (!remarks) remarks = visaRemarks || `Visa process started (application #${applicationId}).`;
          break;
        }
        case 'Visa_InProgress->Payment_Pending': {
          const payment = context.payment || {};
          const amount = Number(payment.amount);
          if (!Number.isFinite(amount) || amount <= 0) {
            await tx.rollback();
            return res.status(400).json({ message: 'Valid payment amount is required.' });
          }
          const currency = (payment.currency || '').toString().trim().toUpperCase();
          if (!currency || currency.length !== 3) {
            await tx.rollback();
            return res.status(400).json({ message: 'Currency must be a 3-letter code.' });
          }
          const referenceNo = (payment.reference_no || '').toString().trim();
          if (!referenceNo) {
            await tx.rollback();
            return res.status(400).json({ message: 'Payment reference number is required.' });
          }
          const invoiceDescription = payment.invoice_description ? payment.invoice_description.toString().trim() : null;
          const paymentInsert = await new sql.Request(tx)
            .input('client_id', sql.BigInt, id)
            .input('amount', sql.Decimal(18, 2), Number(amount.toFixed(2)))
            .input('currency', sql.VarChar, currency)
            .input('status', sql.NVarChar, 'Pending')
            .input('collected_by', sql.BigInt, userId)
            .input('reference_no', sql.NVarChar, referenceNo)
            .input('invoice_description', sql.NVarChar, invoiceDescription)
            .query(`
              INSERT INTO Payments (
                client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description, created_at
              )
              OUTPUT INSERTED.*
              VALUES (
                @client_id, @amount, @currency, @status, @collected_by, NULL, @reference_no, @invoice_description, SYSUTCDATETIME()
              );
            `);
          meta.payment = paymentInsert.recordset[0];
          if (!remarks) remarks = `Payment initiated (ref ${referenceNo}).`;
          break;
        }
        case 'Payment_Pending->FlightBooking_Pending': {
          const flight = context.flight || {};
          const airline = flight.airline ? flight.airline.toString().trim() : null;
          const bookingRef = flight.booking_reference ? flight.booking_reference.toString().trim() : null;
          const flightTimeRaw = flight.flight_datetime ? new Date(flight.flight_datetime) : null;
          if (!airline) {
            await tx.rollback();
            return res.status(400).json({ message: 'Airline is required for flight booking.' });
          }
          if (!bookingRef) {
            await tx.rollback();
            return res.status(400).json({ message: 'Flight booking reference is required.' });
          }
          if (!flightTimeRaw || Number.isNaN(flightTimeRaw.getTime())) {
            await tx.rollback();
            return res.status(400).json({ message: 'Valid flight date/time is required.' });
          }
          const flightRemarks = flight.remarks ? flight.remarks.toString().trim() : null;
          const flightInsert = await new sql.Request(tx)
            .input('client_id', sql.BigInt, id)
            .input('airline', sql.NVarChar, airline)
            .input('flight_datetime', sql.DateTime2, flightTimeRaw)
            .input('booking_reference', sql.NVarChar, bookingRef)
            .input('remarks', sql.NVarChar, flightRemarks)
            .query(`
              INSERT INTO FlightBookings
                (client_id, airline, flight_datetime, booking_reference, remarks, created_at, updated_at, isDeleted)
              OUTPUT INSERTED.*
              VALUES
                (@client_id, @airline, @flight_datetime, @booking_reference, @remarks, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
            `);
          meta.flight_booking = flightInsert.recordset[0];
          if (!remarks) remarks = flightRemarks || `Flight booked (${airline}).`;
          break;
        }
        case 'FlightBooking_Pending->Accommodation_Pending': {
          const accommodation = context.accommodation || {};
          const type = accommodation.type ? accommodation.type.toString().trim() : null;
          const details = accommodation.details ? accommodation.details.toString().trim() : null;
          if (!type || !details) {
            await tx.rollback();
            return res.status(400).json({ message: 'Accommodation type and details are required.' });
          }
          await new sql.Request(tx)
            .input('id', sql.BigInt, id)
            .input('type', sql.NVarChar, type)
            .input('details', sql.NVarChar, details)
            .query(`
              UPDATE Clients
                 SET accommodation_type = @type,
                     accommodation_details = @details,
                     updated_at = SYSUTCDATETIME()
               WHERE id = @id;
            `);
          meta.accommodation = { type, details };
          if (!remarks) remarks = `Accommodation arranged (${type}).`;
          break;
        }
        case 'Accommodation_Pending->Approved_For_Deployment': {
          if ((req.user?.role || '').toLowerCase() !== 'admin') {
            await tx.rollback();
            return res.status(403).json({ message: 'Only administrators can approve deployment.' });
          }
          if (!remarks) remarks = 'Deployment approved.';
          break;
        }
        case 'Approved_For_Deployment->Departed': {
          if (!remarks) remarks = 'Client departed.';
          break;
        }
        default: {
          await tx.rollback();
          return res.status(400).json({ message: 'Transition not supported yet.' });
        }
      }

      await new sql.Request(tx)
        .input('id', sql.BigInt, id)
        .input('status', sql.NVarChar, to_status)
        .query(`
          UPDATE Clients
             SET status = @status,
                 updated_at = SYSUTCDATETIME()
           WHERE id = @id;
        `);

      await new sql.Request(tx)
        .input('client_id', sql.BigInt, id)
        .input('from_status', sql.NVarChar, from_status)
        .input('to_status', sql.NVarChar, to_status)
        .input('changed_by', sql.BigInt, userId)
        .input('remarks', sql.NVarChar, remarks)
        .query(`
          INSERT INTO ClientStatusHistory
            (client_id, from_status, to_status, changed_by, changed_at, remarks)
          VALUES
            (@client_id, @from_status, @to_status, @changed_by, SYSUTCDATETIME(), @remarks);
        `);

      await tx.commit();

      await writeAudit({
        req,
        actorUserId: userId,
        action: 'CLIENT_STATUS_CHANGE',
        entity: 'Clients',
        entityId: id,
        details: { from_status, to_status, remarks, meta }
      });

      return res.json({ ok: true, from_status, to_status, meta });
    } catch (err) {
      try { await tx.rollback(); } catch (_) { /* ignore */ }
      next(err);
    }
  }
);

export default router;
