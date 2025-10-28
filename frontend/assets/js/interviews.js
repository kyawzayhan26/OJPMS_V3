let interviewCalendarDate = new Date();

function monthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const from = new Date(start);
  from.setHours(0, 0, 0, 0);
  const to = new Date(end);
  to.setHours(23, 59, 59, 999);
  return { start: from, end: to };
}

function renderCalendarGrid(anchorDate, interviews) {
  const { start } = monthRange(anchorDate);
  const firstDayIndex = new Date(start.getFullYear(), start.getMonth(), 1).getDay();
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const grid = [];
  for (let i = 0; i < firstDayIndex; i += 1) {
    grid.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    grid.push(new Date(start.getFullYear(), start.getMonth(), day));
  }
  while (grid.length % 7 !== 0) {
    grid.push(null);
  }
  const container = document.getElementById('calendar-body');
  if (!container) return;
  container.innerHTML = '';
  grid.forEach((date) => {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (!date) {
      cell.classList.add('bg-light');
      container.appendChild(cell);
      return;
    }
    const dayInterviews = interviews.filter((iv) => {
      const time = new Date(iv.scheduled_time);
      return (
        time.getFullYear() === date.getFullYear() &&
        time.getMonth() === date.getMonth() &&
        time.getDate() === date.getDate()
      );
    });
    cell.innerHTML = `<div class="day-number">${date.getDate()}</div>`;
    dayInterviews.forEach((iv) => {
      const div = document.createElement('div');
      div.className = 'interview-card';
      div.innerHTML = `
        <div class="title">${iv.prospect_name || 'Prospect #' + iv.prospect_id}</div>
        <div class="meta">${iv.job_title || 'Job #' + (iv.job_id || iv.application_id)} · ${new Date(iv.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div class="meta">${iv.mode || ''}${iv.location ? ' · ' + iv.location : ''}</div>
        <a class="small" href="${resolveAppPath('interviews/details.html?id=' + iv.id)}">Open</a>`;
      cell.appendChild(div);
    });
    if (!dayInterviews.length) {
      const empty = document.createElement('div');
      empty.className = 'text-muted small';
      empty.textContent = 'No interviews';
      cell.appendChild(empty);
    }
    container.appendChild(cell);
  });
}

async function loadInterviewsCalendar() {
  const header = document.getElementById('calendar-month-label');
  const { start, end } = monthRange(interviewCalendarDate);
  if (header) {
    header.textContent = interviewCalendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  const params = {
    from: start.toISOString(),
    to: end.toISOString(),
    limit: 100,
    page: 1,
    sort: 'scheduled_time:asc',
  };
  try {
    const res = await api.get('/interviews', { params });
    const rows = res.data?.rows || [];
    renderCalendarGrid(interviewCalendarDate, rows);
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Failed to load interviews', 'danger');
    const container = document.getElementById('calendar-body');
    if (container) container.innerHTML = '<div class="p-3">Unable to load interviews.</div>';
  }
}

function bindCalendarControls() {
  const prev = document.getElementById('calendar-prev');
  const next = document.getElementById('calendar-next');
  if (prev) prev.onclick = () => {
    interviewCalendarDate = new Date(interviewCalendarDate.getFullYear(), interviewCalendarDate.getMonth() - 1, 1);
    loadInterviewsCalendar();
  };
  if (next) next.onclick = () => {
    interviewCalendarDate = new Date(interviewCalendarDate.getFullYear(), interviewCalendarDate.getMonth() + 1, 1);
    loadInterviewsCalendar();
  };
}

function initInterviewForm() {
  const form = document.getElementById('interview-form');
  if (!form) return;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const data = formToJSON(form);
    toggleFormDisabled(form, true);
    try {
      const prospectId = requirePositiveInt(data.prospect_id, 'Prospect');
      const applicationId = requirePositiveInt(data.application_id, 'Application');
      const employerId = requirePositiveInt(data.employer_id, 'Employer');
      if (!data.scheduled_time) {
        throw new Error('Scheduled time is required.');
      }
      const payload = {
        prospect_id: prospectId,
        application_id: applicationId,
        employer_id: employerId,
        scheduled_time: data.scheduled_time,
        mode: data.mode || null,
        location: data.location || null,
      };
      await api.post('/interviews', payload);
      form.reset();
      const modalEl = document.getElementById('interviewModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
      }
      showAlert('alert-box', 'Interview scheduled.', 'success');
      await loadInterviewsCalendar();
    } catch (err) {
      showAlert('form-alert', err.response?.data?.message || err.message || 'Failed to schedule interview', 'danger');
    } finally {
      toggleFormDisabled(form, false);
    }
  });
}

