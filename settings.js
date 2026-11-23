const settingsEmail =
  document.querySelector("#settings-email");

const settingsLogoutButton =
  document.querySelector("#settings-logout-button");

async function loadSettingsPage() {
  const { data, error } =
    await supabaseClient.auth.getUser();

  if (error || !data.user) {
    window.location.replace("auth.html");
    return;
  }

  settingsEmail.textContent =
    data.user.email;
}

settingsLogoutButton.addEventListener(
  "click",
  async function () {
    settingsLogoutButton.disabled = true;
    settingsLogoutButton.textContent =
      "Logging out...";

    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      alert(error.message);
      settingsLogoutButton.disabled = false;
      settingsLogoutButton.textContent =
        "Log Out";
      return;
    }

    window.location.replace("auth.html");
  }
);

loadSettingsPage();