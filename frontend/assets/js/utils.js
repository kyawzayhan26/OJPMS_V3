const FRONTEND_ROOT_SEGMENT = '/frontend/';

const APP_BASE_PATH = (() => {
  try {
    const { pathname } = window.location;
    const markerIndex = pathname.indexOf(FRONTEND_ROOT_SEGMENT);
    if (markerIndex !== -1) {
      return pathname.slice(0, markerIndex + FRONTEND_ROOT_SEGMENT.length - 1);
    }
    if (pathname.endsWith('/frontend')) {
      return pathname.slice(0, pathname.lastIndexOf('/frontend') + '/frontend'.length);
    }
  } catch (err) {
    // ignore errors when window is unavailable (e.g. SSR tests)
  }
  return '';
})();

function resolveAppPath(path = '') {
  const clean = String(path || '').replace(/^\/+/, '');
  if (!clean) {
    return APP_BASE_PATH || '/';
  }
  let base = APP_BASE_PATH || '';
  while (base.endsWith('/')) base = base.slice(0, -1);
  let suffix = clean;
  while (suffix.startsWith('/')) suffix = suffix.slice(1);
  if (!base) {
    return `/${suffix}`;
  }
  return `${base}/${suffix}`;
}

function navigateTo(path) {
  window.location.href = resolveAppPath(path);
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem('ojpms_user');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function getUserRole() {
  return getStoredUser()?.role || null;
}

function renderNavbar() {
  const user = getStoredUser();
  const path = window.location.pathname;
  const links = [
    {
      path: 'employers/list.html',
      label: 'Employers',
      match: (p) => p.includes('/employers/'),
    },
    {
      path: 'jobs/list.html',
      label: 'Jobs',
      match: (p) => p.includes('/jobs/'),
    },
    {
      path: 'prospects/kanban.html',
      label: 'Prospects Board',
      match: (p) => p.endsWith('/prospects/kanban.html'),
    },
    {
      path: 'prospects/list.html',
      label: 'Prospects',
      match: (p) => p.includes('/prospects/') && !p.endsWith('/prospects/kanban.html'),
    },
    {
      path: 'prospect-job-matches/list.html',
      label: 'Job Matches',
      match: (p) => p.includes('/prospect-job-matches/'),
    },
    {
      path: 'documents/list.html',
      label: 'Documents',
      match: (p) => p.includes('/documents/'),
    },
    {
      path: 'applications/list.html',
      label: 'Applications',
      match: (p) => p.includes('/applications/'),
    },
    {
      path: 'interviews/list.html',
      label: 'Interviews',
      match: (p) => p.includes('/interviews/'),
    },
    {
      path: 'clients/kanban.html',
      label: 'Clients Board',
      match: (p) => p.endsWith('/clients/kanban.html'),
    },
    {
      path: 'clients/list.html',
      label: 'Clients',
      match: (p) => p.includes('/clients/') && !p.endsWith('/clients/kanban.html'),
    },
    {
      path: 'smartcard-applications/list.html',
      label: 'SmartCard',
      match: (p) => p.includes('/smartcard-applications/'),
    },
    {
      path: 'visa-applications/list.html',
      label: 'Visa Applications',
      match: (p) => p.includes('/visa-applications/'),
    },
    {
      path: 'payments/list.html',
      label: 'Payments',
      match: (p) => p.includes('/payments/'),
    },
    {
      path: 'flight-bookings/list.html',
      label: 'Flight Bookings',
      match: (p) => p.includes('/flight-bookings/'),
    },
  ];
  const navLinks = links
    .map((link) => {
      const href = resolveAppPath(link.path);
      const isActive = typeof link.match === 'function' ? link.match(path) : path === href;
      const aria = isActive ? ' aria-current="page"' : '';
      return `<li class="nav-item"><a class="nav-link${isActive ? ' active' : ''}"${aria} href="${href}">${link.label}</a></li>`;
    })
    .join('');
  const nav = `
  <nav class="navbar navbar-expand-lg bg-body-tertiary">
    <div class="container-fluid">
      <a class="navbar-brand" href="${resolveAppPath('prospects/list.html')}">OJPMS</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="nav">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          ${navLinks}
        </ul>
        <div class="d-flex align-items-center gap-2">
          <span class="small text-muted">${user ? (user.name || user.email || '') : ''}</span>
          ${user ? '<button class="btn btn-sm btn-outline-danger" onclick="logout()">Logout</button>' : ''}
        </div>
      </div>
    </div>
  </nav>`;
  const c = document.getElementById('app-navbar');
  if (c) c.innerHTML = nav;
}
function showAlert(id, msg, type = 'info') {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type} alert-dismissible" role="alert">
    ${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  </div>`;
}
function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}
function formatDate(s) {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString();
  } catch (e) {
    return s;
  }
}
function logout() {
  localStorage.removeItem('ojpms_token');
  localStorage.removeItem('ojpms_user');
  navigateTo('index.html');
}
async function requireAuthGuard() {
  const token = localStorage.getItem('ojpms_token');
  if (!token) {
    navigateTo('index.html');
  }
}
function formToJSON(form) {
  const fd = new FormData(form);
  return Object.fromEntries(fd.entries());
}
function toggleFormDisabled(form, disabled) {
  Array.from(form.elements).forEach((el) => {
    if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      el.disabled = disabled;
    }
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toLocalInputValue(value) {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  } catch (err) {
    return '';
  }
}

function ensureKeywordModal() {
  let modalEl = document.getElementById('keyword-confirm-modal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'keyword-confirm-modal';
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirm Action</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p id="keyword-confirm-message" class="mb-3"></p>
            <div class="mb-3">
              <label for="keyword-confirm-input" class="form-label small text-muted">Type the keyword below to continue</label>
              <input type="text" class="form-control" id="keyword-confirm-input" autocomplete="off" />
              <div class="invalid-feedback" id="keyword-confirm-feedback"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="keyword-confirm-button">Confirm</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modalEl);
  }
  return {
    modalEl,
    titleEl: modalEl.querySelector('.modal-title'),
    messageEl: modalEl.querySelector('#keyword-confirm-message'),
    inputEl: modalEl.querySelector('#keyword-confirm-input'),
    feedbackEl: modalEl.querySelector('#keyword-confirm-feedback'),
    confirmBtn: modalEl.querySelector('#keyword-confirm-button'),
    cancelBtn: modalEl.querySelector('[data-bs-dismiss="modal"]'),
  };
}

function promptKeywordConfirm({ title = 'Confirm Action', messageHtml = '', keyword = 'confirm', confirmLabel = 'Confirm' } = {}) {
  const { modalEl, titleEl, messageEl, inputEl, feedbackEl, confirmBtn, cancelBtn } = ensureKeywordModal();
  titleEl.textContent = title;
  messageEl.innerHTML = messageHtml;
  inputEl.value = '';
  inputEl.classList.remove('is-invalid');
  feedbackEl.textContent = '';
  confirmBtn.textContent = confirmLabel;

  return new Promise((resolve) => {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const normalizedKeyword = String(keyword || '').trim().toLowerCase();

    const cleanup = () => {
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
    };

    const onHidden = () => {
      cleanup();
      resolve(false);
    };

    const onCancel = () => {
      cleanup();
      modal.hide();
      resolve(false);
    };

    const onConfirm = (ev) => {
      ev.preventDefault();
      const userInput = inputEl.value.trim().toLowerCase();
      if (userInput !== normalizedKeyword) {
        inputEl.classList.add('is-invalid');
        feedbackEl.textContent = `Please type "${keyword}" to confirm.`;
        inputEl.focus();
        return;
      }
      cleanup();
      modal.hide();
      resolve(true);
    };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    modalEl.addEventListener('hidden.bs.modal', onHidden);
    modal.show();
    setTimeout(() => inputEl.focus(), 200);
  });
}
