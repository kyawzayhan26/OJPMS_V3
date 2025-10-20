const PROSPECT_STATUSES = [
  'enquiry',
  'job_matched',
  'jobmatch_approved',
  'application_drafted',
  'application_submitted',
  'interview_scheduled',
  'interview_passed',
];

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
    const sort = document.getElementById('sort-select')?.value || 'created_at DESC';
    const limit = +(document.getElementById('limit-select')?.value || 50);
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
      const payload = {
        full_name: data.full_name,
        dob: data.dob || null,
        passport_no: data.passport_no || null,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone,
        address: data.address || null,
        highest_qualification: data.highest_qualification || null,
        status: data.status || 'enquiry',
        interested_job_id: data.interested_job_id ? Number(data.interested_job_id) : null,
        remarks1: data.remarks1 || null,
        remarks2: data.remarks2 || null,
      };
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
      showAlert('form-alert', err.response?.data?.message || 'Failed to create prospect', 'danger');
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
  try {
    const res = await api.get('/prospects', { params: { limit: 200, page: 1, sort: 'created_at DESC' } });
    const rows = res.data?.rows || [];
    const buckets = Object.fromEntries(PROSPECT_STATUSES.map((s) => [s, []]));
    rows.forEach((p) => {
      const status = PROSPECT_STATUSES.includes(p.status) ? p.status : 'enquiry';
      buckets[status].push(p);
    });
    PROSPECT_STATUSES.forEach((status) => {
      const col = document.getElementById(`col-${status}`);
      if (!col) return;
      const cards = buckets[status]
        .map(
          (p) => `
          <div class="kanban-card mb-2" data-id="${p.id}">
            <div class="fw-semibold">${p.full_name}</div>
            <div class="small text-muted">${p.contact_phone || ''}${p.contact_phone && p.contact_email ? ' · ' : ''}${p.contact_email || ''}</div>
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
          const id = evt.item.getAttribute('data-id');
          const toStatus = evt.to.getAttribute('data-status');
          if (!id || !toStatus) return;
          // Placeholder for future endpoint GET /prospects/:status and status update persistence
          // TODO: call PATCH /prospects/${id}/status when backend is available
          evt.item.setAttribute('data-status', toStatus);
        },
      });
    });
  } catch (err) {
    PROSPECT_STATUSES.forEach((status) => {
      const col = document.getElementById(`col-${status}`);
      if (col) col.innerHTML = '<div class="text-danger">Failed to load.</div>';
    });
  }
  initProspectCreateForm();
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
    const res = await api.get('/prospects', { params: { limit: 200, page: 1 } });
    const rows = res.data?.rows || [];
    const prospect = rows.find((p) => String(p.id) === String(id));
    if (!prospect) {
      showAlert('alert-box', 'Prospect not found', 'warning');
      return;
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

    const jobsList = document.getElementById('prospect-jobs');
    if (jobsList) {
      try {
        const jobsRes = await api.get('/jobs', { params: { limit: 200 } });
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
        const appsRes = await api.get('/applications', { params: { limit: 200 } });
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
        const ivRes = await api.get('/interviews', { params: { limit: 200 } });
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
      const payload = {
        full_name: form.full_name.value,
        dob: form.dob.value || null,
        passport_no: form.passport_no.value || null,
        contact_email: form.contact_email.value || null,
        contact_phone: form.contact_phone.value || null,
        address: form.address.value || null,
        highest_qualification: form.highest_qualification.value || null,
        status: form.status.value,
        interested_job_id: form.interested_job_id.value ? Number(form.interested_job_id.value) : null,
        remarks1: form.remarks1.value || null,
        remarks2: form.remarks2.value || null,
      };
      try {
        await api.put(`/prospects/${id}`, payload);
        showAlert('alert-box', 'Prospect updated successfully.', 'success');
        toggleEdit(false);
        await loadProspectDetails();
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to update prospect', 'danger');
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
