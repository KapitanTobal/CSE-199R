const subscriptionForm = document.querySelector("#subscription-form");
const nameInput = document.querySelector("#subscription-name");
const amountInput = document.querySelector("#subscription-amount");
const cycleInput = document.querySelector("#billing-cycle");
const dateInput = document.querySelector("#next-payment");
const autopayInput = document.querySelector("#autopay");

const subscriptionList = document.querySelector("#subscription-list");
const totalDisplay = document.querySelector("#subscription-total");
const submitButton = subscriptionForm.querySelector("button[type='submit']");

let subscriptions = [];
let editingId = null;

function monthlyAmount(subscription) {
  const amount = Number(subscription.amount) || 0;

  return subscription.billingCycle === "Yearly"
    ? amount / 12
    : amount;
}

function showEmptyMessage(message) {
  subscriptionList.innerHTML = "";

  const emptyMessage = document.createElement("li");
  emptyMessage.className = "empty-message";
  emptyMessage.textContent = message;

  subscriptionList.appendChild(emptyMessage);
}

async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Unable to get user:", error);
    return null;
  }

  return data.user;
}

async function loadSubscriptions() {
  const user = await getCurrentUser();

  if (!user) {
    showEmptyMessage("Please log in to view your subscriptions.");
    return;
  }

  const { data, error } = await supabaseClient
    .from("subscriptions")
    .select("*")
    .order("next_payment", { ascending: true });

  if (error) {
    console.error("Could not load subscriptions:", error);
    showEmptyMessage("Unable to load subscriptions.");
    return;
  }

  subscriptions = data.map(function (subscription) {
    return {
      id: subscription.id,
      name: subscription.name,
      amount: Number(subscription.amount),
      billingCycle: subscription.billing_cycle,
      nextPayment: subscription.next_payment,
      autopay: subscription.autopay
    };
  });

  renderSubscriptions();
}

function renderSubscriptions() {
  subscriptionList.innerHTML = "";

  if (subscriptions.length === 0) {
    showEmptyMessage("Your subscriptions will appear here after you add one.");
    totalDisplay.textContent = "0.00";
    return;
  }

  let total = 0;

  subscriptions.forEach(function (subscription) {
    total += monthlyAmount(subscription);

    const item = document.createElement("li");
    item.className = "subscription-item";

    const information = document.createElement("div");
    information.className = "subscription-information";

    const name = document.createElement("strong");
    name.textContent = subscription.name;

    const details = document.createElement("span");
    details.textContent =
      `$${subscription.amount.toFixed(2)} ` +
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
      autopayInput.checked = subscription.autopay;

      editingId = subscription.id;
      submitButton.textContent = "Update Subscription";

      nameInput.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", async function () {
      const confirmed = confirm(
        `Delete "${subscription.name}"?`
      );

      if (!confirmed) {
        return;
      }

      const { error } = await supabaseClient
        .from("subscriptions")
        .delete()
        .eq("id", subscription.id);

      if (error) {
        alert("Unable to delete subscription.");
        console.error(error);
        return;
      }

      if (editingId === subscription.id) {
        editingId = null;
        subscriptionForm.reset();
        submitButton.textContent = "Add Subscription";
      }

      await loadSubscriptions();
    });

    information.append(name, details);
    buttons.append(editButton, deleteButton);
    item.append(information, buttons);
    subscriptionList.appendChild(item);
  });

  totalDisplay.textContent = total.toFixed(2);
}

subscriptionForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const user = await getCurrentUser();

  if (!user) {
    alert("Please log in before saving a subscription.");
    return;
  }

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

  const subscriptionData = {
    name,
    amount,
    billing_cycle: billingCycle,
    next_payment: nextPayment,
    autopay
  };

  let result;

  if (editingId) {
    result = await supabaseClient
      .from("subscriptions")
      .update(subscriptionData)
      .eq("id", editingId)
      .select()
      .single();
  } else {
    result = await supabaseClient
      .from("subscriptions")
      .insert({
        ...subscriptionData,
        user_id: user.id
      })
      .select()
      .single();
  }

  if (result.error) {
    alert("Unable to save subscription.");
    console.error(result.error);
    return;
  }

  editingId = null;
  subscriptionForm.reset();
  submitButton.textContent = "Add Subscription";

  await loadSubscriptions();
});

loadSubscriptions();