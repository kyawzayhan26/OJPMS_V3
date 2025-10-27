// src/routes/prospects.js
import { Router } from 'express';
import { query, body, param } from 'express-validator';
import { getPool } from '../utils/db.js';
import { requireAuth, can, Roles } from '../middleware/auth.js';
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

// GET single prospect
router.get(
  '/:id',
  requireAuth,
  can('prospects:read'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const result = await getPool()
        .request()
        .input('id', id)
        .query(`
          SELECT *
            FROM Prospects
           WHERE id = @id AND isDeleted = 0;
        `);
      const row = result.recordset[0];
      if (!row) return res.status(404).json({ message: 'Not found' });
      res.json(row);
    } catch (err) { next(err); }
  }
);

router.get(
  '/:id/history',
  requireAuth,
  can('prospects:read'),
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
            u.name  AS changed_by_name,
            u.email AS changed_by_email
          FROM ProspectStatusHistory h
          LEFT JOIN Users u ON u.id = h.changed_by
          WHERE h.prospect_id = @id
          ORDER BY h.changed_at DESC;

          SELECT TOP 50
            a.*,
            u.name  AS actor_name,
            u.email AS actor_email
          FROM AuditLogs a
          LEFT JOIN Users u ON u.id = a.actor_user_id
          WHERE a.entity = 'Prospects' AND a.entity_id = @id
          ORDER BY a.created_at DESC;
        `);

      const [statusHistory = [], auditLogs = []] = result.recordsets || [];
      res.json({ statusHistory, auditLogs });
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

// CHANGE status with transition side-effects and history
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
      const { to_status } = req.body;
      let remarks = req.body.remarks != null ? req.body.remarks.toString() : null;

      await tx.begin();
      const currentRs = await new sql.Request(tx)
        .input('id', sql.BigInt, id)
        .query(`SELECT TOP 1 status, interested_job_id FROM Prospects WHERE id=@id AND isDeleted=0`);
      const currentRow = currentRs.recordset[0];
      if (!currentRow) {
        await tx.rollback();
        return res.status(404).json({ message: 'Not found' });
      }

      const from_status = currentRow.status || 'enquiry';
      if (from_status === to_status) {
        await tx.rollback();
        return res.status(400).json({ message: 'Prospect is already in that status.' });
      }

      const ORDER = [
        'enquiry',
        'job_matched',
        'jobmatch_approved',
        'application_drafted',
        'application_submitted',
        'interview_scheduled',
        'interview_passed',
      ];
      const fromIndex = ORDER.indexOf(from_status);
      const toIndex = ORDER.indexOf(to_status);

      if (fromIndex === -1 || toIndex === -1) {
        await tx.rollback();
        return res.status(400).json({ message: 'Unsupported status transition.' });
      }
      if (toIndex <= fromIndex) {
        await tx.rollback();
        return res.status(400).json({ message: 'Cannot move a prospect backwards in the pipeline.' });
      }
      if (toIndex - fromIndex > 1) {
        await tx.rollback();
        return res.status(400).json({ message: 'Prospects must progress one stage at a time.' });
      }

      const userId = req.user?.userId || null;
      const meta = {};
      let setInterestedJobId = null;

      const transitionKey = `${from_status}->${to_status}`;

      switch (transitionKey) {
        case 'enquiry->job_matched': {
          const matchIdRaw = req.body.match_id;
          if (matchIdRaw) {
            const matchId = Number(matchIdRaw);
            if (!Number.isInteger(matchId) || matchId <= 0) {
              await tx.rollback();
              return res.status(400).json({ message: 'Invalid job match reference provided.' });
            }

            const matchLookup = await new sql.Request(tx)
              .input('match_id', sql.BigInt, matchId)
              .input('prospect_id', sql.BigInt, id)
              .query(`
                SELECT TOP 1 *
                FROM ProspectJobMatches
                WHERE id=@match_id AND prospect_id=@prospect_id AND isDeleted = 0;
              `);
            const match = matchLookup.recordset[0];
            if (!match) {
              await tx.rollback();
              return res.status(400).json({ message: 'Job match not found for this prospect.' });
            }

            await new sql.Request(tx)
              .input('prospect_id', sql.BigInt, id)
              .input('match_id', sql.BigInt, match.id)
              .query(`
                UPDATE ProspectJobMatches
                   SET is_current = CASE WHEN id=@match_id THEN 1 ELSE 0 END,
                       status = CASE WHEN id=@match_id AND status IS NULL THEN 'pending_review' ELSE status END,
                       updated_at = SYSUTCDATETIME()
                 WHERE prospect_id = @prospect_id AND isDeleted = 0;
              `);

            meta.job_match = { ...match, is_current: 1, status: match.status || 'pending_review' };
            setInterestedJobId = match.job_id;
            if (!remarks) remarks = req.body.rationale?.toString() || 'Job match recorded.';
          } else {
            const jobIdRaw = req.body.job_id;
            const jobId = Number(jobIdRaw);
            const rationale = (req.body.rationale || '').toString().trim();
            if (!Number.isInteger(jobId) || jobId <= 0) {
              await tx.rollback();
              return res.status(400).json({ message: 'A valid interested job ID is required.' });
            }

            await new sql.Request(tx)
              .input('prospect_id', sql.BigInt, id)
              .query(`
                UPDATE ProspectJobMatches
                   SET is_current = 0,
                       updated_at = SYSUTCDATETIME()
                 WHERE prospect_id = @prospect_id AND isDeleted = 0;
              `);

            const matchRes = await new sql.Request(tx)
              .input('prospect_id', sql.BigInt, id)
              .input('job_id', sql.BigInt, jobId)
              .input('matched_by', sql.BigInt, userId)
              .input('status', sql.VarChar, 'pending_review')
              .input('rationale', sql.NVarChar, rationale || null)
              .query(`
                INSERT INTO ProspectJobMatches
                  (prospect_id, job_id, matched_by, status, rationale, is_current, created_at, updated_at, isDeleted)
                OUTPUT INSERTED.*
                VALUES
                  (@prospect_id, @job_id, @matched_by, @status, @rationale, 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
              `);

            meta.job_match = matchRes.recordset[0];
            setInterestedJobId = jobId;
            if (!remarks) remarks = rationale || 'Job match created.';
          }
          break;
        }
        case 'job_matched->jobmatch_approved': {
          if (req.user?.role !== Roles.Admin) {
            await tx.rollback();
            return res.status(403).json({ message: 'Forbidden: only admins may approve job matches.' });
          }
          const matchRes = await new sql.Request(tx)
            .input('prospect_id', sql.BigInt, id)
            .query(`
              SELECT TOP 1 *
              FROM ProspectJobMatches
              WHERE prospect_id=@prospect_id AND isDeleted=0 AND is_current=1
              ORDER BY updated_at DESC, created_at DESC;
            `);
          const match = matchRes.recordset[0];
          if (!match) {
            await tx.rollback();
            return res.status(400).json({ message: 'No active job match found to approve.' });
          }
          await new sql.Request(tx)
            .input('match_id', sql.BigInt, match.id)
            .query(`
              UPDATE ProspectJobMatches
                 SET status='approved',
                     updated_at=SYSUTCDATETIME()
               WHERE id=@match_id;
            `);
          meta.job_match = { ...match, status: 'approved' };
          if (!remarks) remarks = 'Job match approved.';
          break;
        }
        case 'jobmatch_approved->application_drafted': {
          const notes = (req.body.notes ?? null) === null ? null : req.body.notes.toString();
          const matchRes = await new sql.Request(tx)
            .input('prospect_id', sql.BigInt, id)
            .query(`
              SELECT TOP 1 *
              FROM ProspectJobMatches
              WHERE prospect_id=@prospect_id AND isDeleted=0 AND is_current=1 AND status='approved'
              ORDER BY updated_at DESC, created_at DESC;
            `);
          const match = matchRes.recordset[0];
          if (!match) {
            await tx.rollback();
            return res.status(400).json({ message: 'Approved job match required to draft an application.' });
          }

          const providedAppId = req.body.application_id;
          if (providedAppId) {
            const appId = Number(providedAppId);
            if (!Number.isInteger(appId) || appId <= 0) {
              await tx.rollback();
              return res.status(400).json({ message: 'Invalid application reference provided.' });
            }
            const existingAppRes = await new sql.Request(tx)
              .input('app_id', sql.BigInt, appId)
              .input('prospect_id', sql.BigInt, id)
              .query(`
                SELECT TOP 1 *
                FROM Applications
                WHERE id=@app_id AND prospect_id=@prospect_id AND isDeleted=0;
              `);
            const existingApp = existingAppRes.recordset[0];
            if (!existingApp) {
              await tx.rollback();
              return res.status(400).json({ message: 'Application not found for this prospect.' });
            }
            if (existingApp.status !== 'Draft') {
              await tx.rollback();
              return res.status(400).json({ message: 'Application must be in Draft status.' });
            }
            if (existingApp.job_id !== match.job_id) {
              await tx.rollback();
              return res.status(400).json({ message: 'Application job does not match the approved job match.' });
            }
            meta.application = existingApp;
            if (!remarks) remarks = notes || 'Application draft recorded.';
          } else {
            const appRes = await new sql.Request(tx)
              .input('prospect_id', sql.BigInt, id)
              .input('job_id', sql.BigInt, match.job_id)
              .input('submitted_by', sql.BigInt, userId)
              .input('notes', sql.NVarChar, notes)
              .query(`
                INSERT INTO Applications (
                  prospect_id, job_id, submitted_by, status, submitted_at, employer_response_at, notes, created_at, isDeleted
                )
                OUTPUT INSERTED.*
                VALUES (
                  @prospect_id,
                  @job_id,
                  @submitted_by,
                  'Draft',
                  NULL,
                  NULL,
                  @notes,
                  SYSUTCDATETIME(),
                  0
                );
              `);
            meta.application = appRes.recordset[0];
            if (!remarks) remarks = notes || 'Application draft created.';
          }
          break;
        }
        case 'application_drafted->application_submitted': {
          const appIdRaw = req.body.application_id;
          const appRequest = new sql.Request(tx)
            .input('prospect_id', sql.BigInt, id);
          if (appIdRaw) {
            const appId = Number(appIdRaw);
            if (!Number.isInteger(appId) || appId <= 0) {
              await tx.rollback();
              return res.status(400).json({ message: 'Invalid application ID.' });
            }
            appRequest.input('app_id', sql.BigInt, appId);
          }
          const appRes = await appRequest.query(`
            SELECT TOP 1 id
            FROM Applications
            WHERE prospect_id=@prospect_id AND isDeleted=0 AND status='Draft'
              ${appIdRaw ? 'AND id=@app_id' : ''}
            ORDER BY updated_at DESC, created_at DESC;
          `);
          const draft = appRes.recordset[0];
          if (!draft) {
            await tx.rollback();
            return res.status(400).json({ message: 'No draft application found for this prospect.' });
          }
          await new sql.Request(tx)
            .input('app_id', sql.BigInt, draft.id)
            .query(`
              UPDATE Applications
                 SET status='Submitted',
                     submitted_at=COALESCE(submitted_at, SYSUTCDATETIME()),
                     updated_at=SYSUTCDATETIME()
               WHERE id=@app_id AND isDeleted=0;
            `);
          meta.application = { id: draft.id, status: 'Submitted' };
          if (!remarks) remarks = 'Application submitted.';
          break;
        }
        case 'application_submitted->interview_scheduled': {
          const scheduledTime = req.body.scheduled_time;
          const appIdRaw = req.body.application_id;
          const appRequest = new sql.Request(tx)
            .input('prospect_id', sql.BigInt, id);
          if (appIdRaw) {
            const appId = Number(appIdRaw);
            if (!Number.isInteger(appId) || appId <= 0) {
              await tx.rollback();
              return res.status(400).json({ message: 'Invalid application ID.' });
            }
            appRequest.input('app_id', sql.BigInt, appId);
          }
          const appRes = await appRequest.query(`
            SELECT TOP 1 a.id, a.job_id, j.employer_id
            FROM Applications a
            JOIN Jobs j ON j.id = a.job_id
            WHERE a.prospect_id=@prospect_id AND a.isDeleted=0 AND a.status='Submitted'
              ${appIdRaw ? 'AND a.id=@app_id' : ''}
            ORDER BY a.updated_at DESC, a.created_at DESC;
          `);
          const application = appRes.recordset[0];
          if (!application) {
            await tx.rollback();
            return res.status(400).json({ message: 'No submitted application available to schedule an interview.' });
          }

          const providedInterviewId = req.body.interview_id;
          if (providedInterviewId) {
            const interviewId = Number(providedInterviewId);
            if (!Number.isInteger(interviewId) || interviewId <= 0) {
              await tx.rollback();
              return res.status(400).json({ message: 'Invalid interview reference provided.' });
            }
            const existingInterviewRes = await new sql.Request(tx)
              .input('interview_id', sql.BigInt, interviewId)
              .input('prospect_id', sql.BigInt, id)
              .query(`
                SELECT TOP 1 *
                FROM Interviews
                WHERE id=@interview_id AND prospect_id=@prospect_id AND isDeleted=0;
              `);
            const existingInterview = existingInterviewRes.recordset[0];
            if (!existingInterview) {
              await tx.rollback();
              return res.status(400).json({ message: 'Interview not found for this prospect.' });
            }
            if (existingInterview.application_id !== application.id) {
              await tx.rollback();
              return res.status(400).json({ message: 'Interview is not linked to the submitted application.' });
            }
            if (!remarks) remarks = req.body.remarks?.toString() || 'Interview scheduled.';
            meta.interview = existingInterview;
          } else {
            if (!scheduledTime) {
              await tx.rollback();
              return res.status(400).json({ message: 'Scheduled time is required to create an interview.' });
            }
            const interviewRes = await new sql.Request(tx)
              .input('prospect_id', sql.BigInt, id)
              .input('application_id', sql.BigInt, application.id)
              .input('employer_id', sql.BigInt, application.employer_id)
              .input('scheduled_time', sql.DateTime2, new Date(scheduledTime))
              .input('mode', sql.NVarChar, req.body.mode ? req.body.mode.toString() : null)
              .input('location', sql.NVarChar, req.body.location ? req.body.location.toString() : null)
              .input('recorded_by', sql.BigInt, userId)
              .query(`
                INSERT INTO Interviews
                  (prospect_id, application_id, employer_id, scheduled_time, mode, location, outcome, recorded_by, created_at, isDeleted)
                OUTPUT INSERTED.*
                VALUES
                  (@prospect_id, @application_id, @employer_id, @scheduled_time, @mode, @location, 'Pending', @recorded_by, SYSUTCDATETIME(), 0);
              `);
            meta.interview = interviewRes.recordset[0];
            if (!remarks) remarks = 'Interview scheduled.';
          }
          break;
        }
        case 'interview_scheduled->interview_passed': {
          const interviewIdRaw = req.body.interview_id;
          const outcomeNotes = req.body.outcome_notes ? req.body.outcome_notes.toString() : null;
          const interviewRequest = new sql.Request(tx)
            .input('prospect_id', sql.BigInt, id);
          if (interviewIdRaw) {
            const interviewId = Number(interviewIdRaw);
            if (!Number.isInteger(interviewId) || interviewId <= 0) {
              await tx.rollback();
              return res.status(400).json({ message: 'Invalid interview ID.' });
            }
            interviewRequest.input('interview_id', sql.BigInt, interviewId);
          }
          const interviewRes = await interviewRequest.query(`
            SELECT TOP 1 id
            FROM Interviews
            WHERE prospect_id=@prospect_id AND isDeleted=0 AND outcome='Pending'
              ${interviewIdRaw ? 'AND id=@interview_id' : ''}
            ORDER BY scheduled_time DESC, created_at DESC;
          `);
          const interview = interviewRes.recordset[0];
          if (!interview) {
            await tx.rollback();
            return res.status(400).json({ message: 'No pending interview found for this prospect.' });
          }
          await new sql.Request(tx)
            .input('id', sql.BigInt, interview.id)
            .input('notes', sql.NVarChar, outcomeNotes)
            .query(`
              UPDATE Interviews
                 SET outcome='Pass',
                     outcome_notes=COALESCE(@notes, outcome_notes),
                     updated_at=SYSUTCDATETIME()
               WHERE id=@id AND isDeleted=0;
            `);
          meta.interview = { id: interview.id, outcome: 'Pass', outcome_notes: outcomeNotes };
          if (!remarks) remarks = 'Interview marked as passed.';
          break;
        }
        default:
          await tx.rollback();
          return res.status(400).json({ message: 'Unsupported transition request.' });
      }

      const updateReq = new sql.Request(tx)
        .input('id', sql.BigInt, id)
        .input('to_status', sql.VarChar, to_status);
      let updateSql = `
        UPDATE Prospects
           SET status=@to_status,
               updated_at=SYSUTCDATETIME()
         WHERE id=@id AND isDeleted=0;
      `;
      if (setInterestedJobId !== null) {
        updateReq.input('interested_job_id', sql.BigInt, setInterestedJobId);
        updateSql = `
          UPDATE Prospects
             SET status=@to_status,
                 interested_job_id=@interested_job_id,
                 updated_at=SYSUTCDATETIME()
           WHERE id=@id AND isDeleted=0;
        `;
      }
      await updateReq.query(updateSql);

      try {
        await new sql.Request(tx)
          .input('prospect_id', sql.BigInt, id)
          .input('from_status', sql.VarChar, from_status)
          .input('to_status', sql.VarChar, to_status)
          .input('changed_by', sql.BigInt, userId)
          .input('remarks', sql.NVarChar, remarks)
          .query(`
            INSERT INTO ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, changed_at, remarks)
            VALUES (@prospect_id, @from_status, @to_status, @changed_by, SYSUTCDATETIME(), @remarks);
          `);
      } catch (_) {
        // optional table
      }

      await tx.commit();
      await writeAudit({
        req,
        actorUserId: userId,
        action: 'PROSPECT_STATUS_CHANGE',
        entity: 'Prospects',
        entityId: id,
        details: { from_status, to_status, remarks, meta },
      });

      res.json({ ok: true, from_status, to_status, remarks, meta });
    } catch (err) {
      try { await tx.rollback(); } catch (_) {}
      next(err);
    }
  }
);

router.post(
  '/:id/promote',
  requireAuth,
  can('prospects:write'),
  can('clients:write'),
  param('id').toInt().isInt({ min: 1 }),
  handleValidation,
  async (req, res, next) => {
    const pool = getPool();
    const sql = (await import('mssql')).default;
    const tx = new sql.Transaction(pool);
    try {
      await tx.begin();
      const id = Number(req.params.id);

      const prospectRes = await new sql.Request(tx)
        .input('id', sql.BigInt, id)
        .query(`
          SELECT TOP 1 *
          FROM Prospects
          WHERE id=@id AND isDeleted=0;
        `);
      const prospect = prospectRes.recordset[0];
      if (!prospect) {
        await tx.rollback();
        return res.status(404).json({ message: 'Prospect not found' });
      }

      if ((prospect.status || '').toLowerCase() !== 'interview_passed') {
        await tx.rollback();
        return res.status(400).json({ message: 'Prospect must pass interview before promotion.' });
      }

      const existingClientRes = await new sql.Request(tx)
        .input('prospect_id', sql.BigInt, id)
        .query(`
          SELECT TOP 1 id
          FROM Clients
          WHERE prospect_id=@prospect_id AND isDeleted=0;
        `);
      if (existingClientRes.recordset[0]) {
        await tx.rollback();
        return res.status(409).json({ message: 'Prospect already promoted to client.' });
      }

      const insertClient = await new sql.Request(tx)
        .input('prospect_id', sql.BigInt, id)
        .input('full_name', sql.NVarChar, prospect.full_name || null)
        .input('passport_no', sql.NVarChar, prospect.passport_no || null)
        .input('status', sql.NVarChar, 'Newly_Promoted')
        .query(`
          INSERT INTO Clients (
            prospect_id, full_name, passport_no, status, remarks1, created_at, isDeleted,
            accommodation_type, accommodation_details
          )
          OUTPUT INSERTED.*
          VALUES (
            @prospect_id, @full_name, @passport_no, @status, NULL, SYSUTCDATETIME(), 0,
            NULL, NULL
          );
        `);

      const clientRow = insertClient.recordset[0];

      await new sql.Request(tx)
        .input('client_id', sql.BigInt, clientRow.id)
        .input('changed_by', sql.BigInt, req.user?.userId || null)
        .input('status', sql.NVarChar, 'Newly_Promoted')
        .query(`
          INSERT INTO ClientStatusHistory (client_id, from_status, to_status, changed_by, changed_at, remarks)
          VALUES (@client_id, @status, @status, @changed_by, SYSUTCDATETIME(), N'Promoted from prospect');
        `);

      await tx.commit();

      await writeAudit({
        req,
        actorUserId: req.user?.userId || null,
        action: 'PROSPECT_PROMOTE',
        entity: 'Prospects',
        entityId: id,
        details: { client_id: clientRow.id }
      });

      return res.status(201).json({ client_id: clientRow.id });
    } catch (err) {
      try { await tx.rollback(); } catch (_) { /* ignore */ }
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
