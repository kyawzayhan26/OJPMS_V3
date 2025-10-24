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
    ? `<a class="btn btn-sm btn-outline-secondary" href="${doc.file_url}" target="_blank" rel="noopener">Download</a>`
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
    if (prospectId) params.prospect_id = Number(prospectId);
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
    const prospectId = formData.get('prospect_id');
    if (!prospectId || Number(prospectId) <= 0) {
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
      showAlert('form-alert', err.response?.data?.message || 'Failed to upload document', 'danger');
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
      if (doc.file_url) {
        download.href = doc.file_url;
        download.classList.remove('disabled');
      } else {
        download.href = '#';
        download.classList.add('disabled');
      }
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
