(function () {
  const OJPMS = window.OJPMS || {};
  if (!OJPMS.api || !OJPMS.common) {
    console.error("OJPMS utilities unavailable");
    return;
  }

  const state = {
    applications: [],
    filters: {
      status: "",
      owner: "",
    },
    summary: [],
    emptyState: null,
  };

  const elements = {
    summary: document.getElementById("applicationSummary"),
    list: document.getElementById("applicationList"),
    empty: document.getElementById("applicationEmptyState"),
    statusFilter: document.getElementById("statusFilter"),
    ownerFilter: document.getElementById("ownerFilter"),
    search: document.getElementById("applicationSearch"),
    countBadge: document.getElementById("applicationCount"),
    createBtn: document.getElementById("createApplicationBtn"),
  };

  function initialize(data) {
    state.applications = data.applications || [];
    state.summary = data.summary || [];
    state.emptyState = data.emptyState;

    renderSummary();
    renderFilters(data.filters?.status || []);
    renderApplications();
    bindEvents();
  }

  function renderSummary() {
    elements.summary.innerHTML = "";
    state.summary.forEach((metric) => {
      const col = document.createElement("div");
      col.className = "col-md-4";
      col.innerHTML = `
        <div class="card border-0 shadow-sm stat-card h-100">
          <div class="card-body">
            <span class="text-uppercase small text-muted">${metric.label}</span>
            <h3 class="fw-semibold my-2">${metric.value}</h3>
            <p class="text-muted small mb-0">${metric.change || ""}</p>
          </div>
        </div>
      `;
      elements.summary.appendChild(col);
    });
  }

  function renderFilters(statusOptions) {
    elements.statusFilter.innerHTML = "";
    statusOptions.forEach((option) => {
      const optionNode = document.createElement("option");
      optionNode.value = option.value;
      optionNode.textContent = option.label;
      if (option.default) {
        optionNode.selected = true;
        state.filters.status = option.value;
      }
      elements.statusFilter.appendChild(optionNode);
    });
  }

  function filterApplications() {
    const searchTerm = (elements.search?.value || "").toLowerCase();
    return state.applications.filter((app) => {
      const matchesStatus = !state.filters.status || app.status === state.filters.status;
      const matchesOwner = !state.filters.owner || app.recruiter === state.filters.owner;
      const matchesSearch =
        !searchTerm ||
        app.title.toLowerCase().includes(searchTerm) ||
        app.company.toLowerCase().includes(searchTerm) ||
        app.candidate.toLowerCase().includes(searchTerm);
      return matchesStatus && matchesOwner && matchesSearch;
    });
  }

  function renderApplications() {
    const applications = filterApplications();
    elements.list.innerHTML = "";
    elements.empty.innerHTML = "";

    elements.countBadge.textContent = `${applications.length} application${
      applications.length === 1 ? "" : "s"
    }`;

    if (applications.length === 0) {
      renderEmptyState();
      return;
    }

    applications.forEach((app) => {
      const col = document.createElement("div");
      col.className = "col-xl-4 col-md-6";
      col.appendChild(createApplicationCard(app));
      elements.list.appendChild(col);
    });
  }

  function createApplicationCard(app) {
    const card = document.createElement("div");
    card.className = "card border-0 shadow-sm h-100";
    const tags = Array.isArray(app.tags) ? app.tags : [];
    card.innerHTML = `
      <div class="card-body d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 class="card-title mb-1">${app.title}</h5>
            <p class="card-subtitle text-muted mb-0">${app.company}</p>
          </div>
          <span class="badge bg-${app.badge.variant} rounded-pill">${app.badge.label}</span>
        </div>
        <p class="small text-muted mb-2">
          Candidate: <strong>${app.candidate}</strong>
        </p>
        <p class="small text-muted mb-3">
          Recruiter: ${app.recruiter} · Posted ${OJPMS.common.formatDate(app.posted)}
        </p>
        <div class="mt-auto d-flex flex-wrap gap-2">
          ${tags
            .map((tag) => `<span class="badge rounded-pill bg-light text-primary">${tag}</span>`)
            .join("")}
        </div>
      </div>
    `;
    return card;
  }

  function renderEmptyState() {
    if (!state.emptyState) return;
    elements.empty.innerHTML = `
      <div class="text-center py-5">
        <div class="display-5 text-primary mb-3"><i class="bi bi-folder-x"></i></div>
        <h5 class="fw-semibold mb-2">${state.emptyState.title}</h5>
        <p class="text-muted mb-0">${state.emptyState.description}</p>
      </div>
    `;
  }

  function bindEvents() {
    elements.statusFilter.addEventListener("change", (event) => {
      state.filters.status = event.target.value;
      renderApplications();
    });

    elements.ownerFilter.addEventListener("change", (event) => {
      state.filters.owner = event.target.value;
      renderApplications();
    });

    if (elements.search) {
      elements.search.addEventListener("input", () => {
        renderApplications();
      });
    }

    elements.createBtn.addEventListener("click", () => {
      OJPMS.common.showToast("Application creation workflow launching soon.");
    });
  }

  OJPMS.api
    .fetchJSON("data/applications.json")
    .then(initialize)
    .catch(() => {
      elements.empty.innerHTML =
        "<div class=\"alert alert-danger\">Unable to load applications.</div>";
    });
})();
