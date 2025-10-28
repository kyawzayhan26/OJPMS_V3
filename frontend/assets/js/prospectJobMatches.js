const MATCH_STATUSES = ['pending_review', 'approved', 'rejected', 'archived'];

function matchStatusBadge(status) {
  const normalized = (status || '').toLowerCase();
  const badgeClass = {
    approved: 'text-bg-success',
    rejected: 'text-bg-danger',
    archived: 'text-bg-secondary',
    pending_review: 'text-bg-warning',
  }[normalized] || 'text-bg-secondary';
  return `<span class="badge ${badgeClass}">${status ? status.replace(/_/g, ' ') : 'pending'}</span>`;
}

async function loadMatchList() {
  const container = document.getElementById('match-list');
  if (!container) return;
  container.innerHTML = '<div class="text-muted">Loading job matches…</div>';
  try {
    const search = document.getElementById('search-input')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    const currentOnly = document.getElementById('current-filter')?.value || '';
    const params = {
      limit: 100,
      page: 1,
      sort: 'updated_at:desc',
    };
    if (search) params.search = search;
    if (status) params.status = status;
    if (currentOnly) params.is_current = currentOnly === 'current';

    const res = await api.get('/prospect-job-matches', { params });
    const rows = res.data?.rows || [];
    if (!rows.length) {
      container.innerHTML = '<div class="text-muted">No job matches found.</div>';
      return;
    }
    container.innerHTML = rows
      .map(
        (row) => `
        <div class="card shadow-sm">
          <div class="card-body d-flex flex-column gap-2">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div class="fw-semibold">${escapeHtml(row.prospect_name || `Prospect #${row.prospect_id}`)}</div>
                <div class="small text-muted">${escapeHtml(row.job_title || `Job #${row.job_id}`)}</div>
              </div>
              ${matchStatusBadge(row.status)}
            </div>
            <div class="small text-muted">Matched ${formatDate(row.created_at)}${row.is_current ? ' · <span class="text-success">Current</span>' : ''}</div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="small text-muted">Updated ${row.updated_at ? formatDate(row.updated_at) : '—'}</span>
              <a class="btn btn-sm btn-outline-primary" href="${resolveAppPath('prospect-job-matches/details.html?id=' + row.id)}">View</a>
            </div>
          </div>
        </div>`
      )
      .join('');
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Failed to load job matches.</div>';
    showAlert('alert-box', err.response?.data?.message || 'Unable to fetch job matches', 'danger');
  }
}

function setupMatchFilters() {
  ['search-input', 'status-filter', 'current-filter'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => loadMatchList();
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', handler);
  });
}

function initMatchCreateForm() {
  const form = document.getElementById('match-form');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    toggleFormDisabled(form, true);
    if (document.getElementById('form-alert')) document.getElementById('form-alert').innerHTML = '';
    try {
      const data = formToJSON(form);
      const prospectId = requirePositiveInt(data.prospect_id, 'Prospect');
      const jobId = requirePositiveInt(data.job_id, 'Job');
      const payload = {
        prospect_id: prospectId,
        job_id: jobId,
        rationale: data.rationale || null,
      };
      await api.post('/prospect-job-matches', payload);
      form.reset();
      const modalEl = document.getElementById('matchModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
      }
      showAlert('alert-box', 'Job match created successfully.', 'success');
      await loadMatchList();
    } catch (err) {
      showAlert('form-alert', err.response?.data?.message || err.message || 'Failed to create job match', 'danger');
    } finally {
      toggleFormDisabled(form, false);
    }
  });
}

async function loadMatchDetails() {
  const id = getParam('id');
  if (!id) {
    showAlert('alert-box', 'Missing job match id', 'danger');
    return;
  }

  const summary = document.getElementById('match-summary');
  const form = document.getElementById('match-detail-form');
  const editBtn = document.getElementById('edit-match');
  const saveBtn = document.getElementById('save-match');
  const cancelBtn = document.getElementById('cancel-edit');
  const deleteBtn = document.getElementById('delete-match');

  const setValues = (row) => {
    if (!form) return;
    form.job_id.value = row.job_id || '';
    form.status.value = row.status || '';
    form.is_current.checked = !!row.is_current;
    form.rationale.value = row.rationale || '';
    refreshLookupDisplay(form.job_id);
  };

  const toggleEdit = (editing) => {
    if (!form) return;
    Array.from(form.elements).forEach((el) => {
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        el.disabled = !editing && el.name !== 'is_current';
        if (el.name === 'is_current') {
          el.disabled = !editing;
        }
      }
    });
    if (editBtn) editBtn.classList.toggle('d-none', editing);
    if (saveBtn) saveBtn.classList.toggle('d-none', !editing);
    if (cancelBtn) cancelBtn.classList.toggle('d-none', !editing);
  };

  try {
    const res = await api.get(`/prospect-job-matches/${id}`);
    const row = res.data;
    if (summary) {
      summary.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h5 mb-1">${escapeHtml(row.prospect_name || `Prospect #${row.prospect_id}`)}</h1>
            <div class="small text-muted">${escapeHtml(row.job_title || `Job #${row.job_id}`)}</div>
          </div>
          ${matchStatusBadge(row.status)}
        </div>
        <div class="small text-muted mt-2">Created ${formatDate(row.created_at)}${row.updated_at ? ` · Updated ${formatDate(row.updated_at)}` : ''}</div>`;
    }
    if (form) {
      setValues(row);
      toggleEdit(false);
    }

    if (editBtn) editBtn.onclick = () => toggleEdit(true);
    if (cancelBtn) cancelBtn.onclick = () => {
      setValues(row);
      toggleEdit(false);
    };
    if (saveBtn) saveBtn.onclick = async () => {
      if (!form) return;
      try {
        const jobId = requirePositiveInt(form.job_id.value, 'Job');
        const payload = {
          job_id: jobId,
          status: form.status.value || null,
          rationale: form.rationale.value || null,
          is_current: form.is_current.checked,
        };
        await api.put(`/prospect-job-matches/${id}`, payload);
        showAlert('alert-box', 'Job match updated.', 'success');
        toggleEdit(false);
        await loadMatchDetails();
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || err.message || 'Failed to update job match', 'danger');
      }
    };
    if (deleteBtn) deleteBtn.onclick = async () => {
      if (!confirm('Delete this job match?')) return;
      try {
        await api.delete(`/prospect-job-matches/${id}`);
        showAlert('alert-box', 'Job match deleted.', 'success');
        setTimeout(() => navigateTo('prospect-job-matches/list.html'), 800);
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to delete job match', 'danger');
      }
    };
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Failed to load job match', 'danger');
  }
}
