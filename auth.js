const authForm = document.querySelector("#auth-form");
const displayNameInput = document.querySelector("#display-name");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const loginButton = document.querySelector("#login-button");
const signupButton = document.querySelector("#signup-button");
const forgotPasswordButton = document.querySelector(
  "#forgot-password-button"
);
const logoutButton = document.querySelector("#logout-button");
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
  forgotPasswordButton.disabled = isLoading;

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

  window.location.replace(getSafeReturnTo());
}

async function createAccount() {
  const displayName =
    displayNameInput.value.trim();

  const email =
    emailInput.value.trim();

  const password =
    passwordInput.value;

  if (!displayName) {
    showMessage("Please enter your name.", true);
    return;
  }

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
      password,
      options: {
        data: {
          full_name: displayName
        }
      }
    });

  setLoading(false);

  if (error) {
    if (
      error.code === "over_email_send_rate_limit" ||
      error.message.toLowerCase().includes("rate limit")
    ) {
      showMessage(
        "Too many sign-up attempts. Please try again later.",
        true
      );
    } else {
      showMessage(error.message, true);
    }

    return;
  }

  showMessage("Account created successfully.");
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

  forgotPasswordButton.disabled = true;
  forgotPasswordButton.textContent = "Sending...";

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

  forgotPasswordButton.disabled = false;
  forgotPasswordButton.textContent =
    "Forgot password?";

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

  authForm.hidden = false;
  logoutButton.hidden = true;
  showMessage("You are logged out.");
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

forgotPasswordButton.addEventListener(
  "click",
  resetPassword
);

logoutButton.addEventListener(
  "click",
  logOut
);

async function checkCurrentUser() {
  const { data } =
    await supabaseClient.auth.getSession();

  if (!data.session) {
    return;
  }

  authForm.hidden = true;
  logoutButton.hidden = false;

  showMessage(
    `Logged in as ${data.session.user.email}`
  );
}

checkCurrentUser();