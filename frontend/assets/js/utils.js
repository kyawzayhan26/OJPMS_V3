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

function renderNavbar() {
  const user = JSON.parse(localStorage.getItem('ojpms_user') || 'null');
  const path = window.location.pathname;
  const links = [
    {
      path: 'prospects/list.html',
      label: 'Prospects',
      match: (p) => p.includes('/prospects/') && !p.endsWith('/prospects/kanban.html'),
    },
    {
      path: 'prospects/kanban.html',
      label: 'Prospects Board',
      match: (p) => p.endsWith('/prospects/kanban.html'),
    },
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
      path: 'clients/list.html',
      label: 'Clients',
      match: (p) => p.includes('/clients/') && !p.endsWith('/clients/kanban.html'),
    },
    {
      path: 'clients/kanban.html',
      label: 'Clients Board',
      match: (p) => p.endsWith('/clients/kanban.html'),
    },
    {
      path: 'payments/list.html',
      label: 'Payments',
      match: (p) => p.includes('/payments/'),
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
