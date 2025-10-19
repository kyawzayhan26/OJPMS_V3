
async function loadInterviews(){
  const el = document.getElementById('interviews');
  el.innerHTML = '<div class="text-muted">Loading…</div>';
  try{
    const res = await api.get('/api/interviews');
    const rows = res.data.rows || [];
    el.innerHTML = rows.map(r=>`
      <div class="card">
        <div class="card-body d-flex justify-content-between align-items-center">
          <div>
            <div><strong>Prospect #${r.prospect_id}</strong> · App #${r.application_id} · Emp #${r.employer_id}</div>
            <div class="small text-muted">When: ${formatDate(r.scheduled_time)} · ${r.mode || ''} ${r.location ? '· '+r.location : ''}</div>
          </div>
          <a class="btn btn-outline-primary" href="/prospects/details.html?id=${r.prospect_id}">Open</a>
        </div>
      </div>`).join('') || '<div class="text-muted">No interviews</div>';
  }catch(e){
    el.innerHTML = '<div class="alert alert-info">GET /api/interviews not available on backend. You can still schedule using the "+ New Interview" button.</div>';
  }

  const form = document.getElementById('newInterviewForm');
  if (form){
    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      const fd = new FormData(form);
      try{
        await api.post('/api/interviews', {
          prospect_id: Number(fd.get('prospect_id')),
          application_id: Number(fd.get('application_id')),
          employer_id: Number(fd.get('employer_id')),
          scheduled_time: fd.get('scheduled_time'),
          mode: fd.get('mode') || null,
          location: fd.get('location') || null
        });
        const modal = bootstrap.Modal.getInstance(document.getElementById('newInterviewModal'));
        modal.hide();
        showAlert('alert-box', 'Interview scheduled.', 'success');
        loadInterviews();
      }catch(err){
        showAlert('alert-box', 'Failed to schedule', 'danger');
      }
    });
  }
}
