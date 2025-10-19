(function () {
  const OJPMS = window.OJPMS || {};
  if (!OJPMS.api || !OJPMS.common) {
    console.error("OJPMS utilities unavailable");
    return;
  }

  const state = {
    upcoming: [],
    metrics: [],
    emptyState: null,
  };

  const elements = {
    metrics: document.getElementById("interviewMetrics"),
    schedule: document.getElementById("interviewSchedule"),
    empty: document.getElementById("interviewEmptyState"),
    scheduleBtn: document.getElementById("scheduleInterviewBtn"),
  };

  function initialize(data) {
    state.upcoming = data.upcoming || [];
    state.metrics = data.metrics || [];
    state.emptyState = data.emptyState;

    renderMetrics();
    renderSchedule();
    bindEvents();
  }

  function renderMetrics() {
    elements.metrics.innerHTML = "";
    state.metrics.forEach((metric) => {
      const col = document.createElement("div");
      col.className = "col-md-4";
      col.innerHTML = `
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <span class="text-uppercase small text-muted">${metric.label}</span>
            <h3 class="fw-semibold mb-0">${metric.value}</h3>
          </div>
        </div>
      `;
      elements.metrics.appendChild(col);
    });
  }

  function renderSchedule() {
    elements.schedule.innerHTML = "";
    elements.empty.innerHTML = "";

    if (!state.upcoming.length) {
      renderEmptyState();
      return;
    }

    state.upcoming.forEach((day) => {
      const card = document.createElement("div");
      card.className = "card border-0 shadow-sm mb-4 interview-day";
      card.innerHTML = `
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 class="fw-semibold mb-1">${day.dayLabel}</h5>
              <p class="text-muted small mb-0">${OJPMS.common.formatDate(day.date)}</p>
            </div>
            <span class="badge bg-light text-dark">${day.items.length} interviews</span>
          </div>
          <div class="list-group list-group-flush" data-schedule-items></div>
        </div>
      `;

      const list = card.querySelector("[data-schedule-items]");
      (day.items || []).forEach((slot) => {
        const item = document.createElement("div");
        item.className = "list-group-item px-0 border-0 mb-3 interview-card";
        item.innerHTML = `
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
            <div>
              <h6 class="mb-1">${slot.candidate}</h6>
              <p class="text-muted small mb-1">${slot.role} · ${slot.stage}</p>
              <p class="text-muted small mb-0">${slot.location} · ${slot.interviewer}</p>
            </div>
            <span class="badge bg-primary-subtle text-primary">${OJPMS.common.formatTime(slot.time)}</span>
          </div>
        `;
        list.appendChild(item);
      });

      elements.schedule.appendChild(card);
    });
  }

  function renderEmptyState() {
    if (!state.emptyState) return;
    elements.empty.innerHTML = `
      <div class="text-center py-5">
        <div class="display-5 text-primary mb-3"><i class="bi bi-calendar2-week"></i></div>
        <h5 class="fw-semibold mb-2">${state.emptyState.title}</h5>
        <p class="text-muted mb-0">${state.emptyState.description}</p>
      </div>
    `;
  }

  function bindEvents() {
    elements.scheduleBtn.addEventListener("click", () => {
      OJPMS.common.showToast("Interview scheduling coming soon.");
    });
  }

  OJPMS.api
    .fetchJSON("data/interviews.json")
    .then(initialize)
    .catch(() => {
      elements.empty.innerHTML =
        "<div class=\"alert alert-danger\">Unable to load interviews.</div>";
    });
})();
