// src/routes/prospects.js
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
 * GET /prospects
 * Supports: ?search, ?page, ?limit, ?sort
 * Search includes full_name, email, phone, passport_no
 */
router.get(
  '/',
  requireAuth,
  can('prospects:read'),
  query('search').optional().isString(),
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
  query('sort').optional().isString(),
  handleValidation,
  paginate({ maxLimit: 100, defaultLimit: 20 }),
  async (req, res, next) => {
    try {
      const { search = '' } = req.query;
      const { page, limit, offset, sort } = req;

      const q = likeParam(search);
      const orderBy = orderByClause(
        ['created_at','full_name','contact_email','contact_phone','passport_no','status','dob'],
        sort,
        'created_at DESC'
      );

      const pool = getPool();

      // total
      const totalRs = await pool.request()
        .input('q', q)
        .query(`
          SELECT COUNT(*) AS total
          FROM Prospects
          WHERE isDeleted=0 AND (
            @q='%%'
            OR full_name     LIKE @q
            OR contact_email LIKE @q
            OR contact_phone LIKE @q
            OR passport_no   LIKE @q
          );
        `);
      const total = totalRs.recordset[0].total;

      // rows
      const rowsRs = await pool.request()
        .input('q', q)
        .input('limit', limit)
        .input('offset', offset)
        .query(`
          SELECT
            id,
            full_name,
            dob,
            passport_no,
            contact_phone,
            contact_email,
            address,
            highest_qualification,
            status,
            interested_job_id,
            remarks1,
            remarks2,
            created_at,
            updated_at
          FROM Prospects
          WHERE isDeleted=0 AND (
            @q='%%'
            OR full_name     LIKE @q
            OR contact_email LIKE @q
            OR contact_phone LIKE @q
            OR passport_no   LIKE @q
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
 * POST /prospects
 * Uses latest schema (no created_by). Defaults status to 'enquiry'.
 */
router.post(
  '/',
  requireAuth,
  can('prospects:write'),
  body('full_name').isString().isLength({ min: 2 }),
  body('contact_phone').isString().isLength({ min: 6 }),
  body('contact_email').optional().isEmail().normalizeEmail(),
  body('dob').optional().isISO8601().withMessage('dob must be an ISO date (YYYY-MM-DD)'),
  body('passport_no').optional().isString().trim(),
  body('address').optional().isString(),
  body('highest_qualification').optional().isString(),
  body('status').optional().isIn([
    'enquiry','job_matched','jobmatch_approved',
    'application_drafted','application_submitted',
    'interview_scheduled','interview_passed'
  ]),
  body('interested_job_id').optional().toInt().isInt({ min: 1 }),
  body('remarks1').optional().isString(),
  body('remarks2').optional().isString(),
  handleValidation,
  async (req, res, next) => {
    try {
      const {
        full_name,
        contact_phone,
        contact_email = null,
        dob = null,
        passport_no = null,
        address = null,
        highest_qualification = null,
        status = 'enquiry',
        interested_job_id = null,
        remarks1 = null,
        remarks2 = null
      } = req.body;

      const result = await getPool().request()
        .input('full_name', full_name)
        .input('dob', dob)
        .input('passport_no', passport_no)
        .input('contact_phone', contact_phone)
        .input('contact_email', contact_email)
        .input('address', address)
        .input('highest_qualification', highest_qualification)
        .input('status', status)
        .input('interested_job_id', interested_job_id)
        .input('remarks1', remarks1)
        .input('remarks2', remarks2)
        .query(`
          INSERT INTO Prospects
            (full_name, dob, passport_no, contact_email, contact_phone, address,
             highest_qualification, status, interested_job_id, remarks1, remarks2,
             created_at, isDeleted)
          OUTPUT INSERTED.*
          VALUES
            (@full_name, @dob, @passport_no, @contact_email, @contact_phone, @address,
             @highest_qualification, @status, @interested_job_id, @remarks1, @remarks2,
             SYSUTCDATETIME(), 0);
        `);

      const row = result.recordset[0];
      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'PROSPECT_CREATE',
        entity: 'Prospects',
        entityId: row.id,
        details: row
      });

      res.status(201).json(row);
    } catch (err) { next(err); }
  }
);

// UPDATE prospect (includes all updatable columns per schema)
router.put(
  '/:id',
  requireAuth,
  can('prospects:write'),
  param('id').toInt().isInt({ min: 1 }),
  body('full_name').optional().isString().isLength({ min: 2 }),
  body('contact_phone').optional().isString().isLength({ min: 6 }),
  body('contact_email').optional().isEmail().normalizeEmail(),
  body('dob').optional().isISO8601(),
  body('passport_no').optional().isString(),
  body('address').optional().isString(),
  body('highest_qualification').optional().isString(),
  body('status').optional().isIn([
    'enquiry','job_matched','jobmatch_approved',
    'application_drafted','application_submitted',
    'interview_scheduled','interview_passed'
  ]),
  body('interested_job_id').optional().toInt().isInt({ min: 1 }),
  body('remarks1').optional().isString(),
  body('remarks2').optional().isString(),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const {
        full_name = null,
        contact_phone = null,
        contact_email = null,
        dob = null,
        passport_no = null,
        address = null,
        highest_qualification = null,
        status = null,
        interested_job_id = null,
        remarks1 = null,
        remarks2 = null
      } = req.body;

      const result = await getPool().request()
        .input('id', id)
        .input('full_name', full_name)
        .input('contact_phone', contact_phone)
        .input('contact_email', contact_email)
        .input('dob', dob)
        .input('passport_no', passport_no)
        .input('address', address)
        .input('highest_qualification', highest_qualification)
        .input('status', status)
        .input('interested_job_id', interested_job_id)
        .input('remarks1', remarks1)
        .input('remarks2', remarks2)
        .query(`
          UPDATE Prospects
             SET full_name             = COALESCE(@full_name, full_name),
                 contact_phone         = COALESCE(@contact_phone, contact_phone),
                 contact_email         = COALESCE(@contact_email, contact_email),
                 dob                   = COALESCE(@dob, dob),
                 passport_no           = COALESCE(@passport_no, passport_no),
                 address               = COALESCE(@address, address),
                 highest_qualification = COALESCE(@highest_qualification, highest_qualification),
                 status                = COALESCE(@status, status),
                 interested_job_id     = COALESCE(@interested_job_id, interested_job_id),
                 remarks1              = COALESCE(@remarks1, remarks1),
                 remarks2              = COALESCE(@remarks2, remarks2),
                 updated_at            = SYSUTCDATETIME()
           WHERE id=@id AND isDeleted=0;

          SELECT * FROM Prospects WHERE id=@id;
        `);

      const row = result.recordset[0];
      if (!row) return res.status(404).json({ message: 'Not found' });

      await writeAudit({
        req,
        actorUserId: req.user?.userId,
        action: 'PROSPECT_UPDATE',
        entity: 'Prospects',
        entityId: id,
        details: row
      });
      res.json(row);
    } catch (err) { next(err); }
  }
);

// CHANGE status (kept with history if table exists)
router.patch(
  '/:id/status',
  requireAuth,
  can('prospects:write'),
  param('id').toInt().isInt({ min: 1 }),
  body('to_status').isIn([
    'enquiry','job_matched','jobmatch_approved',
    'application_drafted','application_submitted',
    'interview_scheduled','interview_passed'
  ]),
  body('remarks').optional().isString(),
  handleValidation,
  async (req, res, next) => {
    const pool = getPool();
    const sql = (await import('mssql')).default;
    const tx = new sql.Transaction(pool);
    try {
      const id = +req.params.id;
      const { to_status, remarks=null } = req.body;

      await tx.begin();
      const cur = await new sql.Request(tx).input('id', sql.BigInt, id)
        .query(`SELECT TOP 1 status FROM Prospects WHERE id=@id AND isDeleted=0`);
      if (!cur.recordset[0]) { await tx.rollback(); return res.status(404).json({ message: 'Not found' }); }
      const from_status = cur.recordset[0].status;

      await new sql.Request(tx)
        .input('id', sql.BigInt, id)
        .input('to_status', sql.VarChar, to_status)
        .query(`UPDATE Prospects SET status=@to_status, updated_at=SYSUTCDATETIME() WHERE id=@id`);

      // Write history if table exists
      try {
        await new sql.Request(tx)
          .input('prospect_id', sql.BigInt, id)
          .input('from_status', sql.VarChar, from_status)
          .input('to_status', sql.VarChar, to_status)
          .input('changed_by', sql.BigInt, req.user?.userId || null)
          .input('remarks', sql.NVarChar, remarks)
          .query(`
            INSERT INTO ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, changed_at, remarks)
            VALUES (@prospect_id, @from_status, @to_status, @changed_by, SYSUTCDATETIME(), @remarks);
          `);
      } catch (_) {}

      await tx.commit();
      await writeAudit({
        req,
        actorUserId: req.user?.userId,
        action: 'PROSPECT_STATUS_CHANGE',
        entity: 'Prospects',
        entityId: id,
        details: { from_status, to_status, remarks }
      });
      res.json({ ok: true, from_status, to_status });
    } catch (err) {
      try { await tx.rollback(); } catch(_) {}
      next(err);
    }
  }
);

// SOFT DELETE
router.delete(
  '/:id',
  requireAuth,
  can('prospects:write'),
  param('id').toInt().isInt({ min: 1 }),
  async (req, res, next) => {
    try {
      const id = +req.params.id;
      const result = await getPool().request()
        .input('id', id)
        .query(`
          UPDATE Prospects SET isDeleted=1, updated_at=SYSUTCDATETIME() WHERE id=@id AND isDeleted=0;
          SELECT * FROM Prospects WHERE id=@id;
        `);
      if (!result.recordset[0]) return res.status(404).json({ message: 'Not found' });
      await writeAudit({ req, actorUserId: req.user?.userId, action: 'PROSPECT_DELETE_SOFT', entity: 'Prospects', entityId: id });
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

export default router;
