function jobStatusBadge(isActive) {
  return isActive ? '<span class="badge text-bg-success">Active</span>' : '<span class="badge text-bg-secondary">Inactive</span>';
}

async function loadJobsList() {
  const container = document.getElementById('jobs-list');
  if (!container) return;
  container.innerHTML = '<div class="text-muted">Loading jobs…</div>';
  try {
    const search = document.getElementById('search-input')?.value || '';
    const employerId = document.getElementById('employer-filter')?.value || '';
    const country = document.getElementById('country-filter')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    const sort = document.getElementById('sort-select')?.value || 'created_at:desc';
    const params = {
      search: search || undefined,
      employer_id: employerId || undefined,
      country: country || undefined,
      is_active: status === '' ? undefined : status === 'active',
      limit: 100,
      page: 1,
      sort,
    };
    const res = await api.get('/jobs', { params });
    const rows = res.data?.rows || [];
    container.innerHTML = rows
      .map(
        (job) => `
        <div class="card shadow-sm">
          <div class="card-body d-flex flex-column gap-2">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-semibold">${job.title}</div>
                <div class="small text-muted">${job.employer_name || 'Employer #' + job.employer_id}</div>
                <div class="small text-muted">${job.location_country || '—'}</div>
              </div>
              ${jobStatusBadge(job.is_active)}
            </div>
            <div class="small text-muted">Salary: ${job.salary ?? 'N/A'}</div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="small text-muted">Created ${formatDate(job.created_at)}</span>
              <a class="btn btn-sm btn-outline-primary" href="${resolveAppPath('jobs/details.html?id=' + job.id)}">View</a>
            </div>
          </div>
        </div>`
      )
      .join('');
    if (!rows.length) container.innerHTML = '<div class="text-muted">No jobs found.</div>';
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Failed to load jobs.</div>';
    showAlert('alert-box', err.response?.data?.message || 'Unable to fetch jobs', 'danger');
  }
}

function setupJobsFilters() {
  ['search-input', 'employer-filter', 'country-filter', 'status-filter', 'sort-select'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => loadJobsList();
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', handler);
  });
}

function initJobForm() {
  const form = document.getElementById('job-form');
  if (!form) return;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    toggleFormDisabled(form, true);
    const data = formToJSON(form);
    try {
      const payload = {
        employer_id: Number(data.employer_id),
        title: data.title,
        description: data.description || null,
        location_country: data.location_country,
        requirements: data.requirements || null,
        salary: data.salary || null,
        is_active: data.is_active === 'true',
      };
      await api.post('/jobs', payload);
      form.reset();
      const modalEl = document.getElementById('jobModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
      }
      showAlert('alert-box', 'Job created successfully.', 'success');
      await loadJobsList();
    } catch (err) {
      showAlert('form-alert', err.response?.data?.message || 'Failed to create job', 'danger');
    } finally {
      toggleFormDisabled(form, false);
    }
  });
}

async function loadJobDetails() {
  const id = getParam('id');
  if (!id) {
    showAlert('alert-box', 'Missing job id', 'danger');
    return;
  }
  const summary = document.getElementById('job-summary');
  const form = document.getElementById('job-detail-form');
  const deleteBtn = document.getElementById('delete-job');
  const editBtn = document.getElementById('edit-job');
  const saveBtn = document.getElementById('save-job');
  const cancelBtn = document.getElementById('cancel-edit');

  const setFormValues = (job) => {
    if (!form) return;
    form.employer_id.value = job.employer_id || '';
    form.title.value = job.title || '';
    form.location_country.value = job.location_country || '';
    form.salary.value = job.salary ?? '';
    form.is_active.value = job.is_active ? 'true' : 'false';
    form.description.value = job.description || '';
    form.requirements.value = job.requirements || '';
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
    const res = await api.get('/jobs', { params: { limit: 100, page: 1, sort: 'created_at:desc' } });
    const rows = res.data?.rows || [];
    const job = rows.find((j) => String(j.id) === String(id));
    if (!job) {
      showAlert('alert-box', 'Job not found', 'warning');
      return;
    }
    if (summary) {
      summary.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h5 mb-1">${job.title}</h1>
            <div class="small text-muted">${job.employer_name || 'Employer #' + job.employer_id}</div>
            <div class="small text-muted">${job.location_country || '—'}</div>
          </div>
          ${jobStatusBadge(job.is_active)}
        </div>
        <div class="small text-muted mt-2">Created ${formatDate(job.created_at)}${job.updated_at ? ` · Updated ${formatDate(job.updated_at)}` : ''}</div>`;
    }
    setFormValues(job);
    toggleEdit(false);

    if (editBtn) editBtn.onclick = () => toggleEdit(true);
    if (cancelBtn) cancelBtn.onclick = () => {
      setFormValues(job);
      toggleEdit(false);
    };
    if (saveBtn) saveBtn.onclick = async () => {
      if (!form) return;
      const payload = {
        employer_id: Number(form.employer_id.value),
        title: form.title.value,
        description: form.description.value || null,
        location_country: form.location_country.value,
        requirements: form.requirements.value || null,
        salary: form.salary.value || null,
        is_active: form.is_active.value === 'true',
      };
      try {
        await api.put(`/jobs/${id}`, payload);
        showAlert('alert-box', 'Job updated.', 'success');
        toggleEdit(false);
        await loadJobDetails();
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to update job', 'danger');
      }
    };
    if (deleteBtn) deleteBtn.onclick = async () => {
      if (!confirm('Delete this job?')) return;
      try {
        await api.delete(`/jobs/${id}`);
        showAlert('alert-box', 'Job deleted.', 'success');
        setTimeout(() => navigateTo('jobs/list.html'), 800);
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to delete job', 'danger');
      }
    };
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Failed to load job', 'danger');
  }
}
