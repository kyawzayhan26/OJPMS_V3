const CLIENT_STATUSES = [
  'Newly_Promoted',
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

const clientCache = new Map();

function modalPromise(modalId, formId, alertId, onValidate) {
  const modalEl = document.getElementById(modalId);
  const form = document.getElementById(formId);
  if (!modalEl || !form) return Promise.resolve(null);
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const alertBox = alertId ? document.getElementById(alertId) : null;

  return new Promise((resolve) => {
    const cleanup = () => {
      form.removeEventListener('submit', onSubmit);
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
    };

    const onHidden = () => {
      cleanup();
      resolve(null);
    };

    const onSubmit = (ev) => {
      ev.preventDefault();
      if (alertBox) alertBox.innerHTML = '';
      const data = formToJSON(form);
      const result = onValidate ? onValidate(data, alertBox) : data;
      if (!result) {
        return;
      }
      cleanup();
      modal.hide();
      resolve(result);
    };

    if (alertBox) alertBox.innerHTML = '';
    form.reset();
    modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
    form.addEventListener('submit', onSubmit);
    modal.show();
  });
}

function promptSmartcardProcess() {
  return modalPromise('smartcardProcessModal', 'smartcard-process-form', 'smartcard-process-alert', (data, alertBox) => {
    const id = Number(data.application_id);
    if (!Number.isInteger(id) || id <= 0) {
      showAlert('smartcard-process-alert', 'Please provide a valid application ID.', 'danger');
      return null;
    }
    return { application_id: id, remarks: data.remarks ? data.remarks.trim() || null : null };
  });
}

function promptVisaProcess() {
  return modalPromise('visaProcessModal', 'visa-process-form', 'visa-process-alert', (data) => {
    const id = Number(data.application_id);
    if (!Number.isInteger(id) || id <= 0) {
      showAlert('visa-process-alert', 'Please provide a valid application ID.', 'danger');
      return null;
    }
    return {
      application_id: id,
      visa_type: data.visa_type ? data.visa_type.trim() || null : null,
      remarks: data.remarks ? data.remarks.trim() || null : null,
    };
  });
}

function promptClientPayment() {
  return modalPromise('clientPaymentModal', 'client-payment-form', 'client-payment-alert', (data) => {
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showAlert('client-payment-alert', 'Please enter a valid amount.', 'danger');
      return null;
    }
    const currency = (data.currency || '').trim().toUpperCase();
    if (!currency || currency.length !== 3) {
      showAlert('client-payment-alert', 'Currency must be a 3-letter code.', 'danger');
      return null;
    }
    const reference_no = (data.reference_no || '').trim();
    if (!reference_no) {
      showAlert('client-payment-alert', 'Reference number is required.', 'danger');
      return null;
    }
    return {
      amount,
      currency,
      reference_no,
      invoice_description: data.invoice_description ? data.invoice_description.trim() || null : null,
    };
  });
}

function promptFlightBooking() {
  return modalPromise('flightBookingModal', 'flight-booking-form', 'flight-booking-alert', (data) => {
    const airline = (data.airline || '').trim();
    const booking_reference = (data.booking_reference || '').trim();
    if (!airline) {
      showAlert('flight-booking-alert', 'Airline is required.', 'danger');
      return null;
    }
    if (!booking_reference) {
      showAlert('flight-booking-alert', 'Booking reference is required.', 'danger');
      return null;
    }
    if (!data.flight_datetime) {
      showAlert('flight-booking-alert', 'Flight date and time is required.', 'danger');
      return null;
    }
    return {
      airline,
      booking_reference,
      flight_datetime: data.flight_datetime,
      remarks: data.remarks ? data.remarks.trim() || null : null,
    };
  });
}

function promptAccommodation() {
  return modalPromise('accommodationModal', 'accommodation-form', 'accommodation-alert', (data) => {
    const type = (data.type || '').trim();
    const details = (data.details || '').trim();
    if (!type || !details) {
      showAlert('accommodation-alert', 'Accommodation type and details are required.', 'danger');
      return null;
    }
    return { type, details };
  });
}

