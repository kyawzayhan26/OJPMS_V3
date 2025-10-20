const CLIENT_STATUSES = [
  'SmartCard_InProgress',
  'Visa_InProgress',
  'Payment_Pending',
  'FlightBooking_Pending',
  'Accommodation_Pending',
  'Approved_For_Deployment',
  'Departed',
];

function clientStatusLabel(status) {
  return (status || '').replace(/_/g, ' ');
}

async function loadClientsList() {
  const container = document.getElementById('clients-list');
  if (!container) return;
  container.innerHTML = '<div class="text-muted">Loading clients…</div>';
  try {
    const search = document.getElementById('search-input')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    const prospect = document.getElementById('prospect-filter')?.value || '';
    const sort = document.getElementById('sort-select')?.value || 'created_at DESC';
    const params = {
      search: search || undefined,
      status: status || undefined,
      prospect_id: prospect || undefined,
      limit: 100,
      page: 1,
      sort,
    };
    const res = await api.get('/clients', { params });
    const rows = res.data?.rows || [];
    container.innerHTML = rows
      .map(
        (client) => `
        <div class="card shadow-sm">
          <div class="card-body d-flex flex-column gap-2">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-semibold">${client.full_name}</div>
                <div class="small text-muted">Passport: ${client.passport_no || '—'}</div>
              </div>
              <span class="badge text-bg-secondary">${clientStatusLabel(client.status)}</span>
            </div>
            <div class="small text-muted">Prospect ID: ${client.prospect_id}</div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="small text-muted">Created ${formatDate(client.created_at)}</span>
              <a class="btn btn-sm btn-outline-primary" href="${resolveAppPath('clients/details.html?id=' + client.id)}">View</a>
            </div>
          </div>
        </div>`
      )
      .join('');
    if (!rows.length) container.innerHTML = '<div class="text-muted">No clients found.</div>';
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Failed to load clients.</div>';
    showAlert('alert-box', err.response?.data?.message || 'Unable to fetch clients', 'danger');
  }
}

function setupClientFilters() {
  ['search-input', 'status-filter', 'prospect-filter', 'sort-select'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => loadClientsList();
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', handler);
  });
}

function initClientForm() {
  const form = document.getElementById('client-form');
  if (!form) return;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    toggleFormDisabled(form, true);
    const data = formToJSON(form);
    try {
      const payload = {
        prospect_id: Number(data.prospect_id),
        full_name: data.full_name,
        passport_no: data.passport_no || null,
        status: data.status,
        remarks1: data.remarks1 || null,
      };
      await api.post('/clients', payload);
      form.reset();
      const modalEl = document.getElementById('clientModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
      }
      showAlert('alert-box', 'Client created.', 'success');
      await loadClientsList();
    } catch (err) {
      showAlert('form-alert', err.response?.data?.message || 'Failed to create client', 'danger');
    } finally {
      toggleFormDisabled(form, false);
    }
  });
}

