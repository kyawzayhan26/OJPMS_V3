const PROSPECT_STATUSES = [
  'enquiry',
  'job_matched',
  'jobmatch_approved',
  'application_drafted',
  'application_submitted',
  'interview_scheduled',
  'interview_passed',
];

const prospectCache = new Map();

function prospectStatusLabel(status) {
  return (status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Enquiry';
}

async function loadProspectsList() {
  const container = document.getElementById('prospects-list');
  const alertBox = document.getElementById('alert-box');
  if (!container) return;
  container.innerHTML = '<div class="text-muted">Loading prospects…</div>';
  try {
    const search = document.getElementById('search-input')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    const sort = document.getElementById('sort-select')?.value || 'created_at:desc';
    const limit = Math.min(+(document.getElementById('limit-select')?.value || 50), 100);
    const res = await api.get('/prospects', {
      params: { search: search || undefined, limit, page: 1, sort },
    });
    const rows = res.data?.rows || [];
    const filtered = status ? rows.filter((p) => (p.status || 'enquiry') === status) : rows;
    container.innerHTML = filtered
      .map(
        (p) => `
        <div class="card shadow-sm">
          <div class="card-body d-flex flex-column gap-2">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div class="fw-semibold">${p.full_name || 'Unnamed Prospect'}</div>
                <div class="small text-muted">${p.contact_phone || ''}${p.contact_phone && p.contact_email ? ' · ' : ''}${p.contact_email || ''}</div>
              </div>
              <span class="badge text-bg-secondary">${prospectStatusLabel(p.status)}</span>
            </div>
            <div class="small text-muted">Passport: ${p.passport_no || '—'} · DOB: ${p.dob ? formatDate(p.dob).split(',')[0] : '—'}</div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="small text-muted">Created ${formatDate(p.created_at)}</span>
              <a class="btn btn-sm btn-outline-primary" href="${resolveAppPath('prospects/details.html?id=' + p.id)}">Open</a>
            </div>
          </div>
        </div>`
      )
      .join('');
    if (!filtered.length) {
      container.innerHTML = '<div class="text-muted">No prospects found.</div>';
    }
    if (alertBox) alertBox.innerHTML = '';
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Failed to load prospects.</div>';
    showAlert('alert-box', err.response?.data?.message || 'Unable to fetch prospects', 'danger');
  }
}

function setupProspectListFilters() {
  const inputs = ['search-input', 'status-filter', 'sort-select', 'limit-select'];
  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => loadProspectsList());
      if (el.tagName === 'SELECT') {
        el.addEventListener('change', () => loadProspectsList());
      }
    }
  });
}

function initProspectCreateForm() {
  const form = document.getElementById('prospect-form');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    toggleFormDisabled(form, true);
    const data = formToJSON(form);
    try {
      const interestedJobId = data.interested_job_id ? parsePositiveInt(data.interested_job_id) : null;
      if (data.interested_job_id && !interestedJobId) {
        throw new Error('Interested job must be a positive number.');
      }
      const dobValue = data.dob ? normalizeDateOnly(data.dob) : null;
      if (data.dob && !dobValue) {
        throw new Error('Please enter a valid date of birth.');
      }
      const payload = {
        full_name: data.full_name,
        contact_phone: data.contact_phone,
        status: data.status || 'enquiry',
        remarks1: data.remarks1 || null,
        remarks2: data.remarks2 || null,
        passport_no: data.passport_no || null,
        contact_email: data.contact_email || null,
        address: data.address || null,
        highest_qualification: data.highest_qualification || null,
      };
      if (dobValue) payload.dob = dobValue;
      if (interestedJobId !== null) payload.interested_job_id = interestedJobId;
      await api.post('/prospects', payload);
      form.reset();
      const modalEl = document.getElementById('prospectModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
      }
      showAlert('alert-box', 'Prospect created successfully.', 'success');
      await loadProspectsList();
    } catch (err) {
      showAlert('form-alert', err.response?.data?.message || err.message || 'Failed to create prospect', 'danger');
    } finally {
      toggleFormDisabled(form, false);
    }
  });
}

