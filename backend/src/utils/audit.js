// src/utils/audit.js
import { getPool } from '../utils/db.js';

export async function writeAudit({
  req,                // Express req (optional but recommended)
  actorUserId,        // number | null
  action,             // string, e.g. 'EMPLOYER_CREATE'
  entity,             // string, e.g. 'Employers'
  entityId,           // number | null
  details             // any (JSON-serialized)
}) {
  try {
    const pool = getPool();
    await pool.request()
      .input('actor_user_id', actorUserId ?? null)
      .input('action', action)
      .input('entity', entity)
      .input('entity_id', entityId ?? null)
      .input('method', req?.method ?? null)
      .input('path', req?.originalUrl ?? null)
      .input('ip', (req?.headers['x-forwarded-for'] || req?.ip || '').toString())
      .input('user_agent', (req?.headers['user-agent'] || '').toString())
      .input('status_code', req?.res?.statusCode ?? null)
      .input('details', details ? JSON.stringify(details) : null)
      .query(`
        INSERT INTO AuditLogs
          (actor_user_id, action, entity, entity_id, method, path, ip, user_agent, status_code, details)
        VALUES
          (@actor_user_id, @action, @entity, @entity_id, @method, @path, @ip, @user_agent, @status_code, @details)
      `);
  } catch (e) {
    console.error('Audit write error:', e?.message || e);
  }
}