async function loadInterviewDetails() {
  const id = getParam('id');
  if (!id) {
    showAlert('alert-box', 'Missing interview id', 'danger');
    return;
  }
  const summary = document.getElementById('interview-summary');
  const form = document.getElementById('interview-detail-form');
  const outcomeForm = document.getElementById('outcome-form');
  const deleteBtn = document.getElementById('delete-interview');

  const setFormValues = (iv) => {
    if (!form) return;
    form.prospect_id.value = iv.prospect_id || '';
    form.application_id.value = iv.application_id || '';
    form.employer_id.value = iv.employer_id || '';
    form.scheduled_time.value = iv.scheduled_time ? iv.scheduled_time.substring(0, 16) : '';
    form.mode.value = iv.mode || '';
    form.location.value = iv.location || '';
    refreshLookupDisplay(form.prospect_id);
    refreshLookupDisplay(form.application_id);
    refreshLookupDisplay(form.employer_id);
  };

  try {
    const res = await api.get('/interviews', { params: { limit: 100, page: 1, sort: 'scheduled_time:desc' } });
    const rows = res.data?.rows || [];
    const interview = rows.find((i) => String(i.id) === String(id));
    if (!interview) {
      showAlert('alert-box', 'Interview not found', 'warning');
      return;
    }
    if (summary) {
      summary.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h5 mb-1">${interview.prospect_name || 'Prospect #' + interview.prospect_id}</h1>
            <div class="small text-muted">${interview.job_title || 'Application #' + interview.application_id}</div>
            <div class="small text-muted">${interview.mode || ''}${interview.location ? ' · ' + interview.location : ''}</div>
          </div>
          <span class="badge text-bg-secondary">${interview.outcome || 'Pending'}</span>
        </div>
        <div class="small text-muted mt-2">Scheduled ${formatDate(interview.scheduled_time)} · Recorded ${formatDate(interview.created_at)}</div>`;
    }
    setFormValues(interview);
    if (form) {
      Array.from(form.elements).forEach((el) => {
        if (el.name) el.disabled = true;
      });
    }
    if (outcomeForm) {
      outcomeForm.outcome.value = interview.outcome || 'Pending';
      outcomeForm.outcome_notes.value = interview.outcome_notes || '';
      outcomeForm.onsubmit = async (ev) => {
        ev.preventDefault();
        try {
          await api.patch(`/interviews/${id}/outcome`, {
            outcome: outcomeForm.outcome.value,
            outcome_notes: outcomeForm.outcome_notes.value || null,
          });
          showAlert('alert-box', 'Outcome updated.', 'success');
          await loadInterviewDetails();
        } catch (err) {
          showAlert('alert-box', err.response?.data?.message || 'Failed to update outcome', 'danger');
        }
      };
    }
    if (deleteBtn) deleteBtn.onclick = async () => {
      if (!confirm('Delete this interview?')) return;
      try {
        await api.delete(`/interviews/${id}`);
        showAlert('alert-box', 'Interview deleted.', 'success');
        setTimeout(() => navigateTo('interviews/list.html'), 800);
      } catch (err) {
        showAlert('alert-box', err.response?.data?.message || 'Failed to delete interview', 'danger');
      }
    };
  } catch (err) {
    showAlert('alert-box', err.response?.data?.message || 'Failed to load interview', 'danger');
  }
}