async function loadProspectsKanban() {
  const container = document.getElementById('kanban-row');
  if (!container) return;
  container.innerHTML = PROSPECT_STATUSES
    .map(
      (status) => `
      <div class="d-flex flex-column" style="min-width: 260px;">
        <h6 class="text-uppercase small fw-semibold mb-2">${prospectStatusLabel(status)}</h6>
        <div class="kanban-col" data-status="${status}" id="col-${status}">
          <div class="text-muted">Loading…</div>
        </div>
      </div>`
    )
    .join('');

  prospectCache.clear();

  try {
    const res = await api.get('/prospects', { params: { limit: 100, page: 1, sort: 'created_at:desc' } });
    const rows = res.data?.rows || [];
    const buckets = Object.fromEntries(PROSPECT_STATUSES.map((s) => [s, []]));

    rows.forEach((p) => {
      const status = PROSPECT_STATUSES.includes(p.status) ? p.status : 'enquiry';
      buckets[status].push(p);
      const keyStr = String(p.id);
      prospectCache.set(keyStr, p);
      const keyNum = Number(keyStr);
      if (!Number.isNaN(keyNum)) {
        prospectCache.set(keyNum, p);
      }
    });

    PROSPECT_STATUSES.forEach((status) => {
      const col = document.getElementById(`col-${status}`);
      if (!col) return;
      const cards = buckets[status]
        .map(
          (p) => `
          <div class="kanban-card mb-2" data-id="${p.id}">
            <div class="fw-semibold">${escapeHtml(p.full_name || `Prospect #${p.id}`)}</div>
            <div class="small text-muted">${escapeHtml(p.contact_phone || '')}${p.contact_phone && p.contact_email ? ' · ' : ''}${escapeHtml(p.contact_email || '')}</div>
            <div class="small text-muted">${formatDate(p.created_at)}</div>
            <div class="mt-2"><a class="btn btn-sm btn-outline-primary" href="${resolveAppPath('prospects/details.html?id=' + p.id)}">View</a></div>
          </div>`
        )
        .join('');
      col.innerHTML = cards || '<div class="text-muted">Empty</div>';
    });
    PROSPECT_STATUSES.forEach((status) => {
      const col = document.getElementById(`col-${status}`);
      if (!col) return;
      new Sortable(col, {
        group: 'prospects',
        animation: 150,
        onEnd: (evt) => {
          handleProspectDrop(evt).catch((error) => {
            console.error('Failed to handle prospect drop', error);
          });
        },
      });
    });
    equalizeKanbanColumns(container);
  } catch (err) {
    PROSPECT_STATUSES.forEach((status) => {
      const col = document.getElementById(`col-${status}`);
      if (col) col.innerHTML = '<div class="text-danger">Failed to load.</div>';
    });
    showAlert('alert-box', err.response?.data?.message || 'Unable to load prospects', 'danger');
  }

  initProspectCreateForm();
}

function prospectStatusIndex(status) {
  return PROSPECT_STATUSES.indexOf(status);
}

async function fetchCurrentJobMatch(prospectId) {
  try {
    const res = await api.get('/prospect-job-matches', {
      params: {
        prospect_id: prospectId,
        is_current: true,
        limit: 1,
        page: 1,
        sort: 'updated_at:desc',
      },
    });
    return res.data?.rows?.[0] || null;
  } catch (err) {
    console.error('Failed to fetch job match', err);
    return null;
  }
}

async function fetchLatestApplication(prospectId, status) {
  try {
    const res = await api.get('/applications', {
      params: {
        prospect_id: prospectId,
        status,
        limit: 1,
        page: 1,
        sort: 'updated_at:desc',
      },
    });
    return res.data?.rows?.[0] || null;
  } catch (err) {
    console.error('Failed to fetch application', err);
    return null;
  }
}

async function fetchPendingInterview(prospectId) {
  try {
    const res = await api.get('/interviews', {
      params: {
        prospect_id: prospectId,
        outcome: 'Pending',
        limit: 1,
        page: 1,
        sort: 'scheduled_time:desc',
      },
    });
    return res.data?.rows?.[0] || null;
  } catch (err) {
    console.error('Failed to fetch interview', err);
    return null;
  }
}

async function loadProspectDocumentsSummary(prospectId) {
  const container = document.getElementById('prospect-documents');
  const link = document.getElementById('open-documents-page');
  if (link) {
    link.href = resolveAppPath(`documents/list.html?prospect_id=${prospectId}`);
  }
  if (!container) return;
  container.innerHTML = '<div class="text-muted">Loading documents…</div>';
  try {
    const res = await api.get('/documents', { params: { prospect_id: prospectId } });
    const rows = res.data?.rows || [];
    if (!rows.length) {
      container.innerHTML = '<div class="text-muted">No documents uploaded yet.</div>';
      return;
    }
    const summary = rows
      .slice(0, 5)
      .map(
        (doc) => `
        <div class="d-flex justify-content-between align-items-center">
          <span>${escapeHtml(doc.type || 'Document')}</span>
          <span class="badge text-bg-secondary">${escapeHtml(doc.status || 'Pending')}</span>
        </div>`
      )
      .join('');
    const remaining = rows.length > 5 ? `<div class="text-muted">+${rows.length - 5} more</div>` : '';
    container.innerHTML = summary + remaining;
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Failed to load documents.</div>';
  }
}

function formatHistoryActor(name, email, id) {
  if (name) {
    return escapeHtml(email ? `${name} (${email})` : name);
  }
  if (email) return escapeHtml(email);
  if (id) return `User #${id}`;
  return 'System';
}

function renderProspectStatusHistory(entries = []) {
  if (!entries.length) {
    return '<div class="list-group-item text-muted">No status changes recorded.</div>';
  }
  return entries
    .map((item) => {
      const actor = formatHistoryActor(item.changed_by_name, item.changed_by_email, item.changed_by);
      const fromLabel = prospectStatusLabel(item.from_status) || '—';
      const toLabel = prospectStatusLabel(item.to_status) || '—';
      const remarks = item.remarks ? `<div class="small mt-1">${escapeHtml(item.remarks)}</div>` : '';
      return `<div class="list-group-item">
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div>
            <div class="fw-semibold">${fromLabel} → ${toLabel}</div>
            <div class="small text-muted">${actor}</div>
            ${remarks}
          </div>
          <div class="small text-muted text-nowrap">${formatDate(item.changed_at)}</div>
        </div>
      </div>`;
    })
    .join('');
}

function renderProspectAuditLogs(entries = []) {
  if (!entries.length) {
    return '<div class="list-group-item text-muted">No changes recorded.</div>';
  }
  return entries
    .map((log) => {
      const actor = formatHistoryActor(log.actor_name, log.actor_email, log.actor_user_id);
      const metaParts = [];
      if (log.method || log.path) metaParts.push(`${log.method || ''} ${log.path || ''}`.trim());
      if (log.status_code) metaParts.push(`Status ${log.status_code}`);
      const meta = metaParts.filter(Boolean).join(' · ');
      let detailBlock = '';
      if (log.details) {
        let detailText = typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2);
        if (detailText.length > 500) detailText = `${detailText.slice(0, 500)}…`;
        detailBlock = `<pre class="small bg-light border rounded p-2 mt-2 mb-0 overflow-auto">${escapeHtml(detailText)}</pre>`;
      }
      return `<div class="list-group-item">
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div>
            <div class="fw-semibold">${escapeHtml(log.action || 'Change')}</div>
            <div class="small text-muted">${actor}${meta ? ` · ${escapeHtml(meta)}` : ''}</div>
            ${detailBlock}
          </div>
          <div class="small text-muted text-nowrap">${formatDate(log.created_at)}</div>
        </div>
      </div>`;
    })
    .join('');
}

async function loadProspectHistory(prospectId) {
  const statusContainer = document.getElementById('prospect-status-history');
  const auditContainer = document.getElementById('prospect-audit-log');
  if (!statusContainer && !auditContainer) return;

  if (statusContainer) statusContainer.innerHTML = '<div class="list-group-item text-muted">Loading…</div>';
  if (auditContainer) auditContainer.innerHTML = '<div class="list-group-item text-muted">Loading…</div>';

  try {
    const res = await api.get(`/prospects/${prospectId}/history`);
    const { statusHistory = [], auditLogs = [] } = res.data || {};
    if (statusContainer) statusContainer.innerHTML = renderProspectStatusHistory(statusHistory);
    if (auditContainer) auditContainer.innerHTML = renderProspectAuditLogs(auditLogs);
  } catch (err) {
    if (statusContainer) statusContainer.innerHTML = '<div class="list-group-item text-danger">Unable to load status history.</div>';
    if (auditContainer) auditContainer.innerHTML = '<div class="list-group-item text-danger">Unable to load audit trail.</div>';
  }
}

async function fetchJobById(jobId) {
  if (!jobId) return null;
  try {
    const res = await api.get(`/jobs/${jobId}`);
    return res.data || null;
  } catch (err) {
    console.error('Failed to fetch job', err);
    return null;
  }
}

function jobLabel(matchOrApplication) {
  if (!matchOrApplication) return 'Job';
  return matchOrApplication.job_title || `Job #${matchOrApplication.job_id || ''}`;
}

function openJobMatchModal(prospect) {
  const modalEl = document.getElementById('jobMatchModal');
  if (!modalEl) return Promise.resolve(null);
  const form = modalEl.querySelector('#job-match-form');
  const alertBox = document.getElementById('job-match-alert');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  return new Promise((resolve) => {
    const cleanup = () => {
      form.removeEventListener('submit', onSubmit);
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
    };

    const onHidden = () => {
      cleanup();
      resolve(null);
    };

    const onSubmit = (ev) => {
      ev.preventDefault();
      if (alertBox) alertBox.innerHTML = '';
      const data = formToJSON(form);
      const jobId = parsePositiveInt(data.job_id);
      if (!jobId) {
        showAlert('job-match-alert', 'Please enter a valid job ID.', 'danger');
        return;
      }
      const rationale = (data.rationale || '').trim();
      if (!rationale) {
        showAlert('job-match-alert', 'Please provide a rationale for the match.', 'danger');
        return;
      }
      cleanup();
      modal.hide();
      resolve({ job_id: jobId, rationale });
    };

    if (alertBox) alertBox.innerHTML = '';
    form.reset();
    form.prospect_id.value = prospect.id;
    form.prospect_name.value = prospect.full_name || `Prospect #${prospect.id}`;

    modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
    form.addEventListener('submit', onSubmit);
    modal.show();
  });
}

function openApplicationDraftModal(prospect, match) {
  const modalEl = document.getElementById('applicationDraftModal');
  if (!modalEl) return Promise.resolve(null);
  const form = modalEl.querySelector('#application-draft-form');
  const alertBox = document.getElementById('application-draft-alert');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  return new Promise((resolve) => {
    const cleanup = () => {
      form.removeEventListener('submit', onSubmit);
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
    };

    const onHidden = () => {
      cleanup();
      resolve(null);
    };

    const onSubmit = (ev) => {
      ev.preventDefault();
      if (alertBox) alertBox.innerHTML = '';
      const data = formToJSON(form);
      cleanup();
      modal.hide();
      resolve({ notes: (data.notes || '').trim() });
    };

    if (alertBox) alertBox.innerHTML = '';
    form.reset();
    form.prospect_id.value = prospect.id;
    form.job_id.value = match.job_id;
    form.prospect_name.value = prospect.full_name || `Prospect #${prospect.id}`;
    form.job_label.value = jobLabel(match);
    if (form.status) form.status.value = 'Draft';
    if (form.employer_response_at) form.employer_response_at.value = '';

    modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
    form.addEventListener('submit', onSubmit);
    modal.show();
  });
}

function openConfirmModal({ title, message, confirmLabel = 'Confirm', requireKeyword = null, keywordLabel = null }) {
  const modalEl = document.getElementById('confirmModal');
  if (!modalEl) return Promise.resolve(false);
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const titleEl = document.getElementById('confirm-modal-title');
  const messageEl = document.getElementById('confirm-modal-message');
  const alertBox = document.getElementById('confirm-modal-alert');
  const confirmBtn = document.getElementById('confirm-modal-button');
  const inputGroup = document.getElementById('confirm-modal-input-group');
  const inputField = document.getElementById('confirm-modal-input');
  const inputLabel = document.getElementById('confirm-modal-input-label');
  const inputHelp = document.getElementById('confirm-modal-input-help');

  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      confirmBtn.removeEventListener('click', onConfirm);
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
    };

    const onConfirm = () => {
      if (requireKeyword) {
        const expected = requireKeyword.toString().trim().toLowerCase();
        const actual = (inputField?.value || '').trim().toLowerCase();
        if (!actual || actual !== expected) {
          if (alertBox) {
            alertBox.innerHTML = `<div class="alert alert-danger">Please type "${escapeHtml(requireKeyword)}" to confirm.</div>`;
          }
          if (inputField) {
            inputField.focus();
            inputField.select();
          }
          return;
        }
      }
      resolved = true;
      cleanup();
      modal.hide();
      resolve(true);
    };

    const onHidden = () => {
      cleanup();
      if (!resolved) resolve(false);
    };

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.innerHTML = message;
    if (alertBox) alertBox.innerHTML = '';
    if (confirmBtn) confirmBtn.textContent = confirmLabel;

    if (inputGroup) {
      if (requireKeyword) {
        inputGroup.classList.remove('d-none');
        if (inputLabel) inputLabel.textContent = keywordLabel || `Type "${requireKeyword}" to continue`;
        if (inputHelp) inputHelp.textContent = 'Confirmation is required to apply this change.';
        if (inputField) {
          inputField.value = '';
          setTimeout(() => inputField.focus(), 150);
        }
      } else {
        inputGroup.classList.add('d-none');
        if (inputField) inputField.value = '';
      }
    }

    confirmBtn.addEventListener('click', onConfirm);
    modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
    modal.show();
  });
}

