
function renderNavbar() {
  const user = JSON.parse(localStorage.getItem('ojpms_user') || 'null');
  const nav = `
  <nav class="navbar navbar-expand-lg bg-body-tertiary">
    <div class="container-fluid">
      <a class="navbar-brand" href="/prospects/kanban.html">OJPMS</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="nav">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item"><a class="nav-link" href="/prospects/kanban.html">Prospects</a></li>
          <li class="nav-item"><a class="nav-link" href="/applications/list.html">Applications</a></li>
          <li class="nav-item"><a class="nav-link" href="/interviews/list.html">Interviews</a></li>
          <li class="nav-item"><a class="nav-link" href="/clients/kanban.html">Clients</a></li>
        </ul>
        <div class="d-flex align-items-center gap-2">
          <span class="small text-muted">${user ? (user.name || user.email) : ''}</span>
          ${user ? '<button class="btn btn-sm btn-outline-danger" onclick="logout()">Logout</button>' : ''}
        </div>
      </div>
    </div>
  </nav>`;
  const c = document.getElementById('app-navbar');
  if (c) c.innerHTML = nav;
}
function showAlert(id, msg, type='info') {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type} alert-dismissible" role="alert">
    ${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  </div>`;
}
function getParam(name){
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}
function formatDate(s){
  try { return new Date(s).toLocaleString(); } catch(e){ return s; }
}
function logout(){
  localStorage.removeItem('ojpms_token');
  localStorage.removeItem('ojpms_user');
  window.location.href = '/index.html';
}
async function requireAuthGuard(){
  const token = localStorage.getItem('ojpms_token');
  if (!token) { window.location.href = '/index.html'; return; }
}
