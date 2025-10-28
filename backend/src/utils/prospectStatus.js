import { getPool } from './db.js';

const STATUS_SEQUENCE = [
  'enquiry',
  'job_matched',
  'jobmatch_approved',
  'application_drafted',
  'application_submitted',
  'interview_scheduled',
  'interview_passed',
];

function normalizeStatus(status) {
  return (status || '').toLowerCase();
}

function statusIndex(status) {
  const normalized = normalizeStatus(status);
  return STATUS_SEQUENCE.indexOf(normalized);
}

export async function promoteProspectStatus({
  prospectId,
  toStatus,
  changedBy = null,
  remarks = null,
} = {}) {
  if (!prospectId || !toStatus) return;

  const pool = getPool();
  const currentRs = await pool
    .request()
    .input('prospect_id', prospectId)
    .query('SELECT status FROM Prospects WHERE id=@prospect_id AND isDeleted=0;');

  const currentRow = currentRs.recordset[0];
  if (!currentRow) return;

  const currentStatus = normalizeStatus(currentRow.status);
  const targetStatus = normalizeStatus(toStatus);

  if (!targetStatus) return;
  if (currentStatus === targetStatus) return;

  const currentIndex = statusIndex(currentStatus);
  const targetIndex = statusIndex(targetStatus);

  if (targetIndex === -1) return;
  if (currentIndex > -1 && targetIndex <= currentIndex) return;

  const fromStatus = currentRow.status || 'enquiry';
  const poolForUpdate = getPool();
  await poolForUpdate
    .request()
    .input('prospect_id', prospectId)
    .input('from_status', fromStatus)
    .input('to_status', toStatus)
    .input('changed_by', changedBy)
    .input('remarks', remarks)
    .query(`
      UPDATE Prospects
         SET status = @to_status,
             updated_at = SYSUTCDATETIME()
       WHERE id = @prospect_id;

      INSERT INTO ProspectStatusHistory
        (prospect_id, from_status, to_status, changed_by, changed_at, remarks)
      VALUES
        (@prospect_id, @from_status, @to_status, @changed_by, SYSUTCDATETIME(), @remarks);
    `);
}

export { STATUS_SEQUENCE as PROSPECT_STATUS_SEQUENCE };
