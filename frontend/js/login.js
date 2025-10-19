(function () {
  const OJPMS = window.OJPMS || {};
  if (!OJPMS.api || !OJPMS.common) {
    console.error("OJPMS utilities unavailable");
    return;
  }

  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const feedback = document.getElementById("loginFeedback");
  const help = document.getElementById("loginHelp");
  const title = document.getElementById("loginTitle");
  const subtitle = document.getElementById("loginSubtitle");

  let users = [];

  function renderBanner(data) {
    if (!data) return;
    if (data.title) {
      title.textContent = data.title;
    }
    if (data.subtitle) {
      subtitle.textContent = data.subtitle;
    }
    if (data.help) {
      help.innerHTML = `<a href="${data.help.link}" class="text-decoration-none">${data.help.text}</a>`;
    }
  }

  function validate(credentials) {
    return users.find(
      (user) =>
        user.email.toLowerCase() === credentials.email.toLowerCase() &&
        user.password === credentials.password
    );
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    feedback.textContent = "";

    const credentials = {
      email: emailInput.value.trim(),
      password: passwordInput.value,
    };

    if (!credentials.email || !credentials.password) {
      feedback.textContent = "Enter an email address and password.";
      return;
    }

    const match = validate(credentials);
    if (match) {
      OJPMS.common.showToast(`Welcome back, ${match.name}!`);
      form.reset();
    } else {
      feedback.textContent = "We couldn't find a user with those credentials.";
    }
  });

  OJPMS.api
    .fetchJSON("data/login.json")
    .then((data) => {
      users = data.users || [];
      renderBanner(data.banner);
    })
    .catch(() => {
      feedback.textContent = "Login service temporarily unavailable.";
    });
})();
