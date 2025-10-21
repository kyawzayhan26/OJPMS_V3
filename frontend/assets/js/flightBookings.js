function flightBookingCard(row) {
  return `
    <div class="card shadow-sm">
      <div class="card-body d-flex flex-column gap-2">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${escapeHtml(row.airline)}</div>
            <div class="small text-muted">Reference ${escapeHtml(row.booking_reference)}</div>
          </div>
          <span class="badge text-bg-secondary">${formatDate(row.flight_datetime)}</span>
        </div>
        <div class="small text-muted">Client: ${escapeHtml(row.client_name || `#${row.client_id}`)}</div>
        ${row.remarks ? `<div class="small">${escapeHtml(row.remarks)}</div>` : ''}
        <div class="d-flex justify-content-between align-items-center">
          <span class="small text-muted">Created ${formatDate(row.created_at)}</span>
          <a class="btn btn-sm btn-outline-primary" href="${resolveAppPath('flight-bookings/details.html?id=' + row.id)}">View</a>
        </div>
      </div>
    </div>
  `;
}

async function loadFlightBookings() {
  const container = document.getElementById('flight-bookings-list');
  if (!container) return;
  container.innerHTML = '<div class="text-muted">Loading flight bookings…</div>';
  try {
    const search = document.getElementById('search-input')?.value || '';
    const clientId = document.getElementById('client-filter')?.value || '';
    const from = document.getElementById('from-filter')?.value || '';
    const to = document.getElementById('to-filter')?.value || '';
    const sort = document.getElementById('sort-select')?.value || 'flight_datetime:desc';
    const params = { limit: 100, page: 1, sort };
    if (search) params.search = search;
    if (clientId) params.client_id = Number(clientId);
    if (from) params.from = new Date(from).toISOString();
    if (to) params.to = new Date(to).toISOString();

    const res = await api.get('/flight-bookings', { params });
    const rows = res.data?.rows || [];
    if (!rows.length) {
      container.innerHTML = '<div class="text-muted">No flight bookings found.</div>';
      return;
    }
    container.innerHTML = rows.map((row) => flightBookingCard(row)).join('');
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Failed to load flight bookings.</div>';
    showAlert('alert-box', err.response?.data?.message || 'Unable to fetch flight bookings', 'danger');
  }
}

function setupFlightBookingFilters() {
  ['search-input', 'client-filter', 'from-filter', 'to-filter', 'sort-select'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const event = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(event, () => loadFlightBookings());
  });
}

function initFlightBookingForm() {
  const form = document.getElementById('flight-booking-form');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    toggleFormDisabled(form, true);
    const data = formToJSON(form);
    try {
      const payload = {
        client_id: Number(data.client_id),
        airline: data.airline.trim(),
        flight_datetime: new Date(data.flight_datetime).toISOString(),
        booking_reference: data.booking_reference.trim(),
        remarks: data.remarks ? data.remarks.trim() || null : null,
      };
      await api.post('/flight-bookings', payload);
      form.reset();
      const modalEl = document.getElementById('flightBookingModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
      }
      showAlert('alert-box', 'Flight booking created.', 'success');
      await loadFlightBookings();
    } catch (err) {
      showAlert('form-alert', err.response?.data?.message || 'Failed to create flight booking', 'danger');
    } finally {
      toggleFormDisabled(form, false);
    }
  });
}

async function loadFlightBookingDetails() {
  const id = getParam('id');
  if (!id) {
    showAlert('alert-box', 'Missing flight booking id', 'danger');
    return;
  }
  const summary = document.getElementById('booking-summary');
  const form = document.getElementById('booking-detail-form');
  const editBtn = document.getElementById('edit-booking');
  const saveBtn = document.getElementById('save-booking');
  const cancelBtn = document.getElementById('cancel-edit');
  const deleteBtn = document.getElementById('delete-booking');

  const setValues = (row) => {
    if (!form) return;
    form.client_id.value = row.client_id || '';
    form.airline.value = row.airline || '';
    form.flight_datetime.value = toLocalInputValue(row.flight_datetime);
    form.booking_reference.value = row.booking_reference || '';
    form.remarks.value = row.remarks || '';
  };

  const toggleEdit = (editing) => {
    if (!form) return;
    Array.from(form.elements).forEach((el) => {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.disabled = !editing;
      }
    });
    if (editBtn) editBtn.classList.toggle('d-none', editing);
    if (saveBtn) saveBtn.classList.toggle('d-none', !editing);
    if (cancelBtn) cancelBtn.classList.toggle('d-none', !editing);
  };

  try {
    const res = await api.get(`/flight-bookings/${id}`);
    const row = res.data;
    if (summary) {
      summary.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h5 mb-1">${escapeHtml(row.airline)}</h1>
            <div class="small text-muted">Reference ${escapeHtml(row.booking_reference)}</div>
            <div class="small text-muted">Client ${escapeHtml(row.client_name || `#${row.client_id}`)}</div>
          </div>
          <span class="badge text-bg-secondary">${formatDate(row.flight_datetime)}</span>
        </div>
        <div class="small text-muted mt-2">Created ${formatDate(row.created_at)}${row.updated_at ? ` · Updated ${formatDate(row.updated_at)}` : ''}</div>`;
    }
    setValues(row);
    toggleEdit(false);

    if (editBtn) editBtn.onclick = () => toggleEdit(true);
    if (cancelBtn) cancelBtn.onclick = () => {
      setValues(row);
      toggleEdit(false);
    };
    if (saveBtn) saveBtn.onclick = async () => {
      if (!form) return;
      const clientIdVal = Number(form.client_id.value);
      if (!Number.isInteger(clientIdVal) || clientIdVal <= 0) {
        showAlert('alert-box', 'Client ID must be a positive number.', 'danger');
        return;
      }
      const airlineVal = (form.airline.value || '').trim();
      if (!airlineVal) {
        showAlert('alert-box', 'Airline is required.', 'danger');
        return;
      }
      if (!form.flight_datetime.value) {
        showAlert('alert-box', 'Flight date and time is required.', 'danger');
        return;
      }
      const bookingRefVal = (form.booking_reference.value || '').trim();
      if (!bookingRefVal) {
        showAlert('alert-box', 'Booking reference is required.', 'danger');
        return;
      }
      const payload = {
        client_id: clientIdVal,
        airline: airlineVal,
        flight_datetime: new Date(form.flight_datetime.value).toISOString(),
        booking_reference: bookingRefVal,
        remarks: form.remarks.value ? form.remarks.value.trim() || null : null,
      };
      try {
        await api.put(`/flight-bookings/${id}`, payload);
        showAlert('alert-box', 'Flight booking updated.', 'success');
        await loadFlightBookingDetails();
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to update flight booking', 'danger');
      }
    };
    if (deleteBtn) deleteBtn.onclick = async () => {
      if (!confirm('Delete this flight booking?')) return;
      try {
        await api.delete(`/flight-bookings/${id}`);
        showAlert('alert-box', 'Flight booking deleted.', 'success');
        setTimeout(() => navigateTo('flight-bookings/list.html'), 800);
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to delete flight booking', 'danger');
      }
    };
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Failed to load flight booking', 'danger');
  }
}

