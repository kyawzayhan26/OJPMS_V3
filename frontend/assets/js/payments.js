const PAYMENT_STATUSES = ['Pending', 'Paid', 'Waived', 'Refunded'];

function paymentStatusBadge(status) {
  const map = {
    Pending: 'warning',
    Paid: 'success',
    Waived: 'secondary',
    Refunded: 'info',
  };
  const cls = map[status] || 'secondary';
  return `<span class="badge text-bg-${cls}">${status}</span>`;
}

async function loadPaymentsList() {
  const container = document.getElementById('payments-list');
  if (!container) return;
  container.innerHTML = '<div class="text-muted">Loading payments…</div>';
  try {
    const search = document.getElementById('search-input')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    const clientId = document.getElementById('client-filter')?.value || '';
    const currency = document.getElementById('currency-filter')?.value || '';
    const sort = document.getElementById('sort-select')?.value || 'created_at:desc';
    const params = {
      search: search || undefined,
      status: status || undefined,
      client_id: clientId || undefined,
      currency: currency || undefined,
      limit: 100,
      page: 1,
      sort,
    };
    const res = await api.get('/payments', { params });
    const rows = res.data?.rows || [];
    container.innerHTML = rows
      .map(
        (pmt) => `
        <div class="card shadow-sm">
          <div class="card-body d-flex flex-column gap-2">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-semibold">${pmt.client_name || 'Client #' + pmt.client_id}</div>
                <div class="small text-muted">Reference: ${pmt.reference_no || '—'}</div>
                ${pmt.invoice_description ? `<div class="small text-muted">${escapeHtml(pmt.invoice_description)}</div>` : ''}
              </div>
              ${paymentStatusBadge(pmt.status)}
            </div>
            <div class="small text-muted">Amount: ${pmt.amount} ${pmt.currency}</div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="small text-muted">Collected ${pmt.collected_at ? formatDate(pmt.collected_at) : '—'}</span>
              <a class="btn btn-sm btn-outline-primary" href="${resolveAppPath('payments/details.html?id=' + pmt.id)}">View</a>
            </div>
          </div>
        </div>`
      )
      .join('');
    if (!rows.length) container.innerHTML = '<div class="text-muted">No payments found.</div>';
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Failed to load payments.</div>';
    showAlert('alert-box', err.response?.data?.message || 'Unable to fetch payments', 'danger');
  }
}

function setupPaymentFilters() {
  ['search-input', 'status-filter', 'client-filter', 'currency-filter', 'sort-select'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => loadPaymentsList();
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', handler);
  });
}

function initPaymentForm() {
  const form = document.getElementById('payment-form');
  if (!form) return;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    toggleFormDisabled(form, true);
    const data = formToJSON(form);
    try {
      const payload = {
        client_id: Number(data.client_id),
        amount: Number(data.amount),
        currency: (data.currency || '').toUpperCase(),
        status: data.status,
        reference_no: data.reference_no ? data.reference_no.trim() || null : null,
        invoice_description: data.invoice_description ? data.invoice_description.trim() || null : null,
      };
      await api.post('/payments', payload);
      form.reset();
      const modalEl = document.getElementById('paymentModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
      }
      showAlert('alert-box', 'Payment recorded.', 'success');
      await loadPaymentsList();
    } catch (err) {
      showAlert('form-alert', err.response?.data?.message || 'Failed to record payment', 'danger');
    } finally {
      toggleFormDisabled(form, false);
    }
  });
}

async function loadPaymentDetails() {
  const id = getParam('id');
  if (!id) {
    showAlert('alert-box', 'Missing payment id', 'danger');
    return;
  }
  const summary = document.getElementById('payment-summary');
  const form = document.getElementById('payment-detail-form');
  const editBtn = document.getElementById('edit-payment');
  const saveBtn = document.getElementById('save-payment');
  const cancelBtn = document.getElementById('cancel-edit');

  const setFormValues = (pmt) => {
    if (!form) return;
    form.client_id.value = pmt.client_id || '';
    form.amount.value = pmt.amount || '';
    form.currency.value = (pmt.currency || '').toUpperCase();
    form.status.value = PAYMENT_STATUSES.includes(pmt.status) ? pmt.status : 'Pending';
    form.reference_no.value = pmt.reference_no || '';
    form.invoice_description.value = pmt.invoice_description || '';
  };

  const toggleEdit = (editing) => {
    if (!form) return;
    Array.from(form.elements).forEach((el) => {
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        el.disabled = !editing;
      }
    });
    if (editBtn) editBtn.classList.toggle('d-none', editing);
    if (saveBtn) saveBtn.classList.toggle('d-none', !editing);
    if (cancelBtn) cancelBtn.classList.toggle('d-none', !editing);
  };

  try {
    const res = await api.get(`/payments/${id}`);
    const payment = res.data;
    if (summary) {
      summary.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h5 mb-1">${escapeHtml(payment.client_name || `Client #${payment.client_id}`)}</h1>
            <div class="small text-muted">Reference: ${escapeHtml(payment.reference_no || '—')}</div>
            ${payment.invoice_description ? `<div class="small text-muted">${escapeHtml(payment.invoice_description)}</div>` : ''}
          </div>
          ${paymentStatusBadge(payment.status)}
        </div>
        <div class="small text-muted mt-2">Created ${formatDate(payment.created_at)}${payment.updated_at ? ` · Updated ${formatDate(payment.updated_at)}` : ''}</div>`;
    }
    setFormValues(payment);
    toggleEdit(false);

    if (editBtn) {
      editBtn.onclick = () => toggleEdit(true);
    }
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        setFormValues(payment);
        toggleEdit(false);
      };
    }
    if (saveBtn) {
      saveBtn.onclick = async () => {
        if (!form) return;
        const clientIdVal = Number(form.client_id.value);
        if (!Number.isInteger(clientIdVal) || clientIdVal <= 0) {
          showAlert('alert-box', 'Client ID must be a positive number.', 'danger');
          return;
        }
        const amountVal = Number(form.amount.value);
        if (!Number.isFinite(amountVal) || amountVal <= 0) {
          showAlert('alert-box', 'Amount must be greater than zero.', 'danger');
          return;
        }
        const currencyVal = (form.currency.value || '').trim().toUpperCase();
        if (!currencyVal) {
          showAlert('alert-box', 'Currency is required.', 'danger');
          return;
        }
        const payload = {
          client_id: clientIdVal,
          amount: Number(amountVal.toFixed(2)),
          currency: currencyVal,
          status: form.status.value || 'Pending',
          reference_no: form.reference_no.value ? form.reference_no.value.trim() || null : null,
          invoice_description: form.invoice_description.value ? form.invoice_description.value.trim() || null : null,
        };
        try {
          await api.put(`/payments/${id}`, payload);
          showAlert('alert-box', 'Payment updated.', 'success');
          await loadPaymentDetails();
        } catch (err) {
          showAlert('alert-box', err.response?.data?.message || 'Failed to update payment', 'danger');
        }
      };
    }
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Failed to load payment', 'danger');
  }
}
