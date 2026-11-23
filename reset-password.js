const resetForm =
  document.querySelector("#reset-password-form");

const newPasswordInput =
  document.querySelector("#new-password");

const confirmPasswordInput =
  document.querySelector("#confirm-password");

const resetMessage =
  document.querySelector("#reset-message");

function showResetMessage(
  message,
  isError = false
) {
  resetMessage.textContent = message;
  resetMessage.style.color = isError
    ? "#ff3b30"
    : "#34c759";
}

resetForm.addEventListener(
  "submit",
  async function (event) {
    event.preventDefault();

    const newPassword =
      newPasswordInput.value;

    const confirmPassword =
      confirmPasswordInput.value;

    if (newPassword.length < 8) {
      showResetMessage(
        "Your password must be at least 8 characters.",
        true
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showResetMessage(
        "The passwords do not match.",
        true
      );
      return;
    }

    const { error } =
      await supabaseClient.auth.updateUser({
        password: newPassword
      });

    if (error) {
      showResetMessage(error.message, true);
      return;
    }

    showResetMessage(
      "Password updated. Redirecting to login..."
    );

    setTimeout(function () {
      window.location.replace("auth.html");
    }, 1200);
  }
);