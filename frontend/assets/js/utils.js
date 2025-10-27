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

const lookupCache = {};
const lookupPromises = {};
const lookupDisplays = new WeakMap();

function normalizeStatusLabel(status) {
  if (!status) return '';
  return String(status)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function truncateLabel(text, max = 80) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

const LOOKUP_FETCHERS = {
  async prospect() {
    try {
      const res = await api.get('/prospects', { params: { limit: 100, page: 1, sort: 'full_name:asc' } });
      const rows = res.data?.rows || [];
      return rows.map((p) => {
        const status = normalizeStatusLabel(p.status);
        const base = p.full_name || `Prospect #${p.id}`;
        const parts = [`${base} (#${p.id})`];
        if (status) parts.push(status);
        return { value: p.id, label: parts.join(' · ') };
      });
    } catch (err) {
      console.error('Failed to fetch prospect lookup options', err);
      return [];
    }
  },
  async job() {
    try {
      const res = await api.get('/jobs', { params: { limit: 100, page: 1, sort: 'title:asc' } });
      const rows = res.data?.rows || [];
      return rows.map((job) => {
        const extras = [];
        if (job.location_country) extras.push(job.location_country);
        const desc = truncateLabel(job.description, 70);
        if (desc) extras.push(desc);
        const label = [`${job.title || `Job #${job.id}`} (#${job.id})`]
          .concat(extras.length ? [`${extras.join(' · ')}`] : [])
          .join(' · ');
        return { value: job.id, label };
      });
    } catch (err) {
      console.error('Failed to fetch job lookup options', err);
      return [];
    }
  },
  async client() {
    try {
      const res = await api.get('/clients', { params: { limit: 100, page: 1, sort: 'full_name:asc' } });
      const rows = res.data?.rows || [];
      return rows.map((c) => {
        const status = normalizeStatusLabel(c.status);
        const label = [`${c.full_name || `Client #${c.id}`} (#${c.id})`]
          .concat(status ? [status] : [])
          .join(' · ');
        return { value: c.id, label };
      });
    } catch (err) {
      console.error('Failed to fetch client lookup options', err);
      return [];
    }
  },
  async application() {
    try {
      const res = await api.get('/applications', { params: { limit: 100, page: 1, sort: 'created_at:desc' } });
      const rows = res.data?.rows || [];
      return rows.map((app) => {
        const prospect = app.prospect_name || `Prospect #${app.prospect_id}`;
        const job = app.job_title || `Job #${app.job_id}`;
        const labelParts = [`Application #${app.id}`, `${prospect} → ${job}`];
        if (app.status) labelParts.push(app.status);
        return { value: app.id, label: labelParts.join(' · ') };
      });
    } catch (err) {
      console.error('Failed to fetch application lookup options', err);
      return [];
    }
  },
  async employer() {
    try {
      const res = await api.get('/employers', { params: { limit: 100, page: 1, sort: 'name:asc' } });
      const rows = res.data?.rows || [];
      return rows.map((employer) => {
        const bits = [`${employer.name || `Employer #${employer.id}`} (#${employer.id})`];
        if (employer.country) bits.push(employer.country);
        return { value: employer.id, label: bits.join(' · ') };
      });
    } catch (err) {
      console.error('Failed to fetch employer lookup options', err);
      return [];
    }
  },
};

async function getLookupOptions(type) {
  if (lookupCache[type]) {
    return lookupCache[type];
  }
  const fetcher = LOOKUP_FETCHERS[type];
  if (!fetcher) return [];
  if (!lookupPromises[type]) {
    lookupPromises[type] = fetcher()
      .then((options) => {
        lookupCache[type] = options;
        lookupPromises[type] = null;
        return options;
      })
      .catch((err) => {
        lookupPromises[type] = null;
        console.error(`Lookup fetch failed for ${type}`, err);
        return [];
      });
  }
  return lookupPromises[type];
}

function getLookupDisplayElement(input) {
  if (!input) return null;
  let display = lookupDisplays.get(input);
  if (display && document.body.contains(display)) return display;

  if (input.dataset.lookupDisplay) {
    const existing = document.getElementById(input.dataset.lookupDisplay);
    if (existing) {
      lookupDisplays.set(input, existing);
      return existing;
    }
  }

  display = document.createElement('div');
  display.className = 'form-text text-muted lookup-display';

  let anchor = input.nextElementSibling;
  while (anchor && anchor.nodeType === Node.TEXT_NODE) {
    anchor = anchor.nextSibling;
  }
  if (anchor && anchor.classList?.contains('form-text') && !anchor.classList.contains('lookup-display')) {
    anchor.after(display);
  } else {
    input.after(display);
  }
  lookupDisplays.set(input, display);
  return display;
}

function populateDatalist(datalist, options) {
  if (!datalist) return;
  datalist.innerHTML = '';
  options.forEach((opt) => {
    const option = document.createElement('option');
    option.value = String(opt.value);
    option.textContent = opt.label;
    datalist.appendChild(option);
  });
}

function updateLookupDisplay(input) {
  if (!input || !input.dataset.lookup) return;
  const display = getLookupDisplayElement(input);
  if (!display) return;

  const type = input.dataset.lookup;
  const options = lookupCache[type];
  const value = String(input.value || '').trim();
  if (!value) {
    display.textContent = '';
    return;
  }
  if (!options || !options.length) {
    display.textContent = `Selected ID: ${value}`;
    return;
  }
  const match = options.find((opt) => String(opt.value) === value);
  display.textContent = match ? match.label : `Selected ID: ${value}`;
}

async function ensureLookupOptions(type, datalist) {
  const options = await getLookupOptions(type);
  populateDatalist(datalist, options);
  return options;
}

function enhanceLookupInputs(root = document) {
  if (!root) return;
  const inputs = root.querySelectorAll('input[data-lookup]');
  inputs.forEach((input) => {
    const type = input.dataset.lookup;
    if (!type || !LOOKUP_FETCHERS[type]) return;
    if (input.dataset.lookupBound === 'true') {
      updateLookupDisplay(input);
      return;
    }
    input.dataset.lookupBound = 'true';

    if (input.type === 'number') input.type = 'text';
    if (!input.hasAttribute('inputmode')) input.setAttribute('inputmode', 'numeric');
    if (!input.hasAttribute('pattern')) input.setAttribute('pattern', '\\d*');

    const datalistId = input.dataset.lookupListId || `lookup-${type}-${Math.random().toString(36).slice(2, 9)}`;
    input.dataset.lookupListId = datalistId;
    input.setAttribute('list', datalistId);

    let datalist = document.getElementById(datalistId);
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = datalistId;
      document.body.appendChild(datalist);
    }

    getLookupDisplayElement(input);

    const refresh = () => {
      ensureLookupOptions(type, datalist).then(() => updateLookupDisplay(input));
    };

    input.addEventListener('focus', refresh, { once: true });
    input.addEventListener('input', () => updateLookupDisplay(input));
    input.addEventListener('change', () => updateLookupDisplay(input));

    // Prime options asynchronously without blocking rendering
    ensureLookupOptions(type, datalist).then(() => updateLookupDisplay(input));
  });
}

function refreshLookupDisplay(input) {
  if (!input) return;
  updateLookupDisplay(input);
}

function invalidateLookupCache(type) {
  if (type) {
    delete lookupCache[type];
  } else {
    Object.keys(lookupCache).forEach((key) => delete lookupCache[key]);
  }
}

function equalizeKanbanColumns(root) {
  const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
  const columns = Array.from(scope.querySelectorAll('.kanban-col'));
  if (!columns.length) return;
  let maxHeight = 0;
  columns.forEach((col) => {
    col.style.height = 'auto';
    const height = col.scrollHeight;
    if (height > maxHeight) maxHeight = height;
  });
  columns.forEach((col) => {
    col.style.height = `${maxHeight}px`;
  });
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

document.addEventListener('DOMContentLoaded', () => {
  enhanceLookupInputs();
});

window.enhanceLookupInputs = enhanceLookupInputs;
window.refreshLookupDisplay = refreshLookupDisplay;
window.invalidateLookupCache = invalidateLookupCache;
window.equalizeKanbanColumns = equalizeKanbanColumns;

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
