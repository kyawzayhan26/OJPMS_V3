(function () {
  const OJPMS = window.OJPMS || {};
  if (!OJPMS.api || !OJPMS.common) {
    console.error("OJPMS utilities unavailable");
    return;
  }

  const state = {
    segments: [],
    emptyState: null,
  };

  const elements = {
    segments: document.getElementById("clientSegments"),
    empty: document.getElementById("clientEmptyState"),
  };

  function initialize(data) {
    state.segments = data.segments || [];
    state.emptyState = data.emptyState;
    renderSegments();
  }

  function renderSegments() {
    elements.segments.innerHTML = "";
    elements.empty.innerHTML = "";

    if (!state.segments.length) {
      renderEmptyState();
      return;
    }

    state.segments.forEach((segment) => {
      const col = document.createElement("div");
      col.className = "col-xl-6";
      col.appendChild(createSegmentCard(segment));
      elements.segments.appendChild(col);
    });
  }

  function createSegmentCard(segment) {
    const card = document.createElement("div");
    card.className = "card border-0 shadow-sm h-100";
    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 class="fw-semibold mb-1">${segment.label}</h5>
            <p class="text-muted small mb-0">${segment.description || ""}</p>
          </div>
          <span class="badge bg-light text-dark">${segment.items.length}</span>
        </div>
        <div class="list-group list-group-flush" data-clients></div>
      </div>
    `;

    const list = card.querySelector("[data-clients]");
    if (!segment.items.length) {
      const empty = document.createElement("div");
      empty.className = "list-group-item border-0 px-0 text-muted small";
      empty.textContent = "No clients in this segment.";
      list.appendChild(empty);
    } else {
      segment.items.forEach((client) => {
        const contacts = Array.isArray(client.contacts)
          ? client.contacts.join(", ")
          : client.contacts || "";
        const item = document.createElement("div");
        item.className = "list-group-item border-0 px-0 mb-3 pb-3 client-card";
        item.innerHTML = `
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h6 class="mb-1">${client.name}</h6>
              <p class="text-muted small mb-0">${client.location}</p>
            </div>
            <span class="badge bg-${client.status.variant} rounded-pill">${client.status.label}</span>
          </div>
          <p class="text-muted small mb-2">Contacts: ${contacts}</p>
          <p class="text-muted small mb-0">${client.notes}</p>
        `;
        list.appendChild(item);
      });
    }

    return card;
  }

  function renderEmptyState() {
    if (!state.emptyState) return;
    elements.empty.innerHTML = `
      <div class="text-center py-5">
        <div class="display-5 text-primary mb-3"><i class="bi bi-building"></i></div>
        <h5 class="fw-semibold mb-2">${state.emptyState.title}</h5>
        <p class="text-muted mb-0">${state.emptyState.description}</p>
      </div>
    `;
  }

  OJPMS.api
    .fetchJSON("data/clients.json")
    .then(initialize)
    .catch(() => {
      elements.empty.innerHTML =
        "<div class=\"alert alert-danger\">Unable to load clients.</div>";
    });
})();
