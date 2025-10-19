(function () {
  const OJPMS = window.OJPMS || {};
  if (!OJPMS.api || !OJPMS.common) {
    console.error("OJPMS utilities unavailable");
    return;
  }

  const state = {
    views: {},
    orderedViews: [],
    quickActions: [],
    filters: {},
    activeView: null,
    searchQuery: "",
    filterSelections: {},
  };

  const elements = {
    tabsContainer: document.getElementById("primaryTabs"),
    quickActions: document.getElementById("quickActions"),
    filterContainer: document.getElementById("filterContainer"),
    contentArea: document.getElementById("contentArea"),
    searchInput: document.getElementById("globalSearch"),
    newRecordBtn: document.getElementById("newRecordBtn"),
    templates: {
      tab: document.getElementById("tabTemplate"),
      quickAction: document.getElementById("quickActionTemplate"),
      filter: document.getElementById("filterTemplate"),
      card: document.getElementById("cardTemplate"),
      detail: document.getElementById("detailTemplate"),
      detailSection: document.getElementById("detailSectionTemplate"),
    },
  };

  function initialize(data) {
    state.quickActions = data.quickActions || [];
    state.filters = data.filters || {};
    state.orderedViews = data.views?.map((view) => view.id) || [];
    state.views = (data.views || []).reduce((acc, view) => {
      acc[view.id] = view;
      return acc;
    }, {});

    if (state.orderedViews.length > 0) {
      state.activeView = state.orderedViews[0];
    }

    renderTabs();
    renderQuickActions();
    renderFilters();
    renderActiveView();
    bindEvents();
  }

  function renderTabs() {
    elements.tabsContainer.innerHTML = "";
    state.orderedViews.forEach((viewId) => {
      const view = state.views[viewId];
      const tabNode = elements.templates.tab.content.firstElementChild.cloneNode(true);
      const button = tabNode.querySelector("[data-tab]");
      button.textContent = view.label;
      button.classList.toggle("active", viewId === state.activeView);
      button.addEventListener("click", () => setActiveView(viewId));
      elements.tabsContainer.appendChild(tabNode);
    });
  }

  function renderQuickActions() {
    elements.quickActions.innerHTML = "";
    state.quickActions.forEach((action) => {
      const actionNode = elements.templates.quickAction.content
        .firstElementChild.cloneNode(true);
      actionNode.textContent = action.label;
      actionNode.title = action.description || action.label;
      actionNode.classList.toggle(
        "quick-action-active",
        action.view === state.activeView
      );
      actionNode.addEventListener("click", () => {
        if (action.href) {
          window.location.href = action.href;
          return;
        }
        if (action.view && state.views[action.view]) {
          setActiveView(action.view);
        }
        if (action.message) {
          OJPMS.common.showToast(action.message);
        }
      });
      elements.quickActions.appendChild(actionNode);
    });
  }

  function renderFilters() {
    elements.filterContainer.innerHTML = "";
    const view = state.views[state.activeView];
    const filters = state.filters[view.id] || [];
    filters.forEach((filter) => {
      const filterNode = elements.templates.filter.content
        .firstElementChild.cloneNode(true);
      const label = filterNode.querySelector("label");
      const select = filterNode.querySelector("select");
      label.textContent = filter.label;
      select.name = filter.id;
      const existingValue = state.filterSelections[filter.id];
      filter.options.forEach((option) => {
        const optionNode = document.createElement("option");
        optionNode.value = option.value;
        optionNode.textContent = option.label;
        if (existingValue !== undefined) {
          optionNode.selected = existingValue === option.value;
        } else if (option.default) {
          optionNode.selected = true;
          state.filterSelections[filter.id] = option.value;
        }
        select.appendChild(optionNode);
      });
      select.addEventListener("change", (event) => {
        state.filterSelections[filter.id] = event.target.value;
        renderActiveView();
      });
      elements.filterContainer.appendChild(filterNode);
    });
  }

  function setActiveView(viewId) {
    if (!state.views[viewId]) return;
    state.activeView = viewId;
    renderTabs();
    renderQuickActions();
    renderFilters();
    renderActiveView();
  }

  function renderActiveView() {
    const view = state.views[state.activeView];
    if (!view) return;
    elements.contentArea.innerHTML = "";

    const filter = state.filterSelections[view.filterKey];
    const filteredItems = applyFilters(view, filter);
    const searchQuery = state.searchQuery.toLowerCase();

    switch (view.type) {
      case "list":
        renderListView(filteredItems, searchQuery, view.emptyState);
        break;
      case "board":
        renderBoardView(filteredItems, searchQuery, view.columns);
        break;
      case "detail":
        renderDetailView(view, searchQuery);
        break;
      default:
        break;
    }
  }

  function applyFilters(view, filterValue) {
    if (!view.items) return [];
    const property = view.filterProperty;
    if (!property || !filterValue) {
      return view.items.slice();
    }
    return view.items.filter((item) => {
      return String(item[property] || "").toLowerCase() === String(filterValue).toLowerCase();
    });
  }

  function renderListView(items, searchQuery, emptyState) {
    const row = document.createElement("div");
    row.className = "row g-4";

    const filteredItems = items.filter((item) =>
      item.title.toLowerCase().includes(searchQuery)
    );

    if (filteredItems.length === 0) {
      renderEmptyState(emptyState);
      return;
    }

    filteredItems.forEach((item) => {
      const col = document.createElement("div");
      col.className = "col-xl-4 col-md-6";
      col.appendChild(createCardNode(item));
      row.appendChild(col);
    });

    elements.contentArea.appendChild(row);
  }

  function renderBoardView(items, searchQuery, columns = []) {
    const row = document.createElement("div");
    row.className = "row g-4";

    columns.forEach((column) => {
      const col = document.createElement("div");
      col.className = "col-xl-4 col-md-6";
      const card = document.createElement("div");
      card.className = "card shadow-sm border-0 h-100";

      const cardBody = document.createElement("div");
      cardBody.className = "card-body";
      const title = document.createElement("h6");
      title.className = "text-uppercase text-muted mb-3";
      title.textContent = column.label;
      cardBody.appendChild(title);

      const columnItems = items
        .filter((item) => item.column === column.id)
        .filter((item) => item.title.toLowerCase().includes(searchQuery));

      if (columnItems.length === 0) {
        const empty = document.createElement("p");
        empty.className = "text-muted small mb-0";
        empty.textContent = "No records in this stage.";
        cardBody.appendChild(empty);
      } else {
        columnItems.forEach((item) => {
          const itemCard = createCardNode(item);
          itemCard.classList.add("mb-3");
          cardBody.appendChild(itemCard);
        });
      }

      card.appendChild(cardBody);
      col.appendChild(card);
      row.appendChild(col);
    });

    elements.contentArea.appendChild(row);
  }

  function renderDetailView(view, searchQuery) {
    if (view.title.toLowerCase().indexOf(searchQuery) === -1 &&
      view.subtitle.toLowerCase().indexOf(searchQuery) === -1) {
      renderEmptyState({
        title: "No matching record",
        description: "Adjust your search to locate the correct profile.",
      });
      return;
    }

    const detailNode = elements.templates.detail.content
      .firstElementChild.cloneNode(true);
    detailNode.querySelector("[data-title]").textContent = view.title;
    detailNode.querySelector("[data-subtitle]").textContent = view.subtitle;
    const badge = detailNode.querySelector("[data-badge]");
    badge.textContent = view.badge.label;
    badge.classList.add(`bg-${view.badge.variant}`);

    const sectionsContainer = detailNode.querySelector("[data-sections]");
    view.sections.forEach((section) => {
      const sectionNode = elements.templates.detailSection.content
        .firstElementChild.cloneNode(true);
      sectionNode.querySelector("h6").textContent = section.label;
      const list = sectionNode.querySelector("ul");
      section.items.forEach((item) => {
        const listItem = document.createElement("li");
        listItem.textContent = item;
        list.appendChild(listItem);
      });
      sectionsContainer.appendChild(sectionNode);
    });

    elements.contentArea.appendChild(detailNode);
  }

  function renderEmptyState(emptyState) {
    const wrapper = document.createElement("div");
    wrapper.className = "text-center py-5";
    const icon = document.createElement("div");
    icon.className = "display-5 text-primary mb-3";
    icon.innerHTML = "<i class=\"bi bi-ui-checks-grid\"></i>";
    const title = document.createElement("h5");
    title.className = "fw-semibold mb-2";
    title.textContent = emptyState?.title || "No records";
    const description = document.createElement("p");
    description.className = "text-muted";
    description.textContent =
      emptyState?.description || "Adjust filters or create a new entry.";
    wrapper.append(icon, title, description);
    elements.contentArea.appendChild(wrapper);
  }

  function createCardNode(item) {
    const cardNode = elements.templates.card.content
      .firstElementChild.cloneNode(true);
    const badge = cardNode.querySelector(".badge");
    const title = cardNode.querySelector(".card-title");
    const subtitle = cardNode.querySelector(".card-subtitle");
    const description = cardNode.querySelector(".card-text");
    const tagsContainer = cardNode.querySelector("[data-tags]");

    title.textContent = item.title;
    subtitle.textContent = item.subtitle;
    description.textContent = item.description;
    badge.textContent = item.badge.label;
    badge.classList.add(`bg-${item.badge.variant}`);

    (item.tags || []).forEach((tag) => {
      const tagNode = document.createElement("span");
      tagNode.className = "badge rounded-pill";
      tagNode.textContent = tag;
      tagsContainer.appendChild(tagNode);
    });

    return cardNode;
  }

  function bindEvents() {
    elements.searchInput.addEventListener("input", (event) => {
      state.searchQuery = event.target.value || "";
      renderActiveView();
    });

    elements.newRecordBtn.addEventListener("click", () => {
      OJPMS.common.showToast("New record workflow coming soon.");
    });
  }
  OJPMS.api
    .fetchJSON("data/dashboard.json")
    .then(initialize)
    .catch(() => {
      OJPMS.common.showToast("Unable to load dashboard data.");
    });
})();
