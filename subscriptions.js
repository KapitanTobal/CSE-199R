const subscriptionForm = document.querySelector("#subscription-form");
const nameInput = document.querySelector("#subscription-name");
const amountInput = document.querySelector("#subscription-amount");
const cycleInput = document.querySelector("#billing-cycle");
const dateInput = document.querySelector("#next-payment");
const autopayInput = document.querySelector("#autopay");

const subscriptionList = document.querySelector("#subscription-list");
const totalDisplay = document.querySelector("#subscription-total");

let subscriptions = readSubscriptions();
let editingIndex = null;

function readSubscriptions() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("subscriptions") || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveSubscriptions() {
  localStorage.setItem(
    "subscriptions",
    JSON.stringify(subscriptions)
  );
}

function monthlyAmount(subscription) {
  const amount = Number(subscription.amount) || 0;

  return subscription.billingCycle === "Yearly"
    ? amount / 12
    : amount;
}

function renderSubscriptions() {
  subscriptionList.innerHTML = "";

  if (subscriptions.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent =
      "Your subscriptions will appear here after you add one.";
    subscriptionList.appendChild(emptyMessage);
  }

  let total = 0;

  subscriptions.forEach(function (subscription, index) {
    total += monthlyAmount(subscription);

    const item = document.createElement("li");
    item.className = "subscription-item";

    const information = document.createElement("div");
    information.className = "subscription-information";

    const name = document.createElement("strong");
    name.textContent = subscription.name;

    const details = document.createElement("span");
    details.textContent =
      `$${Number(subscription.amount).toFixed(2)} ` +
      `${subscription.billingCycle} • ` +
      `Next payment: ${subscription.nextPayment} • ` +
      `${subscription.autopay ? "Autopay on" : "Autopay off"}`;

    const buttons = document.createElement("div");
    buttons.className = "subscription-buttons";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.textContent = "Edit";

    editButton.addEventListener("click", function () {
      nameInput.value = subscription.name;
      amountInput.value = subscription.amount;
      cycleInput.value = subscription.billingCycle;
      dateInput.value = subscription.nextPayment;
      autopayInput.checked = Boolean(subscription.autopay);
      editingIndex = index;
      subscriptionForm.querySelector("button[type='submit']").textContent =
        "Update Subscription";
      nameInput.focus();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", function () {
      subscriptions.splice(index, 1);
      editingIndex = null;
      saveSubscriptions();
      renderSubscriptions();
    });

    information.append(name, details);
    buttons.append(editButton, deleteButton);
    item.append(information, buttons);
    subscriptionList.appendChild(item);
  });

  totalDisplay.textContent = total.toFixed(2);
}

subscriptionForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  const amount = Number(amountInput.value);
  const billingCycle = cycleInput.value;
  const nextPayment = dateInput.value;
  const autopay = autopayInput.checked;

  if (!name) {
    alert("Please enter a subscription name.");
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }

  if (!billingCycle) {
    alert("Please choose a billing cycle.");
    return;
  }

  if (!nextPayment) {
    alert("Please choose a payment date.");
    return;
  }

  const subscription = {
    id: editingIndex === null
      ? Date.now()
      : subscriptions[editingIndex].id || Date.now(),
    name,
    amount,
    billingCycle,
    nextPayment,
    autopay
  };

  if (editingIndex === null) {
    subscriptions.push(subscription);
  } else {
    subscriptions[editingIndex] = subscription;
    editingIndex = null;
  }

  saveSubscriptions();
  renderSubscriptions();
  subscriptionForm.reset();
  subscriptionForm.querySelector("button[type='submit']").textContent =
    "Add Subscription";
});

renderSubscriptions();
