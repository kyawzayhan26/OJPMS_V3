
let clientDnDInit = false;

async function loadClientsKanban(){
  const cols = ['Interview_Passed','Smartcard_InProgress','SmartCard_Approved','Visa_InProgress','Visa_Approved','Flight_Booked'];
  const el = Object.fromEntries(cols.map(k=>[k, document.getElementById('c-'+k)]));
  Object.values(el).forEach(n=> n.innerHTML = '<div class="text-muted">Loading…</div>');

  let rows = [];
  try{
    const res = await api.get('/api/clients'); // if not available, will throw
    rows = res.data.rows || [];
  }catch(e){
    // graceful: no list endpoint available
    Object.values(el).forEach(n=> n.innerHTML = '<div class="text-info">GET /api/clients is not available on backend yet.</div>');
    return;
  }

  const groups = Object.fromEntries(cols.map(k=>[k,[]]));
  for (const c of rows){
    const s = c.status || 'Interview_Passed';
    (groups[s] || groups['Interview_Passed']).push(c);
  }
  const card = (c) => `<div class="kanban-card mb-2" data-id="${c.id}">
      <div class="fw-semibold">${c.full_name || ('Client #' + c.id)}</div>
      <div class="small text-muted">${c.contact_phone || ''}</div>
      <div class="mt-2 d-flex gap-2">
        <a class="btn btn-sm btn-outline-primary" href="/clients/details.html?id=${c.id}">View</a>
      </div>
    </div>`;
  cols.forEach(k=>{
    el[k].innerHTML = groups[k].map(card).join('') || '<div class="text-muted">Empty</div>';
  });

  if (!clientDnDInit){
    clientDnDInit = true;
    // Init Sortable on each column; same group so cross-column moves
    cols.forEach(k=>{
      new Sortable(el[k], {
        group: 'clients', animation: 150, ghostClass: 'bg-light',
        onEnd: async (evt) => {
          const id = evt.item.getAttribute('data-id');
          const toStatus = evt.to.getAttribute('data-status');
          try{
            await api.patch(`/api/clients/${id}/status`, { to_status: toStatus });
            // success feedback optional
          }catch(err){
            // revert UI by moving back
            evt.from.appendChild(evt.item);
            alert('Failed to update client status.');
          }
        }
      });
    });
  }
}

async function loadClientDetails(){
  const id = getParam('id');
  if (!id){ showAlert('alert-box', 'Missing client id', 'danger'); return; }
  try{
    let client = null;
    try{ const one = await api.get('/api/clients/' + id); client = one.data; }catch(e){
      const all = await api.get('/api/clients');
      client = (all.data.rows||[]).find(x=> String(x.id)===String(id));
    }
    if (!client){ showAlert('alert-box', 'Client not found', 'warning'); return; }

    document.getElementById('client-overview').innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="fs-5 fw-semibold">${client.full_name || ('Client #' + client.id)}</div>
          <div class="small text-muted">${client.contact_phone || ''} ${client.contact_email ? '· '+client.contact_email : ''}</div>
          <div class="small text-muted">Status: <span class="badge text-bg-secondary">${client.status || '-'}</span></div>
        </div>
      </div>`;

    const actions = ['Smartcard_InProgress','SmartCard_Approved','Visa_InProgress','Visa_Approved','Accommodation_Pending','FlightBooking_Pending','Approved_For_Deployment','Departed'];
    document.getElementById('quick-actions').innerHTML = actions.map(a=>`<button class="btn btn-sm btn-outline-primary" data-action="${a}">${a.replaceAll('_',' ')}</button>`).join('');

    try{
      const docs = await api.get('/api/documents');
      const list = (docs.data.rows||[]).filter(d=> String(d.client_id)===String(id));
      document.getElementById('documents').innerHTML = list.map(d=>`
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span>${d.type} <span class="text-muted">· ${d.status}</span></span>
          ${d.file_url ? `<a href="${d.file_url}" target="_blank" class="small">Open</a>` : ''}
        </li>`).join('') || '<li class="list-group-item text-muted">No documents</li>';
    }catch(e){{}}
  }catch(e){
    showAlert('alert-box', 'Failed to load client', 'danger');
  }

  document.getElementById('quick-actions').addEventListener('click', async (ev)=>{
    const btn = ev.target.closest('button[data-action]'); if (!btn) return;
    const to = btn.getAttribute('data-action');
    const id = getParam('id');
    try{
      await api.patch(`/api/clients/${id}/status`, { to_status: to });
      showAlert('alert-box', 'Status updated.', 'success');
      await loadClientDetails();
    }catch(e){ showAlert('alert-box', 'Failed to update status', 'danger'); }
  });
}
