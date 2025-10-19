(function (global) {
  const OJPMS = (global.OJPMS = global.OJPMS || {});

  function markActiveNav() {
    const page = document.body.dataset.page;
    const links = document.querySelectorAll("[data-nav]");
    links.forEach((link) => {
      const target = link.getAttribute("data-nav");
      if (target === page) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  function showToast(message, options = {}) {
    const toast = document.createElement("div");
    toast.className =
      "toast align-items-center text-bg-dark border-0 position-fixed top-0 end-0 m-3";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, {
      delay: options.delay || 2500,
    });
    toast.addEventListener("hidden.bs.toast", () => toast.remove());
    bsToast.show();
  }

  function formatDate(input) {
    if (!input) return "";
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) {
      return input;
    }
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(input) {
    if (!input) return "";
    const date = new Date(`1970-01-01T${input}`);
    if (Number.isNaN(date.getTime())) {
      return input;
    }
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  document.addEventListener("DOMContentLoaded", markActiveNav);

  OJPMS.common = {
    showToast,
    formatDate,
    formatTime,
  };
})(window);
