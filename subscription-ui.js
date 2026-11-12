const subscriptionFormCard = document.querySelector(
  ".subscription-form-card"
);

const quickAddSubscriptionButton = document.querySelector(
  "#quick-add-subscription-button"
);

const closeSubscriptionModalButton = document.querySelector(
  "#close-subscription-modal"
);

function openSubscriptionForm() {
  document.body.classList.add("subscription-modal-open");

  const nameInput = document.querySelector("#subscription-name");

  setTimeout(function () {
    nameInput.focus();
  }, 250);
}

function closeSubscriptionForm() {
  document.body.classList.remove("subscription-modal-open");
}

if (quickAddSubscriptionButton) {
  quickAddSubscriptionButton.addEventListener("click", function (event) {
    event.preventDefault();
    openSubscriptionForm();
  });
}

if (closeSubscriptionModalButton) {
  closeSubscriptionModalButton.addEventListener(
    "click",
    closeSubscriptionForm
  );
}

document.addEventListener("click", function (event) {
  if (event.target.closest(".subscription-buttons .edit-button")) {
    openSubscriptionForm();
  }
});

document.querySelector("#subscription-form").addEventListener(
  "submit",
  function () {
    setTimeout(function () {
      closeSubscriptionForm();
    }, 0);
  }
);

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeSubscriptionForm();
  }
});