function openInterviewScheduleModal(prospect, application) {
  const modalEl = document.getElementById('interviewScheduleModal');
  if (!modalEl) return Promise.resolve(null);
  const form = modalEl.querySelector('#interview-schedule-form');
  const alertBox = document.getElementById('interview-schedule-alert');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return new Promise((resolve) => {
    const cleanup = () => {
      form.removeEventListener('submit', onSubmit);
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
    };

    const onHidden = () => {
      cleanup();
      resolve(null);
    };

    const onSubmit = (ev) => {
      ev.preventDefault();
      if (alertBox) alertBox.innerHTML = '';
      const data = formToJSON(form);
      if (!data.scheduled_time) {
        showAlert('interview-schedule-alert', 'Please choose a scheduled time.', 'danger');
        return;
      }
      const iso = new Date(data.scheduled_time).toISOString();
      cleanup();
      modal.hide();
      resolve({
        scheduled_time: iso,
        mode: data.mode ? data.mode.trim() || null : null,
        location: data.location ? data.location.trim() || null : null,
      });
    };

    if (alertBox) alertBox.innerHTML = '';
    form.reset();
    form.prospect_id.value = prospect.id;
    form.application_id.value = application.id;
    form.prospect_name.value = prospect.full_name || `Prospect #${prospect.id}`;
    form.application_label.value = jobLabel(application);
    form.scheduled_time.value = localISO;

    modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
    form.addEventListener('submit', onSubmit);
    modal.show();
  });
}

