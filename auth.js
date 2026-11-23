const authForm = document.querySelector("#auth-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const loginButton = document.querySelector("#login-button");
const signupButton = document.querySelector("#signup-button");
const logoutButton = document.querySelector("#logout-button");
const forgotPasswordButton =
  document.querySelector("#forgot-password-button");
const authMessage = document.querySelector("#auth-message");

function showMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.color = isError
    ? "#ff3b30"
    : "#34c759";
}

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  signupButton.disabled = isLoading;

  if (forgotPasswordButton) {
    forgotPasswordButton.disabled = isLoading;
  }

  loginButton.textContent = isLoading
    ? "Please wait..."
    : "Log In";
}

function getSafeReturnTo() {
  const returnTo =
    new URLSearchParams(window.location.search)
      .get("returnTo");

  if (!returnTo) {
    return "index.html";
  }

  try {
    const destination = new URL(
      returnTo,
      window.location.origin
    );

    // Only allow redirects to this same website.
    if (
      destination.origin !==
      window.location.origin
    ) {
      return "index.html";
    }

    return (
      destination.pathname +
      destination.search +
      destination.hash
    );
  } catch {
    return "index.html";
  }
}

async function logIn() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage(
      "Please enter your email and password.",
      true
    );
    return;
  }

  setLoading(true);

  const { error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  setLoading(false);

  if (error) {
    showMessage(error.message, true);
    return;
  }

  showMessage("You are logged in.");

  if (logoutButton) {
    logoutButton.hidden = false;
  }

  window.location.replace(
    getSafeReturnTo()
  );
}

async function createAccount() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage(
      "Please enter your email and password.",
      true
    );
    return;
  }

  if (password.length < 8) {
    showMessage(
      "Your password must be at least 8 characters.",
      true
    );
    return;
  }

  setLoading(true);

  const { error } =
    await supabaseClient.auth.signUp({
      email,
      password
    });

  setLoading(false);

  if (error) {
    showMessage(error.message, true);
    return;
  }

  showMessage(
    "Account created. Check your email if confirmation is required."
  );
}

async function resetPassword() {
  const email = emailInput.value.trim();

  if (!email) {
    showMessage(
      "Enter your email address first.",
      true
    );
    return;
  }

  if (forgotPasswordButton) {
    forgotPasswordButton.disabled = true;
    forgotPasswordButton.textContent =
      "Sending...";
  }

  const resetPageUrl =
    new URL(
      "reset-password.html",
      window.location.href
    ).href;

  const { error } =
    await supabaseClient.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: resetPageUrl
      }
    );

  if (forgotPasswordButton) {
    forgotPasswordButton.disabled = false;
    forgotPasswordButton.textContent =
      "Forgot password?";
  }

  if (error) {
    showMessage(error.message, true);
    return;
  }

  showMessage(
    "Password reset instructions were sent to your email."
  );
}

async function logOut() {
  const { error } =
    await supabaseClient.auth.signOut();

  if (error) {
    showMessage(error.message, true);
    return;
  }

  showMessage("You are logged out.");

  if (logoutButton) {
    logoutButton.hidden = true;
  }
}

authForm.addEventListener(
  "submit",
  function (event) {
    event.preventDefault();
    logIn();
  }
);

signupButton.addEventListener(
  "click",
  createAccount
);

if (forgotPasswordButton) {
  forgotPasswordButton.addEventListener(
    "click",
    resetPassword
  );
}

if (logoutButton) {
  logoutButton.addEventListener(
    "click",
    logOut
  );
}

async function checkCurrentUser() {
  const { data } =
    await supabaseClient.auth.getSession();

  if (data.session) {
    showMessage(
      `Logged in as ${data.session.user.email}`
    );

    if (logoutButton) {
      logoutButton.hidden = false;
    }
  }
}

checkCurrentUser();