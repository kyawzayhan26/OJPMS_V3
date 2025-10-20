function employerCard(employer) {
  return `
    <div class="card shadow-sm">
      <div class="card-body d-flex flex-column gap-2">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${employer.name}</div>
            <div class="small text-muted">${employer.country || '—'}</div>
            <div class="small text-muted">${employer.contact_name || ''}</div>
          </div>
          <span class="badge text-bg-light">${employer.contact_phone || ''}</span>
        </div>
        <div class="small text-muted">${employer.contact_email || 'No email provided'}</div>
        <div class="d-flex justify-content-between align-items-center">
          <span class="small text-muted">Created ${formatDate(employer.created_at)}</span>
          <a class="btn btn-sm btn-outline-primary" href="${resolveAppPath('employers/details.html?id=' + employer.id)}">View</a>
        </div>
      </div>
    </div>`;
}

async function loadEmployersList() {
  const container = document.getElementById('employers-list');
  const alertBox = document.getElementById('alert-box');
  if (!container) return;
  container.innerHTML = '<div class="text-muted">Loading employers…</div>';
  try {
    const search = document.getElementById('search-input')?.value || '';
    const country = document.getElementById('country-filter')?.value || '';
    const sort = document.getElementById('sort-select')?.value || 'created_at DESC';
    const res = await api.get('/employers', {
      params: {
        search: search || undefined,
        country: country || undefined,
        limit: 100,
        page: 1,
        sort,
      },
    });
    const rows = res.data?.rows || [];
    container.innerHTML = rows.map((employer) => employerCard(employer)).join('');
    if (!rows.length) container.innerHTML = '<div class="text-muted">No employers found.</div>';
    if (alertBox) alertBox.innerHTML = '';
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Failed to load employers.</div>';
    showAlert('alert-box', err.response?.data?.message || 'Unable to fetch employers', 'danger');
  }
}

function setupEmployerFilters() {
  ['search-input', 'country-filter', 'sort-select'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => loadEmployersList();
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', handler);
  });
}

function initEmployerCreateForm() {
  const form = document.getElementById('employer-form');
  if (!form) return;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    toggleFormDisabled(form, true);
    const data = formToJSON(form);
    try {
      const payload = {
        name: data.name,
        country: data.country,
        contact_name: data.contact_name || null,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        address: data.address || null,
      };
      await api.post('/employers', payload);
      form.reset();
      const modalEl = document.getElementById('employerModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
      }
      showAlert('alert-box', 'Employer created successfully.', 'success');
      await loadEmployersList();
    } catch (err) {
      showAlert('form-alert', err.response?.data?.message || 'Failed to create employer', 'danger');
    } finally {
      toggleFormDisabled(form, false);
    }
  });
}

async function loadEmployerDetails() {
  const id = getParam('id');
  if (!id) {
    showAlert('alert-box', 'Missing employer id', 'danger');
    return;
  }
  const detailCard = document.getElementById('employer-summary');
  const form = document.getElementById('employer-detail-form');
  const deleteBtn = document.getElementById('delete-employer');
  const editBtn = document.getElementById('edit-employer');
  const saveBtn = document.getElementById('save-employer');
  const cancelBtn = document.getElementById('cancel-edit');

  const setFormValues = (data) => {
    if (!form) return;
    form.name.value = data.name || '';
    form.country.value = data.country || '';
    form.contact_name.value = data.contact_name || '';
    form.contact_email.value = data.contact_email || '';
    form.contact_phone.value = data.contact_phone || '';
    form.address.value = data.address || '';
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
    const res = await api.get('/employers', { params: { limit: 200, page: 1 } });
    const rows = res.data?.rows || [];
    const employer = rows.find((e) => String(e.id) === String(id));
    if (!employer) {
      showAlert('alert-box', 'Employer not found', 'warning');
      return;
    }
    if (detailCard) {
      detailCard.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h5 mb-1">${employer.name}</h1>
            <div class="small text-muted">${employer.country || '—'}</div>
            <div class="small text-muted">${employer.contact_name || ''}</div>
          </div>
          <span class="badge text-bg-secondary">${employer.contact_phone || ''}</span>
        </div>
        <div class="small text-muted mt-2">Created ${formatDate(employer.created_at)}${employer.updated_at ? ` · Updated ${formatDate(employer.updated_at)}` : ''}</div>`;
    }
    setFormValues(employer);
    toggleEdit(false);

    if (editBtn) editBtn.onclick = () => toggleEdit(true);
    if (cancelBtn) cancelBtn.onclick = () => {
      setFormValues(employer);
      toggleEdit(false);
    };
    if (saveBtn) saveBtn.onclick = async () => {
      if (!form) return;
      const payload = {
        name: form.name.value,
        country: form.country.value,
        contact_name: form.contact_name.value || null,
        contact_email: form.contact_email.value || null,
        contact_phone: form.contact_phone.value || null,
        address: form.address.value || null,
      };
      try {
        await api.put(`/employers/${id}`, payload);
        showAlert('alert-box', 'Employer updated.', 'success');
        toggleEdit(false);
        await loadEmployerDetails();
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to update employer', 'danger');
      }
    };
    if (deleteBtn) deleteBtn.onclick = async () => {
      if (!confirm('Delete this employer?')) return;
      try {
        await api.delete(`/employers/${id}`);
        showAlert('alert-box', 'Employer deleted.', 'success');
        setTimeout(() => navigateTo('employers/list.html'), 800);
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to delete employer', 'danger');
      }
    };
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Failed to load employer', 'danger');
  }
}
