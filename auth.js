const authForm = document.querySelector("#auth-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const loginButton = document.querySelector("#login-button");
const signupButton = document.querySelector("#signup-button");
const logoutButton = document.querySelector("#logout-button");
const authMessage = document.querySelector("#auth-message");

function showMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? "#ff3b30" : "#34c759";
}

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  signupButton.disabled = isLoading;

  loginButton.textContent = isLoading
    ? "Please wait..."
    : "Log In";
}

async function logIn() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  setLoading(true);

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  setLoading(false);

  if (error) {
    showMessage(error.message, true);
    return;
  }

  showMessage("You are logged in.");
  logoutButton.hidden = false;

  const returnTo =
  new URLSearchParams(window.location.search)
    .get("returnTo");

window.location.replace(returnTo || "index.html");
}

async function createAccount() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (password.length < 6) {
    showMessage("Your password must be at least 6 characters.", true);
    return;
  }

  setLoading(true);

  const { error } = await supabaseClient.auth.signUp({
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

async function logOut() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    showMessage(error.message, true);
    return;
  }

  showMessage("You are logged out.");
  logoutButton.hidden = true;
}

authForm.addEventListener("submit", function (event) {
  event.preventDefault();
  logIn();
});

signupButton.addEventListener("click", createAccount);
logoutButton.addEventListener("click", logOut);

async function checkCurrentUser() {
  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    showMessage(`Logged in as ${data.session.user.email}`);
    logoutButton.hidden = false;
  }
}

checkCurrentUser();