function openInterviewOutcomeModal(prospect, interview) {
  const modalEl = document.getElementById('interviewOutcomeModal');
  if (!modalEl) return Promise.resolve(null);
  const form = modalEl.querySelector('#interview-outcome-form');
  const alertBox = document.getElementById('interview-outcome-alert');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  return new Promise((resolve) => {
    const cleanup = () => {
      form.removeEventListener('submit', onSubmit);
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
    };

    const onHidden = () => {
      cleanup();
      resolve(null);
    };

    const onSubmit = (ev) => {
      ev.preventDefault();
      if (alertBox) alertBox.innerHTML = '';
      const data = formToJSON(form);
      cleanup();
      modal.hide();
      resolve({ outcome_notes: (data.outcome_notes || '').trim() });
    };

    if (alertBox) alertBox.innerHTML = '';
    form.reset();
    form.prospect_id.value = prospect.id;
    form.interview_id.value = interview.id || '';

    modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
    form.addEventListener('submit', onSubmit);
    modal.show();
  });
}

async function handleProspectDrop(evt) {
  const idAttr = evt.item.getAttribute('data-id');
  const toStatus = evt.to.getAttribute('data-status');
  const fromStatus = evt.from.getAttribute('data-status');

  if (!idAttr || !toStatus || toStatus === fromStatus) {
    return;
  }

  const prospectId = Number(idAttr);
  if (Number.isNaN(prospectId)) {
    showAlert('alert-box', 'Invalid prospect identifier.', 'danger');
    return;
  }

  const revert = () => {
    const reference = evt.from.children[evt.oldIndex] || null;
    evt.from.insertBefore(evt.item, reference);
  };

  const fromIndex = prospectStatusIndex(fromStatus);
  const toIndex = prospectStatusIndex(toStatus);

  if (fromIndex === -1 || toIndex === -1) {
    revert();
    showAlert('alert-box', 'Unsupported status change.', 'danger');
    return;
  }

  if (toIndex <= fromIndex) {
    revert();
    showAlert('alert-box', 'You can only move prospects forward in the pipeline.', 'warning');
    return;
  }

  if (toIndex - fromIndex > 1) {
    revert();
    showAlert('alert-box', 'Please progress through the stages one step at a time.', 'warning');
    return;
  }

  let prospect = prospectCache.get(idAttr) || prospectCache.get(prospectId);
  if (!prospect) {
    try {
      const res = await api.get(`/prospects/${prospectId}`);
      prospect = res.data;
      if (prospect) {
        prospectCache.set(String(prospect.id), prospect);
        prospectCache.set(Number(prospect.id), prospect);
      }
    } catch (err) {
      prospect = null;
    }
  }
  if (!prospect) {
    revert();
    showAlert('alert-box', 'Prospect data unavailable. Please refresh.', 'danger');
    return;
  }

  const transitionKey = `${fromStatus}->${toStatus}`;
  const payload = { to_status: toStatus };
  let successMessage = `Prospect moved to ${prospectStatusLabel(toStatus)}.`;

  try {
    switch (transitionKey) {
      case 'enquiry->job_matched': {
        const result = await openJobMatchModal(prospect);
        if (!result) {
          revert();
          return;
        }
        try {
          const createRes = await api.post('/prospect-job-matches', {
            prospect_id: prospectId,
            job_id: result.job_id,
            rationale: result.rationale,
            is_current: true,
          });
          const match = createRes.data;
          payload.match_id = match.id;
          payload.job_id = match.job_id;
          payload.rationale = result.rationale;
          payload.remarks = result.rationale;
          successMessage = 'Job match created and prospect updated.';
        } catch (err) {
          revert();
          showAlert('alert-box', err.response?.data?.message || 'Failed to create job match', 'danger');
          return;
        }
        break;
      }
      case 'job_matched->jobmatch_approved': {
        if ((getUserRole() || '').toLowerCase() !== 'admin') {
          revert();
          showAlert('alert-box', 'Forbidden: only administrators can approve job matches.', 'danger');
          return;
        }
        const confirmed = await openConfirmModal({
          title: 'Approve Job Match',
          message: `Approve the current job match for <strong>${escapeHtml(prospect.full_name || `Prospect #${prospect.id}`)}</strong>?`,
          confirmLabel: 'Approve',
          requireKeyword: 'confirm',
          keywordLabel: 'Type "confirm" to approve the job match',
        });
        if (!confirmed) {
          revert();
          return;
        }
        payload.remarks = 'Job match approved.';
        successMessage = 'Job match approved.';
        break;
      }
      case 'jobmatch_approved->application_drafted': {
        const match = await fetchCurrentJobMatch(prospectId);
        if (!match || (match.status && match.status !== 'approved')) {
          revert();
          showAlert('alert-box', 'No approved job match available for this prospect.', 'danger');
          return;
        }
        const result = await openApplicationDraftModal(prospect, match);
        if (!result) {
          revert();
          return;
        }
        try {
          const createRes = await api.post('/applications', {
            prospect_id: prospectId,
            job_id: match.job_id,
            status: 'Draft',
            notes: result.notes || null,
          });
          const application = createRes.data;
          payload.application_id = application.id;
          payload.notes = result.notes || null;
          payload.remarks = result.notes || 'Application draft created.';
          successMessage = 'Application draft created.';
        } catch (err) {
          revert();
          showAlert('alert-box', err.response?.data?.message || 'Failed to create application draft', 'danger');
          return;
        }
        break;
      }
      case 'application_drafted->application_submitted': {
        const draft = await fetchLatestApplication(prospectId, 'Draft');
        if (!draft) {
          revert();
          showAlert('alert-box', 'No draft application found to submit.', 'danger');
          return;
        }
        const confirmed = await openConfirmModal({
          title: 'Submit Application',
          message: `Submit the application for <strong>${escapeHtml(prospect.full_name || `Prospect #${prospect.id}`)}</strong> (${escapeHtml(jobLabel(draft))})?`,
          confirmLabel: 'Submit',
          requireKeyword: 'confirm',
          keywordLabel: 'Type "confirm" to submit the application',
        });
        if (!confirmed) {
          revert();
          return;
        }
        payload.application_id = draft.id;
        payload.remarks = 'Application submitted.';
        successMessage = 'Application submitted.';
        break;
      }
      case 'application_submitted->interview_scheduled': {
        const submitted = await fetchLatestApplication(prospectId, 'Submitted');
        if (!submitted) {
          revert();
          showAlert('alert-box', 'No submitted application ready for scheduling.', 'danger');
          return;
        }
        const result = await openInterviewScheduleModal(prospect, submitted);
        if (!result) {
          revert();
          return;
        }
        const job = await fetchJobById(submitted.job_id);
        if (!job) {
          revert();
          showAlert('alert-box', 'Unable to load job details for interview scheduling.', 'danger');
          return;
        }
        try {
          const createRes = await api.post('/interviews', {
            prospect_id: prospectId,
            application_id: submitted.id,
            employer_id: job.employer_id,
            scheduled_time: result.scheduled_time,
            mode: result.mode || null,
            location: result.location || null,
          });
          const interview = createRes.data;
          payload.application_id = submitted.id;
          payload.interview_id = interview.id;
          payload.remarks = `Interview scheduled for ${formatDate(result.scheduled_time)}.`;
          successMessage = 'Interview scheduled.';
        } catch (err) {
          revert();
          showAlert('alert-box', err.response?.data?.message || 'Failed to schedule interview', 'danger');
          return;
        }
        break;
      }
      case 'interview_scheduled->interview_passed': {
        const interview = await fetchPendingInterview(prospectId);
        if (!interview) {
          revert();
          showAlert('alert-box', 'No pending interview found for this prospect.', 'danger');
          return;
        }
        const result = await openInterviewOutcomeModal(prospect, interview);
        if (!result) {
          revert();
          return;
        }
        payload.interview_id = interview.id;
        payload.outcome_notes = result.outcome_notes || null;
        payload.remarks = result.outcome_notes ? result.outcome_notes : 'Interview marked as passed.';
        successMessage = 'Interview marked as passed.';
        break;
      }
      default:
        revert();
        showAlert('alert-box', 'This transition is not supported yet.', 'danger');
        return;
    }

    await api.patch(`/prospects/${prospectId}/status`, payload);
    showAlert('alert-box', successMessage, 'success');
    await loadProspectsKanban();
  } catch (err) {
    revert();
    showAlert('alert-box', err.response?.data?.message || 'Failed to update status', 'danger');
  }
}

