
async function loadApplications(){
  const el = document.getElementById('apps-list');
  el.innerHTML = '<div class="text-muted">Loading…</div>';
  try{
    const res = await api.get('/api/applications');
    const q = (document.getElementById('search').value || '').toLowerCase();
    const rows = (res.data.rows||[]).filter(r => {
      const s = `${r.prospect_name||''} ${r.job_title||''} ${r.employer_name||''}`.toLowerCase();
      return !q || s.includes(q);
    });
    el.innerHTML = rows.map(r=>`
      <div class="card shadow-sm">
        <div class="card-body d-flex justify-content-between align-items-center">
          <div>
            <div><strong>${r.prospect_name}</strong> → ${r.job_title || ('Job #' + r.job_id)}</div>
            <div class="small text-muted">Status: ${r.status} · ${formatDate(r.submitted_at || r.created_at)}</div>
          </div>
          <a class="btn btn-outline-primary" href="/prospects/details.html?id=${r.prospect_id}">Open</a>
        </div>
      </div>`).join('') || '<div class="text-muted">No applications</div>';
  }catch(e){
    el.innerHTML = '<div class="text-danger">Failed to load applications.</div>';
  }
}