async function loadClientsKanban() {
  const container = document.getElementById('clients-board');
  if (!container) return;
  container.innerHTML = CLIENT_STATUSES
    .map(
      (status) => `
      <div class="d-flex flex-column" style="min-width: 260px;">
        <h6 class="text-uppercase small fw-semibold mb-2">${clientStatusLabel(status)}</h6>
        <div class="kanban-col" data-status="${status}" id="c-${status}">
          <div class="text-muted">Loading…</div>
        </div>
      </div>`
    )
    .join('');
  try {
    const res = await api.get('/clients', { params: { limit: 200, page: 1 } });
    const rows = res.data?.rows || [];
    const buckets = Object.fromEntries(CLIENT_STATUSES.map((s) => [s, []]));
    rows.forEach((client) => {
      const status = CLIENT_STATUSES.includes(client.status) ? client.status : CLIENT_STATUSES[0];
      buckets[status].push(client);
    });
    CLIENT_STATUSES.forEach((status) => {
      const col = document.getElementById(`c-${status}`);
      if (!col) return;
      const cards = buckets[status]
        .map(
          (client) => `
          <div class="kanban-card mb-2" data-id="${client.id}">
            <div class="fw-semibold">${client.full_name}</div>
            <div class="small text-muted">Passport: ${client.passport_no || '—'}</div>
            <div class="small text-muted">${formatDate(client.created_at)}</div>
            <div class="mt-2 d-flex gap-2">
              <a class="btn btn-sm btn-outline-primary" href="${resolveAppPath('clients/details.html?id=' + client.id)}">View</a>
            </div>
          </div>`
        )
        .join('');
      col.innerHTML = cards || '<div class="text-muted">Empty</div>';
      new Sortable(col, {
        group: 'clients',
        animation: 150,
        onEnd: async (evt) => {
          const id = evt.item.getAttribute('data-id');
          const toStatus = evt.to.getAttribute('data-status');
          if (!id || !toStatus) return;
          try {
            await api.patch(`/clients/${id}/status`, { to_status: toStatus });
            showAlert('alert-box', `Client status updated to ${clientStatusLabel(toStatus)}.`, 'success');
          } catch (err) {
            showAlert('alert-box', err.response?.data?.message || 'Failed to update status', 'danger');
            evt.from.appendChild(evt.item);
          }
        },
      });
    });
  } catch (err) {
    CLIENT_STATUSES.forEach((status) => {
      const col = document.getElementById(`c-${status}`);
      if (col) col.innerHTML = '<div class="text-danger">Failed to load.</div>';
    });
  }
}

async function loadClientDetails() {
  const id = getParam('id');
  if (!id) {
    showAlert('alert-box', 'Missing client id', 'danger');
    return;
  }
  const summary = document.getElementById('client-summary');
  const form = document.getElementById('client-detail-form');
  const editBtn = document.getElementById('edit-client');
  const saveBtn = document.getElementById('save-client');
  const cancelBtn = document.getElementById('cancel-edit');
  const deleteBtn = document.getElementById('delete-client');

  const setFormValues = (client) => {
    if (!form) return;
    form.prospect_id.value = client.prospect_id || '';
    form.full_name.value = client.full_name || '';
    form.passport_no.value = client.passport_no || '';
    form.status.value = CLIENT_STATUSES.includes(client.status) ? client.status : CLIENT_STATUSES[0];
    form.remarks1.value = client.remarks1 || '';
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
    const res = await api.get('/clients', { params: { limit: 200, page: 1 } });
    const rows = res.data?.rows || [];
    const client = rows.find((c) => String(c.id) === String(id));
    if (!client) {
      showAlert('alert-box', 'Client not found', 'warning');
      return;
    }
    if (summary) {
      summary.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h5 mb-1">${client.full_name}</h1>
            <div class="small text-muted">Passport: ${client.passport_no || '—'}</div>
            <div class="small text-muted">Prospect ID: ${client.prospect_id}</div>
          </div>
          <span class="badge text-bg-secondary">${clientStatusLabel(client.status)}</span>
        </div>
        <div class="small text-muted mt-2">Created ${formatDate(client.created_at)}${client.updated_at ? ` · Updated ${formatDate(client.updated_at)}` : ''}</div>`;
    }
    setFormValues(client);
    toggleEdit(false);

    if (editBtn) editBtn.onclick = () => toggleEdit(true);
    if (cancelBtn) cancelBtn.onclick = () => {
      setFormValues(client);
      toggleEdit(false);
    };
    if (saveBtn) saveBtn.onclick = async () => {
      if (!form) return;
      const payload = {
        prospect_id: Number(form.prospect_id.value),
        full_name: form.full_name.value,
        passport_no: form.passport_no.value || null,
        status: form.status.value,
        remarks1: form.remarks1.value || null,
      };
      try {
        await api.put(`/clients/${id}`, payload);
        showAlert('alert-box', 'Client updated.', 'success');
        toggleEdit(false);
        await loadClientDetails();
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to update client', 'danger');
      }
    };
    if (deleteBtn) deleteBtn.onclick = async () => {
      if (!confirm('Delete this client?')) return;
      try {
        await api.delete(`/clients/${id}`);
        showAlert('alert-box', 'Client deleted.', 'success');
        setTimeout(() => navigateTo('clients/list.html'), 800);
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to delete client', 'danger');
      }
    };
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Failed to load client', 'danger');
  }
}
