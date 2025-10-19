
async function loadProspectsKanban(){
  const cols = {
    New: document.getElementById('col-new'),
    Review: document.getElementById('col-review'),
    Submitted: document.getElementById('col-submitted'),
    Interview: document.getElementById('col-interview')
  };
  Object.values(cols).forEach(c=>c.innerHTML='<div class="text-muted">Loading…</div>');
  try{
    const res = await api.get('/api/prospects?limit=200');
    const rows = res.data.rows || [];
    const buckets = { New: [], Review: [], Submitted: [], Interview: [] };
    for (const p of rows){
      const status = p.status || 'New';
      if (status.includes('Review')) buckets.Review.push(p);
      else if (status.includes('Submitted')) buckets.Submitted.push(p);
      else if (status.includes('Interview') || status.includes('Shortlist')) buckets.Interview.push(p);
      else buckets.New.push(p);
    }
    const render = (p) => `<div class="kanban-card mb-2" data-id="${p.id}">
        <div class="fw-semibold">${p.full_name}</div>
        <div class="small text-muted">${p.contact_phone || ''} ${p.contact_email ? '· '+p.contact_email : ''}</div>
        <div class="small text-muted">${formatDate(p.created_at)}</div>
        <div class="mt-2"><a class="btn btn-sm btn-outline-primary" href="/prospects/details.html?id=${p.id}">View</a></div>
      </div>`;
    cols.New.innerHTML = buckets.New.map(render).join('') || '<div class="text-muted">Empty</div>';
    cols.Review.innerHTML = buckets.Review.map(render).join('') || '<div class="text-muted">Empty</div>';
    cols.Submitted.innerHTML = buckets.Submitted.map(render).join('') || '<div class="text-muted">Empty</div>';
    cols.Interview.innerHTML = buckets.Interview.map(render).join('') || '<div class="text-muted">Empty</div>';

    // Enable visual drag-and-drop (no persistence yet)
    for(const key of Object.keys(cols)){
      new Sortable(cols[key], { group: 'prospects', animation: 150,
        onEnd: (evt) => {
          // No backend endpoint to persist yet
          // If you add PATCH /api/prospects/:id/status, call it here:
          // const id = evt.item.getAttribute('data-id');
          // const to = evt.to.id -> map to status string
        }
      });
    }
  }catch(e){
    Object.values(cols).forEach(c=>c.innerHTML='<div class="text-danger">Failed to load.</div>');
  }

  // create form
  const form = document.getElementById('newProspectForm');
  if (form){
    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      const fd = new FormData(form);
      try{
        await api.post('/api/prospects', {
          full_name: fd.get('full_name'),
          contact_phone: fd.get('contact_phone'),
          contact_email: fd.get('contact_email') || null
        });
        form.reset();
        const modal = bootstrap.Modal.getInstance(document.getElementById('newProspectModal'));
        modal.hide();
        loadProspectsKanban();
      }catch(err){
        alert('Failed to create prospect');
      }
    });
  }
}

async function loadProspectDetails(){
  const id = getParam('id');
  if (!id){ showAlert('alert-box', 'Missing prospect id', 'danger'); return; }
  try{
    const res = await api.get('/api/prospects?limit=500');
    const p = (res.data.rows || []).find(x=> String(x.id)===String(id));
    if (!p){ showAlert('alert-box', 'Prospect not found', 'warning'); return; }
    document.getElementById('prospect-summary').innerHTML = `
      <div class="d-flex justify-content-between">
        <div>
          <div class="fs-5 fw-semibold">${p.full_name}</div>
          <div class="small text-muted">${p.contact_phone || ''} ${p.contact_email? '· '+p.contact_email : ''}</div>
        </div>
        <span class="badge text-bg-secondary">${p.status || 'New'}</span>
      </div>`;

    document.getElementById('overview').innerHTML = `
      <h5>Overview</h5>
      <div class="small">
        <div><strong>Contact:</strong> ${p.contact_phone || ''} ${p.contact_email? '· '+p.contact_email : ''}</div>
        <div><strong>Created:</strong> ${formatDate(p.created_at)}</div>
      </div>`;

    // Applications list
    try{
      const apps = await api.get('/api/applications');
      const list = document.getElementById('applications-list');
      const relevant = (apps.data.rows||[]).filter(a=> String(a.prospect_id)===String(id));
      list.innerHTML = relevant.map(a=>`
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span><strong>${a.job_title || ('Job #' + a.job_id)}</strong> <span class="text-muted"> · ${a.status}</span></span>
          <span class="small text-muted">${formatDate(a.submitted_at || a.created_at)}</span>
        </li>`).join('') || '<li class="list-group-item text-muted">No applications</li>';
    }catch(e){{}}

    // Interviews list (if available)
    try{
      const iv = await api.get('/api/interviews');
      const list2 = document.getElementById('interviews-list');
      const relevant2 = (iv.data.rows||[]).filter(r=> String(r.prospect_id)===String(id));
      list2.innerHTML = relevant2.map(r=>`
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span><strong>${r.mode || 'Interview'}</strong> <span class="text-muted"> · ${r.location || ''}</span></span>
          <span class="small text-muted">${formatDate(r.scheduled_time)}</span>
        </li>`).join('') || '<li class="list-group-item text-muted">No interviews</li>';
    }catch(e){{}}
  }catch(e){
    showAlert('alert-box', 'Failed to load details', 'danger');
  }

  // quick actions
  document.addEventListener('click', async (e)=>{
    if (e.target && e.target.id==='btnCreateApplication'){
      const id = getParam('id');
      const job_id = prompt('Enter Job ID to apply:');
      if (!job_id) return;
      try{
        await api.post('/api/applications', { prospect_id: Number(id), job_id: Number(job_id), status: 'Submitted' });
        showAlert('alert-box', 'Application created.', 'success');
        loadProspectDetails();
      }catch(err){ showAlert('alert-box', 'Failed to create application', 'danger'); }
    }
    if (e.target && e.target.id==='btnScheduleInterview'){
      const id = getParam('id');
      const application_id = prompt('Application ID:');
      const employer_id = prompt('Employer ID:');
      const when = prompt('Scheduled Time (ISO):', new Date().toISOString());
      if (!application_id || !employer_id || !when) return;
      try{
        await api.post('/api/interviews', { prospect_id: Number(id), application_id: Number(application_id), employer_id: Number(employer_id), scheduled_time: when, mode: 'Zoom' });
        showAlert('alert-box', 'Interview scheduled.', 'success');
        loadProspectDetails();
      }catch(err){ showAlert('alert-box', 'Failed to schedule interview', 'danger'); }
    }
  });
}