async function loadProspectDetails() {
  const id = getParam('id');
  if (!id) {
    showAlert('alert-box', 'Missing prospect id', 'danger');
    return;
  }
  const detailCard = document.getElementById('prospect-detail-card');
  const form = document.getElementById('prospect-detail-form');
  const deleteBtn = document.getElementById('delete-prospect');
  const editBtn = document.getElementById('edit-prospect');
  const saveBtn = document.getElementById('save-prospect');
  const cancelBtn = document.getElementById('cancel-edit');
  const promoteBtn = document.getElementById('promote-prospect');
  const documentsBtn = document.getElementById('prospect-documents-button');

  const setFormValues = (data) => {
    if (!form) return;
    form.full_name.value = data.full_name || '';
    form.dob.value = data.dob ? data.dob.split('T')[0] : '';
    form.passport_no.value = data.passport_no || '';
    form.contact_email.value = data.contact_email || '';
    form.contact_phone.value = data.contact_phone || '';
    form.address.value = data.address || '';
    form.highest_qualification.value = data.highest_qualification || '';
    form.status.value = PROSPECT_STATUSES.includes(data.status) ? data.status : 'enquiry';
    form.interested_job_id.value = data.interested_job_id || '';
    form.remarks1.value = data.remarks1 || '';
    form.remarks2.value = data.remarks2 || '';
    refreshLookupDisplay(form.interested_job_id);
  };

  const toggleEdit = (isEditing) => {
    if (!form) return;
    Array.from(form.elements).forEach((el) => {
      if (el.name && el.name !== 'id') {
        el.disabled = !isEditing && el.tagName !== 'BUTTON';
      }
    });
    editBtn?.classList.toggle('d-none', isEditing);
    saveBtn?.classList.toggle('d-none', !isEditing);
    cancelBtn?.classList.toggle('d-none', !isEditing);
  };

  try {
    const res = await api.get(`/prospects/${id}`);
    const prospect = res.data;
    if (documentsBtn) {
      documentsBtn.onclick = () => navigateTo(`documents/list.html?prospect_id=${prospect.id}`);
    }
    loadProspectDocumentsSummary(prospect.id);
    if (promoteBtn) {
      promoteBtn.disabled = (prospect.status || '').toLowerCase() !== 'interview_passed';
      promoteBtn.onclick = async () => {
        if ((prospect.status || '').toLowerCase() !== 'interview_passed') {
          showAlert('alert-box', 'Only prospects who passed interviews can be promoted.', 'warning');
          return;
        }
        const confirmed = await promptKeywordConfirm({
          title: 'Promote prospect',
          messageHtml: 'Type <strong>promote</strong> to create a client record for this prospect.',
          keyword: 'promote',
          confirmLabel: 'Promote',
        });
        if (!confirmed) return;
        try {
          const res = await api.post(`/prospects/${prospect.id}/promote`);
          showAlert('alert-box', 'Prospect promoted to client successfully.', 'success');
          promoteBtn.disabled = true;
          if (res.data?.client_id) {
            setTimeout(() => navigateTo(`clients/details.html?id=${res.data.client_id}`), 1000);
          }
        } catch (err) {
          showAlert('alert-box', err.response?.data?.message || 'Failed to promote prospect', 'danger');
        }
      };
    }
    if (detailCard) {
      detailCard.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h2 class="h5 mb-1">${prospect.full_name}</h2>
            <div class="small text-muted">${prospect.contact_phone || ''}${prospect.contact_phone && prospect.contact_email ? ' · ' : ''}${prospect.contact_email || ''}</div>
            <div class="small text-muted">Passport: ${prospect.passport_no || '—'}</div>
          </div>
          <span class="badge text-bg-secondary">${prospectStatusLabel(prospect.status)}</span>
        </div>
        <div class="mt-3 small text-muted">Created ${formatDate(prospect.created_at)}${prospect.updated_at ? ` · Updated ${formatDate(prospect.updated_at)}` : ''}</div>`;
    }
    setFormValues(prospect);
    toggleEdit(false);
    loadProspectHistory(prospect.id);

    const jobsList = document.getElementById('prospect-jobs');
    if (jobsList) {
      try {
        const jobsRes = await api.get('/jobs', { params: { limit: 100 } });
        const jobs = jobsRes.data?.rows || [];
        if (prospect.interested_job_id) {
          const match = jobs.find((j) => j.id === prospect.interested_job_id);
          jobsList.innerHTML = match
            ? `<li class="list-group-item">${match.title} <span class="small text-muted">${match.location_country || ''}</span></li>`
            : '<li class="list-group-item">Interested job record not found.</li>';
        } else {
          jobsList.innerHTML = '<li class="list-group-item text-muted">No interested job recorded.</li>';
        }
      } catch (_) {
        jobsList.innerHTML = '<li class="list-group-item text-muted">Unable to load job information.</li>';
      }
    }

    const applicationsList = document.getElementById('prospect-applications');
    if (applicationsList) {
      try {
        const appsRes = await api.get('/applications', { params: { limit: 100 } });
        const apps = (appsRes.data?.rows || []).filter((a) => String(a.prospect_id) === String(id));
        applicationsList.innerHTML = apps
          .map(
            (a) => `<li class="list-group-item d-flex justify-content-between">
              <span><strong>${a.job_title || `Job #${a.job_id}`}</strong> <span class="text-muted">· ${a.status}</span></span>
              <span class="small text-muted">${formatDate(a.created_at)}</span>
            </li>`
          )
          .join('') || '<li class="list-group-item text-muted">No applications found.</li>';
      } catch (_) {
        applicationsList.innerHTML = '<li class="list-group-item text-muted">Failed to load applications.</li>';
      }
    }

    const interviewsList = document.getElementById('prospect-interviews');
    if (interviewsList) {
      try {
        const ivRes = await api.get('/interviews', { params: { limit: 100 } });
        const interviews = (ivRes.data?.rows || []).filter((i) => String(i.prospect_id) === String(id));
        interviewsList.innerHTML = interviews
          .map(
            (i) => `<li class="list-group-item d-flex justify-content-between">
              <span><strong>${i.mode || 'Interview'}</strong> <span class="text-muted">· ${i.location || ''}</span></span>
              <span class="small text-muted">${formatDate(i.scheduled_time)}</span>
            </li>`
          )
          .join('') || '<li class="list-group-item text-muted">No interviews scheduled.</li>';
      } catch (_) {
        interviewsList.innerHTML = '<li class="list-group-item text-muted">Failed to load interviews.</li>';
      }
    }

    if (editBtn) editBtn.onclick = () => toggleEdit(true);
    if (cancelBtn) cancelBtn.onclick = () => {
      setFormValues(prospect);
      toggleEdit(false);
    };
    if (saveBtn) saveBtn.onclick = async () => {
      if (!form) return;
      const interestedJob = form.interested_job_id.value ? parsePositiveInt(form.interested_job_id.value) : null;
      if (form.interested_job_id.value && !interestedJob) {
        showAlert('alert-box', 'Interested job must be a positive number.', 'danger');
        return;
      }
      const dobValue = form.dob.value ? normalizeDateOnly(form.dob.value) : null;
      if (form.dob.value && !dobValue) {
        showAlert('alert-box', 'Please enter a valid date of birth.', 'danger');
        return;
      }
      const payload = {
        full_name: form.full_name.value,
        passport_no: form.passport_no.value || null,
        contact_email: form.contact_email.value || null,
        contact_phone: form.contact_phone.value || null,
        address: form.address.value || null,
        highest_qualification: form.highest_qualification.value || null,
        status: form.status.value,
        remarks1: form.remarks1.value || null,
        remarks2: form.remarks2.value || null,
      };
      if (dobValue) payload.dob = dobValue;
      if (interestedJob !== null) payload.interested_job_id = interestedJob;
      try {
        await api.put(`/prospects/${id}`, payload);
        showAlert('alert-box', 'Prospect updated successfully.', 'success');
        toggleEdit(false);
        await loadProspectDetails();
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || err.message || 'Failed to update prospect', 'danger');
      }
    };
    if (deleteBtn) deleteBtn.onclick = async () => {
      if (!confirm('Are you sure you want to delete this prospect?')) return;
      try {
        await api.delete(`/prospects/${id}`);
        showAlert('alert-box', 'Prospect deleted.', 'success');
        setTimeout(() => navigateTo('prospects/list.html'), 800);
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to delete prospect', 'danger');
      }
    };
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Failed to load prospect', 'danger');
  }
}
