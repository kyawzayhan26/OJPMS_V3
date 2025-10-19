(function () {
  const OJPMS = window.OJPMS || {};
  if (!OJPMS.api) {
    console.error("OJPMS utilities unavailable");
    return;
  }

  const elements = {
    summary: document.getElementById("clientSummary"),
    title: document.getElementById("clientDetailTitle"),
    subtitle: document.getElementById("clientDetailSubtitle"),
    badge: document.getElementById("clientDetailBadge"),
    sections: document.getElementById("clientDetailSections"),
  };

  function initialize(data) {
    if (!data) return;
    renderSummary(data.summary || []);
    renderHeader(data);
    renderSections(data.sections || []);
  }

  function renderSummary(metrics) {
    elements.summary.innerHTML = "";
    if (!metrics.length) return;

    metrics.forEach((metric) => {
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
      elements.summary.appendChild(col);
    });
  }

  function renderHeader(data) {
    elements.title.textContent = data.name || "";
    elements.subtitle.textContent = data.subtitle || "";
    if (data.badge) {
      elements.badge.textContent = data.badge.label;
      elements.badge.className = `badge rounded-pill bg-${data.badge.variant}`;
    }
  }

  function renderSections(sections) {
    elements.sections.innerHTML = "";
    sections.forEach((section) => {
      const col = document.createElement("div");
      col.className = "col-lg-4";
      col.innerHTML = `
        <div>
          <h6 class="text-uppercase text-muted small mb-2">${section.label}</h6>
          <ul class="list-unstyled mb-0 small"></ul>
        </div>
      `;
      const list = col.querySelector("ul");
      (section.items || []).forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      elements.sections.appendChild(col);
    });
  }

  OJPMS.api
    .fetchJSON("data/client-detail.json")
    .then(initialize)
    .catch(() => {
      elements.sections.innerHTML =
        "<div class=\"alert alert-danger\">Unable to load client detail.</div>";
    });
})();
