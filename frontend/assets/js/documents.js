const DOCUMENT_TYPES = [
  'Passport',
  'Photo',
  'EducationCert',
  'MedicalCheck',
  'PoliceClearance',
  'SmartCardForm',
  'VisaForm',
  'Other',
];

const DOCUMENT_STATUSES = ['Pending', 'Uploaded', 'Verified', 'Rejected', 'Expired'];

let currentPreviewUrl = null;
let currentPreviewBlob = null;
let currentPreviewFilename = null;
let currentPreviewId = null;

function cleanupPreviewUrl() {
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
  }
}

function parseDispositionFilename(header) {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8 && utf8[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch (err) {
      return utf8[1];
    }
  }
  const simple = /filename="?([^";]+)"?/i.exec(header);
  return simple && simple[1] ? simple[1] : null;
}

function guessExtension(mime) {
  const map = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  return map[mime] || '';
}

function sanitiseFilename(name, fallback = 'document') {
  const base = (name || fallback || 'document').trim() || 'document';
  return base.replace(/[\\/:*?"<>|]+/g, '_');
}

async function fetchDocumentBlob(id) {
  const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
  return {
    blob: response.data,
    filename: parseDispositionFilename(response.headers['content-disposition']),
    mime: response.headers['content-type'] || response.data?.type || '',
  };
}

function triggerFileDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadDocumentFile(id, fallbackName) {
  try {
    let blob = null;
    let filename = null;
    if (currentPreviewId === id && currentPreviewBlob instanceof Blob) {
      blob = currentPreviewBlob;
      filename = currentPreviewFilename;
    } else {
      const fetched = await fetchDocumentBlob(id);
      blob = fetched.blob;
      filename = fetched.filename;
    }
    const safeBase = sanitiseFilename(filename || fallbackName || `document-${id}`);
    const ext = filename ? '' : guessExtension(blob.type || '');
    triggerFileDownload(blob, `${safeBase}${ext}`);
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Failed to download document.', 'danger');
  }
}

function hideDocumentPreview(message = 'No preview available.') {
  const card = document.getElementById('document-preview-card');
  const container = document.getElementById('document-preview');
  cleanupPreviewUrl();
  currentPreviewBlob = null;
  currentPreviewFilename = null;
  currentPreviewId = null;
  if (container) container.innerHTML = `<div class="text-muted">${message}</div>`;
  if (card) card.classList.add('d-none');
}

async function renderDocumentPreview(id) {
  const card = document.getElementById('document-preview-card');
  const container = document.getElementById('document-preview');
  if (!card || !container) return;
  container.innerHTML = '<div class="text-muted">Loading preview…</div>';
  card.classList.remove('d-none');
  try {
    const { blob, filename, mime } = await fetchDocumentBlob(id);
    cleanupPreviewUrl();
    currentPreviewBlob = blob;
    currentPreviewFilename = filename;
    currentPreviewId = id;
    currentPreviewUrl = URL.createObjectURL(blob);
    if ((mime || blob.type || '').startsWith('image/')) {
      container.innerHTML = `<img src="${currentPreviewUrl}" class="img-fluid rounded border" alt="Document preview">`;
    } else if (mime === 'application/pdf' || blob.type === 'application/pdf') {
      container.innerHTML = `<iframe src="${currentPreviewUrl}" class="document-preview-frame" title="Document preview"></iframe>`;
    } else {
      container.innerHTML = '<div class="text-muted">Preview not available for this file type. Use the download button instead.</div>';
    }
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Unable to load preview.</div>';
    showAlert('alert-box', err.response?.data?.message || 'Unable to preview document.', 'danger');
  }
}

function typeLabel(type) {
  return type || 'Document';
}

function buildDocumentCard(doc) {
  const statusBadge = {
    Verified: 'text-bg-success',
    Uploaded: 'text-bg-primary',
    Pending: 'text-bg-secondary',
    Rejected: 'text-bg-danger',
    Expired: 'text-bg-warning',
  }[doc.status] || 'text-bg-secondary';

  const prospectLabel = doc.prospect_name
    ? `${escapeHtml(doc.prospect_name)} (#${doc.prospect_id})`
    : `Prospect #${doc.prospect_id}`;

  const fileButton = doc.file_url
    ? `<button type="button" class="btn btn-sm btn-outline-secondary" data-download-id="${doc.id}" data-download-name="${escapeHtml(typeLabel(doc.type))}">Download</button>`
    : '';

  return `
    <div class="card shadow-sm">
      <div class="card-body d-flex flex-column gap-2">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div class="fw-semibold">${typeLabel(doc.type)}</div>
            <div class="small text-muted">${prospectLabel}</div>
          </div>
          <span class="badge ${statusBadge}">${doc.status || 'Pending'}</span>
        </div>
        <div class="small text-muted">Document #${doc.id} · Created ${formatDate(doc.created_at)}</div>
        <div class="small">${escapeHtml(doc.remarks || 'No remarks')}</div>
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <span class="small text-muted">Updated ${doc.updated_at ? formatDate(doc.updated_at) : '—'}</span>
            <div class="d-flex gap-2">
            ${fileButton}
            <a class="btn btn-sm btn-primary" href="${resolveAppPath('documents/details.html?id=' + doc.id)}">View</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function populateTypeSelect(select) {
  if (!select) return;
  const options = ['<option value="">All types</option>']
    .concat(DOCUMENT_TYPES.map((type) => `<option value="${type}">${type}</option>`));
  select.innerHTML = options.join('');
}

function populateTypeSelectExact(select) {
  if (!select) return;
  const options = ['<option value="" disabled>Select type</option>']
    .concat(DOCUMENT_TYPES.map((type) => `<option value="${type}">${type}</option>`));
  select.innerHTML = options.join('');
  if (select.options.length > 1) {
    select.selectedIndex = 1;
  }
}

function initialiseDocumentFilters() {
  populateTypeSelect(document.getElementById('type-filter'));
  const typeSelect = document.querySelector('#document-form select[name="type"]');
  populateTypeSelectExact(typeSelect);

  const inputs = ['search-input', 'prospect-filter', 'status-filter', 'type-filter'];
  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const event = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(event, () => loadDocumentsList());
  });

  const presetProspect = getParam('prospect_id');
  if (presetProspect) {
    const filter = document.getElementById('prospect-filter');
    if (filter) {
      filter.value = presetProspect;
    }
  }
}

async function loadDocumentsList() {
  const container = document.getElementById('documents-list');
  if (!container) return;
  container.innerHTML = '<div class="text-muted">Loading documents…</div>';
  try {
    const search = document.getElementById('search-input')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    const type = document.getElementById('type-filter')?.value || '';
    const prospectId = document.getElementById('prospect-filter')?.value || '';
    const params = {};
    if (search) params.search = search;
    if (status) params.status = status;
    if (type) params.type = type;
    if (prospectId) {
      const parsed = parsePositiveInt(prospectId);
      if (!parsed) {
        showAlert('alert-box', 'Prospect filter must be a positive number.', 'warning');
        container.innerHTML = '<div class="text-muted">Adjust the filters to continue.</div>';
        return;
      }
      params.prospect_id = parsed;
    }
    const res = await api.get('/documents', { params });
    const rows = res.data?.rows || [];
    if (!rows.length) {
      container.innerHTML = '<div class="text-muted">No documents found.</div>';
      return;
    }
    container.innerHTML = rows.map((row) => buildDocumentCard(row)).join('');
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Failed to load documents.</div>';
    showAlert('alert-box', err.response?.data?.message || 'Unable to fetch documents', 'danger');
  }
}

function initDocumentUpload() {
  const form = document.getElementById('document-form');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  const typeSelect = form.querySelector('select[name="type"]');
  populateTypeSelectExact(typeSelect);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const alertBox = document.getElementById('form-alert');
    if (alertBox) alertBox.innerHTML = '';

    const formData = new FormData(form);
    const prospectIdRaw = formData.get('prospect_id');
    const prospectId = parsePositiveInt(prospectIdRaw);
    if (!prospectId) {
      showAlert('form-alert', 'Please enter a valid prospect id.', 'danger');
      return;
    }
    if (!formData.get('file')) {
      showAlert('form-alert', 'Please choose a document file.', 'danger');
      return;
    }

    toggleFormDisabled(form, true);
    try {
      const payload = new FormData();
      payload.append('file', formData.get('file'));
      payload.append('type', formData.get('type'));
      if (formData.get('remarks')) payload.append('remarks', formData.get('remarks'));
      if (formData.get('status')) payload.append('status', formData.get('status'));

      await api.post(`/documents/${prospectId}/files`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const modalEl = document.getElementById('documentModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
      }
      form.reset();
      populateTypeSelectExact(typeSelect);
      showAlert('alert-box', 'Document uploaded successfully.', 'success');
      await loadDocumentsList();
    } catch (err) {
      showAlert('form-alert', err.response?.data?.message || err.message || 'Failed to upload document', 'danger');
    } finally {
      toggleFormDisabled(form, false);
    }
  });
}

function setDocumentFormValues(form, doc) {
  if (!form) return;
  form.prospect_id.value = doc.prospect_id || '';
  if (DOCUMENT_TYPES.includes(doc.type)) {
    form.type.value = doc.type;
  }
  form.status.value = doc.status || 'Pending';
  form.remarks.value = doc.remarks || '';
  refreshLookupDisplay(form.prospect_id);
}

function toggleDocumentEdit(enabled) {
  const form = document.getElementById('document-detail-form');
  if (!form) return;
  const fields = ['type', 'status', 'remarks'];
  fields.forEach((name) => {
    const field = form.elements.namedItem(name);
    if (field) {
      field.disabled = !enabled;
    }
  });
  const save = document.getElementById('save-document');
  const cancel = document.getElementById('cancel-edit');
  const edit = document.getElementById('edit-document');
  if (save) save.classList.toggle('d-none', !enabled);
  if (cancel) cancel.classList.toggle('d-none', !enabled);
  if (edit) edit.classList.toggle('d-none', enabled);
}

document.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-download-id]');
  if (!btn) return;
  event.preventDefault();
  const id = Number(btn.dataset.downloadId);
  if (!Number.isFinite(id) || id <= 0) return;
  downloadDocumentFile(id, btn.dataset.downloadName || 'Document');
});

window.addEventListener('beforeunload', () => {
  cleanupPreviewUrl();
});

async function loadDocumentDetails() {
  const id = getParam('id');
  if (!id) {
    showAlert('alert-box', 'Missing document id.', 'danger');
    return;
  }

  const form = document.getElementById('document-detail-form');
  populateTypeSelectExact(form?.type);

  try {
    const res = await api.get(`/documents/${id}`);
    const doc = res.data;
    if (!doc) {
      showAlert('alert-box', 'Document not found.', 'warning');
      return;
    }
    const title = document.getElementById('document-title');
    const meta = document.getElementById('document-meta');
    const timestamps = document.getElementById('document-timestamps');
    const download = document.getElementById('download-button');
    const deleteBtn = document.getElementById('delete-document');

    if (title) title.textContent = `${typeLabel(doc.type)} #${doc.id}`;
    if (meta) meta.textContent = doc.prospect_name
      ? `${doc.prospect_name} · Prospect #${doc.prospect_id}`
      : `Prospect #${doc.prospect_id}`;
    if (timestamps) timestamps.textContent = `Created ${formatDate(doc.created_at)}${doc.updated_at ? ` · Updated ${formatDate(doc.updated_at)}` : ''}`;
    if (download) {
      download.dataset.downloadId = doc.id;
      download.dataset.downloadName = typeLabel(doc.type);
      download.disabled = !doc.file_url;
    }

    const refreshBtn = document.getElementById('refresh-preview');
    if (doc.file_url) {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.onclick = () => renderDocumentPreview(doc.id);
      }
      renderDocumentPreview(doc.id);
    } else {
      if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.onclick = null;
      }
      hideDocumentPreview('No document file available.');
    }

    setDocumentFormValues(form, doc);
    toggleDocumentEdit(false);

    const editBtn = document.getElementById('edit-document');
    if (editBtn) {
      editBtn.onclick = () => toggleDocumentEdit(true);
    }

    const cancelBtn = document.getElementById('cancel-edit');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        setDocumentFormValues(form, doc);
        toggleDocumentEdit(false);
      };
    }

    const saveBtn = document.getElementById('save-document');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        const payload = {
          status: form.status.value,
          type: form.type.value,
          remarks: form.remarks.value || null,
        };
        try {
          await api.patch(`/documents/${id}`, payload);
          showAlert('alert-box', 'Document updated successfully.', 'success');
          toggleDocumentEdit(false);
          await loadDocumentDetails();
        } catch (err) {
          showAlert('alert-box', err.response?.data?.message || 'Failed to update document', 'danger');
        }
      };
    }

    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        const confirmed = await promptKeywordConfirm({
          title: 'Delete document',
          messageHtml: 'Type <strong>delete</strong> to remove this document.',
          keyword: 'delete',
          confirmLabel: 'Delete',
        });
        if (!confirmed) return;
        try {
          await api.delete(`/documents/${id}`);
          showAlert('alert-box', 'Document deleted.', 'success');
          setTimeout(() => navigateTo('documents/list.html'), 800);
        } catch (err) {
          showAlert('alert-box', err.response?.data?.message || 'Failed to delete document', 'danger');
        }
      };
    }
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Unable to load document', 'danger');
  }
}
