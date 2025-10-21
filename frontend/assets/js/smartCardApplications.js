const SMARTCARD_STATUSES = ['Pending', 'In Progress', 'Issued', 'Collected', 'Rejected'];

function smartcardStatusBadge(status) {
  const normalized = (status || '').toLowerCase();
  const badge = {
    issued: 'text-bg-success',
    collected: 'text-bg-primary',
    rejected: 'text-bg-danger',
    'in progress': 'text-bg-warning',
  }[normalized] || 'text-bg-secondary';
  return `<span class="badge ${badge}">${status || 'Pending'}</span>`;
}

async function loadSmartcardApplications() {
  const container = document.getElementById('smartcard-list');
  if (!container) return;
  container.innerHTML = '<div class="text-muted">Loading SmartCard applications…</div>';
  try {
    const search = document.getElementById('search-input')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    const params = { limit: 100, page: 1, sort: 'updated_at:desc' };
    if (search) params.search = search;
    if (status) params.status = status;

    const res = await api.get('/smartcard-applications', { params });
    const rows = res.data?.rows || [];
    if (!rows.length) {
      container.innerHTML = '<div class="text-muted">No SmartCard applications found.</div>';
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
                <div class="small text-muted">Card number ${escapeHtml(row.card_number || '—')}</div>
              </div>
              ${smartcardStatusBadge(row.status)}
            </div>
            <div class="small text-muted">Updated ${row.updated_at ? formatDate(row.updated_at) : formatDate(row.created_at)}</div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="small text-muted">Created ${formatDate(row.created_at)}</span>
              <a class="btn btn-sm btn-outline-primary" href="${resolveAppPath('smartcard-applications/details.html?id=' + row.id)}">View</a>
            </div>
          </div>
        </div>`
      )
      .join('');
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Failed to load SmartCard applications.</div>';
    showAlert('alert-box', err.response?.data?.message || 'Unable to fetch SmartCard applications', 'danger');
  }
}

function setupSmartcardFilters() {
  ['search-input', 'status-filter'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => loadSmartcardApplications();
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', handler);
  });
}

function initSmartcardCreateForm() {
  const form = document.getElementById('smartcard-form');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    toggleFormDisabled(form, true);
    if (document.getElementById('form-alert')) document.getElementById('form-alert').innerHTML = '';
    try {
      const data = formToJSON(form);
      const payload = {
        prospect_id: Number(data.prospect_id),
        client_id: data.client_id ? Number(data.client_id) : null,
        card_number: data.card_number ? data.card_number.trim() || null : null,
        status: data.status || 'Pending',
        submitted_at: data.submitted_at ? new Date(data.submitted_at).toISOString() : null,
        issued_at: data.issued_at ? new Date(data.issued_at).toISOString() : null,
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
        notes: data.notes ? data.notes.trim() || null : null,
      };
      await api.post('/smartcard-applications', payload);
      form.reset();
      const modalEl = document.getElementById('smartcardModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
      }
      showAlert('alert-box', 'SmartCard application created successfully.', 'success');
      await loadSmartcardApplications();
    } catch (err) {
      showAlert('form-alert', err.response?.data?.message || 'Failed to create SmartCard application', 'danger');
    } finally {
      toggleFormDisabled(form, false);
    }
  });
}

async function loadSmartcardDetails() {
  const id = getParam('id');
  if (!id) {
    showAlert('alert-box', 'Missing SmartCard application id', 'danger');
    return;
  }

  const summary = document.getElementById('smartcard-summary');
  const form = document.getElementById('smartcard-detail-form');
  const editBtn = document.getElementById('edit-smartcard');
  const saveBtn = document.getElementById('save-smartcard');
  const cancelBtn = document.getElementById('cancel-edit');
  const deleteBtn = document.getElementById('delete-smartcard');

  const setValues = (row) => {
    if (!form) return;
    form.prospect_id.value = row.prospect_id || '';
    form.client_id.value = row.client_id || '';
    form.card_number.value = row.card_number || '';
    form.status.value = row.status || 'Pending';
    form.submitted_at.value = toLocalInputValue(row.submitted_at);
    form.issued_at.value = toLocalInputValue(row.issued_at);
    form.expires_at.value = toLocalInputValue(row.expires_at);
    form.notes.value = row.notes || '';
  };

  const toggleEdit = (editing) => {
    if (!form) return;
    const editable = ['client_id', 'card_number', 'status', 'submitted_at', 'issued_at', 'expires_at', 'notes'];
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
    const res = await api.get(`/smartcard-applications/${id}`);
    const row = res.data;
    if (summary) {
      summary.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h5 mb-1">${escapeHtml(row.prospect_name || `Prospect #${row.prospect_id}`)}</h1>
            <div class="small text-muted">Card number ${escapeHtml(row.card_number || '—')}</div>
          </div>
          ${smartcardStatusBadge(row.status)}
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
      const payload = {
        client_id: form.client_id.value ? Number(form.client_id.value) : null,
        card_number: form.card_number.value ? form.card_number.value.trim() || null : null,
        status: form.status.value || null,
        submitted_at: form.submitted_at.value ? new Date(form.submitted_at.value).toISOString() : null,
        issued_at: form.issued_at.value ? new Date(form.issued_at.value).toISOString() : null,
        expires_at: form.expires_at.value ? new Date(form.expires_at.value).toISOString() : null,
        notes: form.notes.value ? form.notes.value.trim() || null : null,
      };
      try {
        await api.put(`/smartcard-applications/${id}`, payload);
        showAlert('alert-box', 'SmartCard application updated.', 'success');
        toggleEdit(false);
        await loadSmartcardDetails();
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to update SmartCard application', 'danger');
      }
    };
    if (deleteBtn) deleteBtn.onclick = async () => {
      if (!confirm('Delete this SmartCard application?')) return;
      try {
        await api.delete(`/smartcard-applications/${id}`);
        showAlert('alert-box', 'SmartCard application deleted.', 'success');
        setTimeout(() => navigateTo('smartcard-applications/list.html'), 800);
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to delete SmartCard application', 'danger');
      }
    };
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Failed to load SmartCard application', 'danger');
  }
}