async function loadClientsList() {
  const container = document.getElementById('clients-list');
  if (!container) return;
  container.innerHTML = '<div class="text-muted">Loading clients…</div>';
  try {
    const search = document.getElementById('search-input')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    const prospect = document.getElementById('prospect-filter')?.value || '';
    const sort = document.getElementById('sort-select')?.value || 'created_at:desc';
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
    const res = await api.get('/clients', { params: { limit: 100, page: 1, sort: 'created_at:desc' } });
    const rows = res.data?.rows || [];
    const buckets = Object.fromEntries(CLIENT_STATUSES.map((s) => [s, []]));
    clientCache.clear();
    rows.forEach((client) => {
      const status = CLIENT_STATUSES.includes(client.status) ? client.status : CLIENT_STATUSES[0];
      buckets[status].push(client);
      const keyStr = String(client.id);
      clientCache.set(keyStr, client);
      const keyNum = Number(keyStr);
      if (!Number.isNaN(keyNum)) {
        clientCache.set(keyNum, client);
      }
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
          const idAttr = evt.item.getAttribute('data-id');
          const idNum = Number(idAttr);
          const toStatus = evt.to.getAttribute('data-status');
          const fromStatus = evt.from.getAttribute('data-status');
          if (!idAttr || !toStatus || toStatus === fromStatus) return;
          if (Number.isNaN(idNum)) {
            revert();
            showAlert('alert-box', 'Client identifier is invalid.', 'danger');
            return;
          }

          const revert = () => {
            const reference = evt.from.children[evt.oldIndex] || null;
            evt.from.insertBefore(evt.item, reference);
          };

          const client = clientCache.get(idAttr) || clientCache.get(idNum);
          if (!client) {
            revert();
            showAlert('alert-box', 'Client data unavailable. Please refresh.', 'danger');
            return;
          }

          const fromIndex = CLIENT_STATUSES.indexOf(fromStatus);
          const toIndex = CLIENT_STATUSES.indexOf(toStatus);
          if (fromIndex === -1 || toIndex === -1) {
            revert();
            showAlert('alert-box', 'Unsupported status change.', 'danger');
            return;
          }
          if (toIndex <= fromIndex) {
            revert();
            showAlert('alert-box', 'Clients can only move forward in the pipeline.', 'warning');
            return;
          }
          if (toIndex - fromIndex > 1) {
            revert();
            showAlert('alert-box', 'Please progress one stage at a time.', 'warning');
            return;
          }

          const transitionKey = `${fromStatus}->${toStatus}`;
          const payload = { to_status: toStatus };
          let successMessage = `Client moved to ${clientStatusLabel(toStatus)}.`;

          try {
            switch (transitionKey) {
              case 'Newly_Promoted->SmartCard_InProgress': {
                const data = await promptSmartcardProcess();
                if (!data) {
                  revert();
                  return;
                }
                payload.smartcard = data;
                successMessage = 'SmartCard process started.';
                break;
              }
              case 'SmartCard_InProgress->Visa_InProgress': {
                const data = await promptVisaProcess();
                if (!data) {
                  revert();
                  return;
                }
                payload.visa = data;
                successMessage = 'Visa process started.';
                break;
              }
              case 'Visa_InProgress->Payment_Pending': {
                const data = await promptClientPayment();
                if (!data) {
                  revert();
                  return;
                }
                payload.payment = data;
                successMessage = 'Payment recorded.';
                break;
              }
              case 'Payment_Pending->FlightBooking_Pending': {
                const data = await promptFlightBooking();
                if (!data) {
                  revert();
                  return;
                }
                payload.flight = data;
                successMessage = 'Flight booking saved.';
                break;
              }
              case 'FlightBooking_Pending->Accommodation_Pending': {
                const data = await promptAccommodation();
                if (!data) {
                  revert();
                  return;
                }
                payload.accommodation = data;
                successMessage = 'Accommodation recorded.';
                break;
              }
              case 'Accommodation_Pending->Approved_For_Deployment': {
                if ((getUserRole() || '').toLowerCase() !== 'admin') {
                  revert();
                  showAlert('alert-box', 'Only administrators can approve deployment.', 'danger');
                  return;
                }
                const confirmed = await promptKeywordConfirm({
                  title: 'Approve for deployment',
                  messageHtml: 'Type <strong>confirm</strong> to approve this client for deployment.',
                  keyword: 'confirm',
                  confirmLabel: 'Approve',
                });
                if (!confirmed) {
                  revert();
                  return;
                }
                successMessage = 'Client approved for deployment.';
                break;
              }
              case 'Approved_For_Deployment->Departed': {
                const confirmed = await promptKeywordConfirm({
                  title: 'Mark as departed',
                  messageHtml: 'Type <strong>confirm</strong> to mark this client as departed.',
                  keyword: 'confirm',
                  confirmLabel: 'Confirm',
                });
                if (!confirmed) {
                  revert();
                  return;
                }
                successMessage = 'Client marked as departed.';
                break;
              }
              default: {
                revert();
                showAlert('alert-box', 'This transition is not supported yet.', 'danger');
                return;
              }
            }

            await api.patch(`/clients/${idNum}/status`, payload);
            showAlert('alert-box', successMessage, 'success');
            await loadClientsKanban();
            return;
          } catch (err) {
            revert();
            showAlert('alert-box', err.response?.data?.message || 'Failed to update status', 'danger');
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
    const res = await api.get(`/clients/${id}`);
    const client = res.data;
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
