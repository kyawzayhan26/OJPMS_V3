(function () {
  const OJPMS = window.OJPMS || {};
  if (!OJPMS.api || !OJPMS.common) {
    console.error("OJPMS utilities unavailable");
    return;
  }

  const state = {
    columns: [],
    emptyState: null,
  };

  const elements = {
    board: document.getElementById("prospectBoard"),
    empty: document.getElementById("prospectEmptyState"),
    addBtn: document.getElementById("addProspectBtn"),
  };

  function initialize(data) {
    state.columns = data.columns || [];
    state.emptyState = data.emptyState;
    renderBoard();
    bindEvents();
  }

  function renderBoard() {
    elements.board.innerHTML = "";
    elements.empty.innerHTML = "";

    if (!state.columns.length) {
      renderEmptyState();
      return;
    }

    state.columns.forEach((column) => {
      const col = document.createElement("div");
      col.className = "col-xl-4 col-md-6";
      col.appendChild(createColumn(column));
      elements.board.appendChild(col);
    });
  }

  function createColumn(column) {
    const wrapper = document.createElement("div");
    wrapper.className = "card border-0 shadow-sm h-100 kanban-column";
    wrapper.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h6 class="text-uppercase text-muted small mb-1">${column.label}</h6>
            <p class="text-muted small mb-0">${column.description || ""}</p>
          </div>
          <span class="badge bg-light text-dark">${column.items.length}</span>
        </div>
        <div class="d-flex flex-column gap-3" data-column-items></div>
      </div>
    `;

    const list = wrapper.querySelector("[data-column-items]");
    if (!column.items.length) {
      const empty = document.createElement("p");
      empty.className = "text-muted small mb-0";
      empty.textContent = "No prospects in this stage.";
      list.appendChild(empty);
    } else {
      column.items.forEach((prospect) => {
        list.appendChild(createProspectCard(prospect));
      });
    }

    return wrapper;
  }

  function createProspectCard(prospect) {
    const card = document.createElement("div");
    card.className = "border rounded-3 p-3 shadow-sm kanban-card";
    const tags = Array.isArray(prospect.tags) ? prospect.tags : [];
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h5 class="fw-semibold mb-1">${prospect.name}</h5>
          <p class="text-muted small mb-0">${prospect.role} · ${prospect.company}</p>
        </div>
        <span class="badge bg-primary-subtle text-primary">${prospect.owner}</span>
      </div>
      <p class="text-muted small mb-2">Updated ${OJPMS.common.formatDate(prospect.updated)}</p>
      <div class="d-flex flex-wrap gap-2">
        ${tags
          .map((tag) => `<span class="badge rounded-pill bg-light text-primary">${tag}</span>`)
          .join("")}
      </div>
    `;
    return card;
  }

  function renderEmptyState() {
    if (!state.emptyState) return;
    elements.empty.innerHTML = `
      <div class="text-center py-5">
        <div class="display-5 text-primary mb-3"><i class="bi bi-people"></i></div>
        <h5 class="fw-semibold mb-2">${state.emptyState.title}</h5>
        <p class="text-muted mb-0">${state.emptyState.description}</p>
      </div>
    `;
  }

  function bindEvents() {
    elements.addBtn.addEventListener("click", () => {
      OJPMS.common.showToast("Prospect creation wizard coming soon.");
    });
  }

  OJPMS.api
    .fetchJSON("data/prospects.json")
    .then(initialize)
    .catch(() => {
      elements.empty.innerHTML =
        "<div class=\"alert alert-danger\">Unable to load prospects.</div>";
    });
})();
