const DOCUMENT_STATUSES = ['Pending', 'Uploaded', 'Verified', 'Rejected', 'Expired'];

const STATUS_BADGES = {
  Verified: 'text-bg-success',
  Uploaded: 'text-bg-primary',
  Pending: 'text-bg-secondary',
  Rejected: 'text-bg-danger',
  Expired: 'text-bg-warning',
};

const PROCESS_DEFAULTS = {
  SmartCardForm: {
    title: 'SmartCard Processes',
    singular: 'SmartCard document',
    path: 'smartcard-processes',
  },
  VisaForm: {
    title: 'Visa Processes',
    singular: 'Visa document',
    path: 'visa-processes',
  },
};

let currentProcessDoc = null;

function resolveProcessConfig(type, datasetPath = '') {
  const base = PROCESS_DEFAULTS[type] || {
    title: 'Document Processes',
    singular: 'Document',
    path: datasetPath || 'documents',
  };
  return {
    ...base,
    type,
    path: datasetPath || base.path,
  };
}

function statusBadgeClass(status) {
  return STATUS_BADGES[status] || 'text-bg-secondary';
}

function buildProcessCard(config, doc) {
  const clientLabel = doc.client_name || `Client #${doc.client_id}`;
  const prospectLabel = doc.prospect_name ? `${doc.prospect_name}${doc.prospect_id ? ` (#${doc.prospect_id})` : ''}` : (doc.prospect_id ? `Prospect #${doc.prospect_id}` : '—');
  const remarks = doc.remarks ? doc.remarks : 'No remarks provided.';
  const detailPath = `${config.path}/details.html?id=${doc.id}`;
  const fileButton = doc.file_url
    ? `<a class="btn btn-sm btn-outline-secondary" href="${doc.file_url}" target="_blank" rel="noopener">Open file</a>`
    : '';
  return `
    <div class="card shadow-sm">
      <div class="card-body d-flex flex-column gap-2">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div class="fw-semibold">${clientLabel}</div>
            <div class="small text-muted">Prospect: ${prospectLabel}</div>
          </div>
          <span class="badge ${statusBadgeClass(doc.status)}">${doc.status || 'Pending'}</span>
        </div>
        <div class="small text-muted">Document #${doc.id} · Created ${formatDate(doc.created_at)}</div>
        <div class="small">${remarks}</div>
        <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
          <div class="small text-muted">Type: ${doc.type || '—'}</div>
          <div class="d-flex gap-2">
            ${fileButton}
            <a class="btn btn-sm btn-primary" href="${resolveAppPath(detailPath)}">View</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function populateClientSelect(select) {
  if (!select) return;
  select.innerHTML = '<option value="">Loading clients…</option>';
  select.disabled = true;
  try {
    const res = await api.get('/clients', { params: { limit: 100, page: 1, sort: 'full_name:asc' } });
    const rows = res.data?.rows || [];
    if (!rows.length) {
      select.innerHTML = '<option value="">No clients available</option>';
      return;
    }
    const options = ['<option value="" disabled selected>Select a client</option>']
      .concat(
        rows.map((client) => `
          <option value="${client.id}">
            ${client.full_name || `Client #${client.id}`} (${client.passport_no || 'No passport'})
          </option>
        `)
      );
    select.innerHTML = options.join('');
    select.disabled = false;
  } catch (err) {
    console.error('Failed to load clients', err);
    select.innerHTML = '<option value="">Unable to load clients</option>';
  }
}

async function loadProcessList(config) {
  const container = document.getElementById('process-list');
  const alertBox = document.getElementById('alert-box');
  if (!container) return;
  container.innerHTML = '<div class="text-muted">Loading…</div>';
  try {
    const search = document.getElementById('search-input')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    const res = await api.get('/documents', {
      params: {
        type: config.type,
        search: search || undefined,
        status: status || undefined,
      },
    });
    const rows = (res.data?.rows || []).filter((doc) => doc.type === config.type);
    if (!rows.length) {
      container.innerHTML = `<div class="text-muted">No ${config.singular.toLowerCase()}s found.</div>`;
      if (alertBox) alertBox.innerHTML = '';
      return;
    }
    container.innerHTML = rows.map((doc) => buildProcessCard(config, doc)).join('');
    if (alertBox) alertBox.innerHTML = '';
  } catch (err) {
    console.error('Failed to load documents', err);
    container.innerHTML = '<div class="text-danger">Failed to load documents.</div>';
    showAlert('alert-box', err.response?.data?.message || 'Unable to fetch documents', 'danger');
  }
}

function setupProcessFilters(config) {
  const searchInput = document.getElementById('search-input');
  const statusSelect = document.getElementById('status-filter');
  if (searchInput) {
    searchInput.addEventListener('input', () => loadProcessList(config));
  }
  if (statusSelect) {
    statusSelect.addEventListener('change', () => loadProcessList(config));
  }
}

function initProcessUpload(config) {
  const form = document.getElementById('process-upload-form');
  const modalEl = document.getElementById('processUploadModal');
  if (!form || !modalEl) return;
  const select = form.querySelector('select[name="client_id"]');
  const fileInput = form.querySelector('input[name="file"]');

  modalEl.addEventListener('show.bs.modal', () => {
    populateClientSelect(select);
    if (form) {
      form.reset();
      if (select) {
        select.disabled = true;
      }
      if (fileInput) fileInput.value = '';
      const alert = document.getElementById('form-alert');
      if (alert) alert.innerHTML = '';
    }
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const alert = document.getElementById('form-alert');
    if (alert) alert.innerHTML = '';
    const data = new FormData(form);
    const clientId = data.get('client_id');
    if (!clientId) {
      showAlert('form-alert', 'Please select a client.', 'danger');
      return;
    }
    if (!data.get('file')) {
      showAlert('form-alert', 'Please choose a file to upload.', 'danger');
      return;
    }
    data.delete('client_id');
    data.set('type', config.type);
    toggleFormDisabled(form, true);
    try {
      await api.post(`/documents/${clientId}/files`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
      form.reset();
      showAlert('alert-box', `${config.singular} uploaded successfully.`, 'success');
      await loadProcessList(config);
    } catch (err) {
      console.error('Failed to upload document', err);
      showAlert('form-alert', err.response?.data?.message || 'Failed to upload document', 'danger');
    } finally {
      toggleFormDisabled(form, false);
    }
  });
}

function setProcessDetailSummary(config, doc) {
  const titleEl = document.getElementById('process-title');
  const metaEl = document.getElementById('process-meta');
  const statusEl = document.getElementById('process-status');
  const clientEl = document.getElementById('process-client');
  const prospectEl = document.getElementById('process-prospect');
  const createdEl = document.getElementById('process-created');
  const fileEl = document.getElementById('process-file');

  if (titleEl) titleEl.textContent = `${config.singular} #${doc.id}`;
  if (metaEl) {
    const stamp = formatDate(doc.updated_at || doc.created_at);
    metaEl.textContent = stamp ? `Last updated ${stamp}` : '';
  }
  if (statusEl) {
    statusEl.textContent = doc.status || 'Pending';
    statusEl.className = `badge ${statusBadgeClass(doc.status)}`;
  }
  if (clientEl) clientEl.textContent = doc.client_name || `Client #${doc.client_id}`;
  if (prospectEl) {
    prospectEl.textContent = doc.prospect_name
      ? `${doc.prospect_name}${doc.prospect_id ? ` (#${doc.prospect_id})` : ''}`
      : (doc.prospect_id ? `Prospect #${doc.prospect_id}` : '—');
  }
  if (createdEl) createdEl.textContent = formatDate(doc.created_at);
  if (fileEl) {
    fileEl.innerHTML = doc.file_url
      ? `<a href="${doc.file_url}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-secondary">Open file</a>`
      : '<span class="text-muted">No file URL available.</span>';
  }
}

function setProcessFormValues(doc) {
  const form = document.getElementById('process-detail-form');
  if (!form) return;
  const statusField = form.querySelector('[name="status"]');
  const remarksField = form.querySelector('[name="remarks"]');
  const urlField = form.querySelector('[name="file_url"]');
  if (statusField && !DOCUMENT_STATUSES.includes(doc.status)) {
    statusField.value = 'Pending';
  }
  if (statusField) statusField.value = doc.status || 'Pending';
  if (remarksField) remarksField.value = doc.remarks || '';
  if (urlField) urlField.value = doc.file_url || '';
}

function toggleProcessEdit(isEditing) {
  const form = document.getElementById('process-detail-form');
  if (!form) return;
  const editBtn = document.getElementById('edit-process');
  const saveBtn = document.getElementById('save-process');
  const cancelBtn = document.getElementById('cancel-edit');
  Array.from(form.elements).forEach((el) => {
    if (el.name) {
      el.disabled = !isEditing && el.tagName !== 'BUTTON';
    }
  });
  if (editBtn) editBtn.classList.toggle('d-none', isEditing);
  if (saveBtn) saveBtn.classList.toggle('d-none', !isEditing);
  if (cancelBtn) cancelBtn.classList.toggle('d-none', !isEditing);
}

function initProcessDetailActions(config) {
  const form = document.getElementById('process-detail-form');
  const editBtn = document.getElementById('edit-process');
  const saveBtn = document.getElementById('save-process');
  const cancelBtn = document.getElementById('cancel-edit');
  const deleteBtn = document.getElementById('delete-process');
  const alertBox = document.getElementById('alert-box');
  const formAlert = document.getElementById('form-alert');

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      toggleProcessEdit(true);
      if (formAlert) formAlert.innerHTML = '';
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (formAlert) formAlert.innerHTML = '';
      if (currentProcessDoc) {
        setProcessFormValues(currentProcessDoc);
      }
      toggleProcessEdit(false);
    });
  }

  if (form) {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!currentProcessDoc) return;
      if (formAlert) formAlert.innerHTML = '';
      const statusField = form.querySelector('[name="status"]');
      const remarksField = form.querySelector('[name="remarks"]');
      const urlField = form.querySelector('[name="file_url"]');

      const payload = {};
      const statusValue = statusField?.value || null;
      const remarksValue = remarksField?.value?.trim() || '';
      const urlValue = urlField?.value?.trim() || '';

      if (statusValue && statusValue !== (currentProcessDoc.status || '')) {
        payload.status = statusValue;
      }
      if (remarksValue !== (currentProcessDoc.remarks || '')) {
        payload.remarks = remarksValue || null;
      }
      if (urlValue !== (currentProcessDoc.file_url || '')) {
        payload.file_url = urlValue || null;
      }

      if (!Object.keys(payload).length) {
        showAlert('form-alert', 'No changes to save.', 'info');
        toggleProcessEdit(false);
        return;
      }

      toggleFormDisabled(form, true);
      try {
        const res = await api.patch(`/documents/${currentProcessDoc.id}`, payload);
        currentProcessDoc = res.data;
        setProcessFormValues(currentProcessDoc);
        setProcessDetailSummary(config, currentProcessDoc);
        toggleProcessEdit(false);
        showAlert('alert-box', 'Document updated successfully.', 'success');
      } catch (err) {
        console.error('Failed to update document', err);
        showAlert('form-alert', err.response?.data?.message || 'Failed to update document', 'danger');
      } finally {
        toggleFormDisabled(form, false);
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!currentProcessDoc) return;
      if (!window.confirm('Are you sure you want to delete this document?')) return;
      deleteBtn.disabled = true;
      try {
        await api.delete(`/documents/${currentProcessDoc.id}`);
        showAlert('alert-box', 'Document deleted.', 'success');
        setTimeout(() => {
          navigateTo(`${config.path}/list.html`);
        }, 600);
      } catch (err) {
        console.error('Failed to delete document', err);
        showAlert('alert-box', err.response?.data?.message || 'Failed to delete document', 'danger');
        deleteBtn.disabled = false;
      }
    });
  }

  toggleProcessEdit(false);
}

async function loadProcessDetail(config) {
  const id = getParam('id');
  if (!id) {
    showAlert('alert-box', 'Missing document id.', 'danger');
    return;
  }
  try {
    const res = await api.get(`/documents/${id}`);
    const doc = res.data;
    if (!doc || doc.type !== config.type) {
      showAlert('alert-box', 'Document not found for this process type.', 'danger');
      return;
    }
    currentProcessDoc = doc;
    setProcessDetailSummary(config, doc);
    setProcessFormValues(doc);
  } catch (err) {
    console.error('Failed to load document', err);
    showAlert('alert-box', err.response?.data?.message || 'Unable to load document', 'danger');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const body = document.body;
  const type = body?.dataset?.processType;
  const view = body?.dataset?.processView;
  const path = body?.dataset?.processPath || '';
  if (!type || !view) return;

  const config = resolveProcessConfig(type, path);

  renderNavbar();
  await requireAuthGuard();

  if (view === 'list') {
    setupProcessFilters(config);
    initProcessUpload(config);
    await loadProcessList(config);
  } else if (view === 'detail') {
    await loadProcessDetail(config);
    initProcessDetailActions(config);
  }
});
