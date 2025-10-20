function renderNavbar() {
  const user = JSON.parse(localStorage.getItem('ojpms_user') || 'null');
  const path = window.location.pathname;
  const links = [
    {
      href: '/prospects/list.html',
      label: 'Prospects',
      match: (p) => p.startsWith('/prospects/') && !p.endsWith('/prospects/kanban.html'),
    },
    {
      href: '/prospects/kanban.html',
      label: 'Prospects Board',
      match: (p) => p.endsWith('/prospects/kanban.html'),
    },
    {
      href: '/employers/list.html',
      label: 'Employers',
      match: (p) => p.startsWith('/employers/'),
    },
    {
      href: '/jobs/list.html',
      label: 'Jobs',
      match: (p) => p.startsWith('/jobs/'),
    },
    {
      href: '/applications/list.html',
      label: 'Applications',
      match: (p) => p.startsWith('/applications/'),
    },
    {
      href: '/interviews/list.html',
      label: 'Interviews',
      match: (p) => p.startsWith('/interviews/'),
    },
    {
      href: '/clients/list.html',
      label: 'Clients',
      match: (p) => p.startsWith('/clients/') && !p.endsWith('/clients/kanban.html'),
    },
    {
      href: '/clients/kanban.html',
      label: 'Clients Board',
      match: (p) => p.endsWith('/clients/kanban.html'),
    },
    {
      href: '/payments/list.html',
      label: 'Payments',
      match: (p) => p.startsWith('/payments/'),
    },
  ];
  const navLinks = links
    .map((link) => {
      const isActive = typeof link.match === 'function' ? link.match(path) : path === link.href;
      const aria = isActive ? ' aria-current="page"' : '';
      return `<li class="nav-item"><a class="nav-link${isActive ? ' active' : ''}"${aria} href="${link.href}">${link.label}</a></li>`;
    })
    .join('');
  const nav = `
  <nav class="navbar navbar-expand-lg bg-body-tertiary">
    <div class="container-fluid">
      <a class="navbar-brand" href="/prospects/list.html">OJPMS</a>
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
  window.location.href = '/index.html';
}
async function requireAuthGuard() {
  const token = localStorage.getItem('ojpms_token');
  if (!token) {
    window.location.href = '/index.html';
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
