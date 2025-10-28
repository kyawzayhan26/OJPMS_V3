const VISA_STATUSES = ['Draft', 'Submitted', 'Processing', 'Approved', 'Rejected'];

function visaStatusBadge(status) {
  const normalized = (status || '').toLowerCase();
  const badge = {
    approved: 'text-bg-success',
    submitted: 'text-bg-primary',
    processing: 'text-bg-warning',
    rejected: 'text-bg-danger',
  }[normalized] || 'text-bg-secondary';
  return `<span class="badge ${badge}">${status || 'Draft'}</span>`;
}

async function loadVisaApplications() {
  const container = document.getElementById('visa-list');
  if (!container) return;
  container.innerHTML = '<div class="text-muted">Loading visa applications…</div>';
  try {
    const search = document.getElementById('search-input')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    const params = { limit: 100, page: 1, sort: 'updated_at:desc' };
    if (search) params.search = search;
    if (status) params.status = status;

    const res = await api.get('/visa-applications', { params });
    const rows = res.data?.rows || [];
    if (!rows.length) {
      container.innerHTML = '<div class="text-muted">No visa applications found.</div>';
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
                <div class="small text-muted">${escapeHtml(row.visa_type || 'Visa Application')}</div>
              </div>
              ${visaStatusBadge(row.status)}
            </div>
            <div class="small text-muted">${row.application_no ? `Reference ${escapeHtml(row.application_no)}` : ''}</div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="small text-muted">Updated ${row.updated_at ? formatDate(row.updated_at) : formatDate(row.created_at)}</span>
              <a class="btn btn-sm btn-outline-primary" href="${resolveAppPath('visa-applications/details.html?id=' + row.id)}">View</a>
            </div>
          </div>
        </div>`
      )
      .join('');
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Failed to load visa applications.</div>';
    showAlert('alert-box', err.response?.data?.message || 'Unable to fetch visa applications', 'danger');
  }
}

function setupVisaFilters() {
  ['search-input', 'status-filter'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => loadVisaApplications();
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', handler);
  });
}

function initVisaCreateForm() {
  const form = document.getElementById('visa-form');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const data = formToJSON(form);
    toggleFormDisabled(form, true);
    if (document.getElementById('form-alert')) document.getElementById('form-alert').innerHTML = '';
    try {
      const prospectId = requirePositiveInt(data.prospect_id, 'Prospect');
      const clientId = data.client_id ? parsePositiveInt(data.client_id) : null;
      if (data.client_id && !clientId) {
        throw new Error('Client must be a positive number.');
      }
      const payload = {
        prospect_id: prospectId,
        visa_type: data.visa_type ? data.visa_type.trim() || null : null,
        application_no: data.application_no ? data.application_no.trim() || null : null,
        status: data.status || 'Draft',
        submitted_at: data.submitted_at ? new Date(data.submitted_at).toISOString() : null,
        approved_at: data.approved_at ? new Date(data.approved_at).toISOString() : null,
        notes: data.notes ? data.notes.trim() || null : null,
      };
      if (clientId !== null) payload.client_id = clientId;
      await api.post('/visa-applications', payload);
      form.reset();
      const modalEl = document.getElementById('visaModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
      }
      showAlert('alert-box', 'Visa application created successfully.', 'success');
      await loadVisaApplications();
    } catch (err) {
      showAlert('form-alert', err.response?.data?.message || err.message || 'Failed to create visa application', 'danger');
    } finally {
      toggleFormDisabled(form, false);
    }
  });
}

async function loadVisaDetails() {
  const id = getParam('id');
  if (!id) {
    showAlert('alert-box', 'Missing visa application id', 'danger');
    return;
  }

  const summary = document.getElementById('visa-summary');
  const form = document.getElementById('visa-detail-form');
  const editBtn = document.getElementById('edit-visa');
  const saveBtn = document.getElementById('save-visa');
  const cancelBtn = document.getElementById('cancel-edit');
  const deleteBtn = document.getElementById('delete-visa');

  const setValues = (row) => {
    if (!form) return;
    form.prospect_id.value = row.prospect_id || '';
    form.client_id.value = row.client_id || '';
    form.visa_type.value = row.visa_type || '';
    form.application_no.value = row.application_no || '';
    form.status.value = row.status || 'Draft';
    form.submitted_at.value = toLocalInputValue(row.submitted_at);
    form.approved_at.value = toLocalInputValue(row.approved_at);
    form.notes.value = row.notes || '';
    refreshLookupDisplay(form.prospect_id);
    refreshLookupDisplay(form.client_id);
  };

  const toggleEdit = (editing) => {
    if (!form) return;
    const editable = ['client_id', 'visa_type', 'application_no', 'status', 'submitted_at', 'approved_at', 'notes'];
    Array.from(form.elements).forEach((el) => {
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        if (!editing) {
          el.disabled = true;
        } else {
          el.disabled = !editable.includes(el.name);
        }
      }
    });
    if (editBtn) editBtn.classList.toggle('d-none', editing);
    if (saveBtn) saveBtn.classList.toggle('d-none', !editing);
    if (cancelBtn) cancelBtn.classList.toggle('d-none', !editing);
  };

  try {
    const res = await api.get(`/visa-applications/${id}`);
    const row = res.data;
    if (summary) {
      summary.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h5 mb-1">${escapeHtml(row.prospect_name || `Prospect #${row.prospect_id}`)}</h1>
            <div class="small text-muted">${escapeHtml(row.visa_type || 'Visa application')}</div>
          </div>
          ${visaStatusBadge(row.status)}
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
        const clientId = form.client_id.value ? parsePositiveInt(form.client_id.value) : null;
        if (form.client_id.value && !clientId) {
          throw new Error('Client must be a positive number.');
        }
        const payload = {
          visa_type: form.visa_type.value ? form.visa_type.value.trim() || null : null,
          application_no: form.application_no.value ? form.application_no.value.trim() || null : null,
          status: form.status.value || null,
          submitted_at: form.submitted_at.value ? new Date(form.submitted_at.value).toISOString() : null,
          approved_at: form.approved_at.value ? new Date(form.approved_at.value).toISOString() : null,
          notes: form.notes.value ? form.notes.value.trim() || null : null,
        };
        if (clientId !== null) payload.client_id = clientId;
        await api.put(`/visa-applications/${id}`, payload);
        showAlert('alert-box', 'Visa application updated.', 'success');
        toggleEdit(false);
        await loadVisaDetails();
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || err.message || 'Failed to update visa application', 'danger');
      }
    };
    if (deleteBtn) deleteBtn.onclick = async () => {
      if (!confirm('Delete this visa application?')) return;
      try {
        await api.delete(`/visa-applications/${id}`);
        showAlert('alert-box', 'Visa application deleted.', 'success');
        setTimeout(() => navigateTo('visa-applications/list.html'), 800);
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to delete visa application', 'danger');
      }
    };
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Failed to load visa application', 'danger');
  }
}

