const recurringForm = document.querySelector("#recurring-form");
const recurringType = document.querySelector("#recurring-type");
const recurringDescription = document.querySelector(
  "#recurring-description"
);
const recurringAmount = document.querySelector("#recurring-amount");
const recurringCategory = document.querySelector("#recurring-category");
const recurringFrequency = document.querySelector(
  "#recurring-frequency"
);
const recurringStartDate = document.querySelector(
  "#recurring-start-date"
);
const recurringList = document.querySelector("#recurring-list");

let recurringTransactions = JSON.parse(
  localStorage.getItem("recurring-transactions") || "[]"
);

function saveRecurringTransactions() {
  localStorage.setItem(
    "recurring-transactions",
    JSON.stringify(recurringTransactions)
  );
}

function renderRecurringTransactions() {
  recurringList.innerHTML = "";

  if (recurringTransactions.length === 0) {
    const message = document.createElement("p");

    message.className = "empty-message";
    message.textContent =
      "Your recurring transactions will appear here.";

    recurringList.appendChild(message);
    return;
  }

  recurringTransactions.forEach(function (transaction, index) {
    const item = document.createElement("div");
    item.className = "recurring-item";

    const information = document.createElement("div");
    information.className = "recurring-information";

    const title = document.createElement("strong");
    title.textContent = transaction.description;

    const details = document.createElement("span");
    details.textContent =
      `${transaction.type} • ` +
      `$${Number(transaction.amount).toFixed(2)} • ` +
      `${transaction.frequency} • ` +
      `Starts ${transaction.startDate}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", function () {
      recurringTransactions.splice(index, 1);

      saveRecurringTransactions();
      renderRecurringTransactions();
    });

    information.append(title, details);
    item.append(information, deleteButton);
    recurringList.appendChild(item);
  });
}

recurringForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const transaction = {
    id: Date.now(),
    type: recurringType.value,
    description: recurringDescription.value.trim(),
    amount: Number(recurringAmount.value),
    category: recurringCategory.value,
    frequency: recurringFrequency.value,
    startDate: recurringStartDate.value,
    active: true
  };

  if (transaction.type === "") {
    alert("Please choose a transaction type.");
    return;
  }

  if (transaction.description === "") {
    alert("Please enter a description.");
    return;
  }

  if (
    !Number.isFinite(transaction.amount) ||
    transaction.amount <= 0
  ) {
    alert("Please enter a valid amount.");
    return;
  }

  if (transaction.frequency === "") {
    alert("Please choose a schedule.");
    return;
  }

  if (transaction.startDate === "") {
    alert("Please choose a starting date.");
    return;
  }

  recurringTransactions.push(transaction);

  saveRecurringTransactions();
  renderRecurringTransactions();

  recurringForm.reset();

  alert("Recurring transaction saved.");
});

renderRecurringTransactions();