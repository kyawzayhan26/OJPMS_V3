const APPLICATION_STATUSES = ['Draft', 'Submitted', 'Rejected', 'Shortlisted'];

async function loadApplicationsList() {
  const container = document.getElementById('apps-list');
  if (!container) return;
  container.innerHTML = '<div class="text-muted">Loading applications…</div>';
  try {
    const search = document.getElementById('search-input')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    const prospectId = document.getElementById('prospect-filter')?.value || '';
    const jobId = document.getElementById('job-filter')?.value || '';
    const sort = document.getElementById('sort-select')?.value || 'created_at:desc';
    const params = {
      search: search || undefined,
      status: status || undefined,
      prospect_id: prospectId || undefined,
      job_id: jobId || undefined,
      limit: 100,
      page: 1,
      sort,
    };
    const res = await api.get('/applications', { params });
    const rows = res.data?.rows || [];
    container.innerHTML = rows
      .map(
        (app) => `
        <div class="card shadow-sm">
          <div class="card-body d-flex flex-column gap-2">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-semibold">${app.prospect_name}</div>
                <div class="small text-muted">${app.job_title || 'Job #' + app.job_id}</div>
              </div>
              <span class="badge text-bg-secondary">${app.status}</span>
            </div>
            <div class="small text-muted">Submitted: ${app.submitted_at ? formatDate(app.submitted_at) : '—'}</div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="small text-muted">Updated ${formatDate(app.updated_at || app.created_at)}</span>
              <a class="btn btn-sm btn-outline-primary" href="${resolveAppPath('applications/details.html?id=' + app.id)}">View</a>
            </div>
          </div>
        </div>`
      )
      .join('');
    if (!rows.length) container.innerHTML = '<div class="text-muted">No applications found.</div>';
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Failed to load applications.</div>';
    showAlert('alert-box', err.response?.data?.message || 'Unable to fetch applications', 'danger');
  }
}

function setupApplicationFilters() {
  ['search-input', 'status-filter', 'prospect-filter', 'job-filter', 'sort-select'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => loadApplicationsList();
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', handler);
  });
}

function initApplicationForm() {
  const form = document.getElementById('application-form');
  if (!form) return;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    toggleFormDisabled(form, true);
    const data = formToJSON(form);
    try {
      const prospectId = requirePositiveInt(data.prospect_id, 'Prospect');
      const jobId = requirePositiveInt(data.job_id, 'Job');
      const payload = {
        prospect_id: prospectId,
        job_id: jobId,
        status: data.status,
        notes: data.notes || null,
        employer_response_at: data.employer_response_at || null,
      };
      await api.post('/applications', payload);
      form.reset();
      const modalEl = document.getElementById('applicationModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
      }
      showAlert('alert-box', 'Application created.', 'success');
      await loadApplicationsList();
    } catch (err) {
      showAlert('form-alert', err.response?.data?.message || err.message || 'Failed to create application', 'danger');
    } finally {
      toggleFormDisabled(form, false);
    }
  });
}

async function loadApplicationDetails() {
  const id = getParam('id');
  if (!id) {
    showAlert('alert-box', 'Missing application id', 'danger');
    return;
  }
  const summary = document.getElementById('application-summary');
  const form = document.getElementById('application-detail-form');
  const deleteBtn = document.getElementById('delete-application');
  const editBtn = document.getElementById('edit-application');
  const saveBtn = document.getElementById('save-application');
  const cancelBtn = document.getElementById('cancel-edit');

  const setFormValues = (app) => {
    if (!form) return;
    form.prospect_id.value = app.prospect_id || '';
    form.job_id.value = app.job_id || '';
    form.status.value = app.status || 'Draft';
    form.notes.value = app.notes || '';
    form.employer_response_at.value = app.employer_response_at ? app.employer_response_at.split('T')[0] : '';
    refreshLookupDisplay(form.prospect_id);
    refreshLookupDisplay(form.job_id);
  };

  const toggleEdit = (isEditing) => {
    if (!form) return;
    Array.from(form.elements).forEach((el) => {
      if (el.name) {
        el.disabled = !isEditing && el.tagName !== 'BUTTON';
      }
    });
    if (editBtn) editBtn.classList.toggle('d-none', isEditing);
    if (saveBtn) saveBtn.classList.toggle('d-none', !isEditing);
    if (cancelBtn) cancelBtn.classList.toggle('d-none', !isEditing);
  };

  try {
    const res = await api.get('/applications', { params: { limit: 100, page: 1, sort: 'created_at:desc' } });
    const rows = res.data?.rows || [];
    const application = rows.find((a) => String(a.id) === String(id));
    if (!application) {
      showAlert('alert-box', 'Application not found', 'warning');
      return;
    }
    if (summary) {
      summary.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h5 mb-1">${application.prospect_name}</h1>
            <div class="small text-muted">${application.job_title || 'Job #' + application.job_id}</div>
          </div>
          <span class="badge text-bg-secondary">${application.status}</span>
        </div>
        <div class="small text-muted mt-2">Submitted ${application.submitted_at ? formatDate(application.submitted_at) : '—'} · Updated ${formatDate(application.updated_at || application.created_at)}</div>`;
    }
    setFormValues(application);
    toggleEdit(false);

    if (editBtn) editBtn.onclick = () => toggleEdit(true);
    if (cancelBtn) cancelBtn.onclick = () => {
      setFormValues(application);
      toggleEdit(false);
    };
    if (saveBtn) saveBtn.onclick = async () => {
      if (!form) return;
      try {
        const prospectId = requirePositiveInt(form.prospect_id.value, 'Prospect');
        const jobId = requirePositiveInt(form.job_id.value, 'Job');
        const payload = {
          prospect_id: prospectId,
          job_id: jobId,
          status: form.status.value,
          notes: form.notes.value || null,
          employer_response_at: form.employer_response_at.value || null,
        };
        await api.put(`/applications/${id}`, payload);
        showAlert('alert-box', 'Application updated.', 'success');
        toggleEdit(false);
        await loadApplicationDetails();
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || err.message || 'Failed to update application', 'danger');
      }
    };
    if (deleteBtn) deleteBtn.onclick = async () => {
      if (!confirm('Delete this application?')) return;
      try {
        await api.delete(`/applications/${id}`);
        showAlert('alert-box', 'Application deleted.', 'success');
        setTimeout(() => navigateTo('applications/list.html'), 800);
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to delete application', 'danger');
      }
    };
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Failed to load application', 'danger');
  }
}
