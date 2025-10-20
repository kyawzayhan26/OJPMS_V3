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
        currency: data.currency.toUpperCase(),
        status: data.status,
        collected_by: data.collected_by || null,
        collected_at: data.collected_at || null,
        reference_no: data.reference_no || null,
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

  const setFormValues = (pmt) => {
    if (!form) return;
    form.client_id.value = pmt.client_id || '';
    form.amount.value = pmt.amount || '';
    form.currency.value = (pmt.currency || '').toUpperCase();
    form.status.value = PAYMENT_STATUSES.includes(pmt.status) ? pmt.status : 'Pending';
    form.collected_by.value = pmt.collected_by || '';
    form.collected_at.value = pmt.collected_at ? pmt.collected_at.substring(0, 16) : '';
    form.reference_no.value = pmt.reference_no || '';
  };

  try {
    const res = await api.get('/payments', { params: { limit: 100, page: 1, sort: 'created_at:desc' } });
    const rows = res.data?.rows || [];
    const payment = rows.find((p) => String(p.id) === String(id));
    if (!payment) {
      showAlert('alert-box', 'Payment not found', 'warning');
      return;
    }
    if (summary) {
      summary.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h5 mb-1">${payment.client_name || 'Client #' + payment.client_id}</h1>
            <div class="small text-muted">Reference: ${payment.reference_no || '—'}</div>
          </div>
          ${paymentStatusBadge(payment.status)}
        </div>
        <div class="small text-muted mt-2">Amount ${payment.amount} ${payment.currency} · Created ${formatDate(payment.created_at)}</div>`;
    }
    setFormValues(payment);
    if (form) {
      Array.from(form.elements).forEach((el) => {
        if (el.name) el.disabled = true;
      });
    }
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Failed to load payment', 'danger');
  }
}
