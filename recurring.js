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

let recurringTransactions = [];

async function getRecurringUser() {
  const { data, error } =
    await supabaseClient.auth.getUser();

  if (error) {
    console.error("Could not get user:", error);
    return null;
  }

  return data.user;
}

function getLocalRecurringTransactions() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(
        "recurring-transactions"
      ) || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

async function migrateLocalRecurringTransactions(user) {
  const migrationKey =
    `recurring-migrated-${user.id}`;

  if (localStorage.getItem(migrationKey)) {
    return;
  }

  const localTransactions =
    getLocalRecurringTransactions();

  const { data: existing, error } =
    await supabaseClient
      .from("recurring_transactions")
      .select("id")
      .eq("user_id", user.id);

  if (error) {
    console.error(
      "Could not check recurring transactions:",
      error
    );

    return;
  }

  if (
    (!existing || existing.length === 0) &&
    localTransactions.length > 0
  ) {
    const transactionsToInsert =
      localTransactions.map(function (transaction) {
        return {
          user_id: user.id,
          transaction_type:
            transaction.type || "expense",
          description:
            transaction.description || "Recurring transaction",
          amount: Number(transaction.amount) || 0,
          category:
            transaction.category || "Other",
          frequency:
            transaction.frequency || "Monthly",
          start_date:
            transaction.startDate ||
            new Date().toISOString().slice(0, 10),
          active: transaction.active !== false
        };
      });

    const { error: insertError } =
      await supabaseClient
        .from("recurring_transactions")
        .insert(transactionsToInsert);

    if (insertError) {
      console.error(
        "Could not migrate recurring transactions:",
        insertError
      );

      return;
    }

    alert(
      "Your recurring transactions were imported."
    );
  }

  localStorage.setItem(migrationKey, "true");
}

async function loadRecurringTransactions() {
  const user = await getRecurringUser();

  if (!user) {
    recurringTransactions = [];
    renderRecurringTransactions();
    return;
  }

  await migrateLocalRecurringTransactions(user);

  const { data, error } =
    await supabaseClient
      .from("recurring_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("start_date", {
        ascending: true
      });

  if (error) {
    console.error(
      "Could not load recurring transactions:",
      error
    );

    recurringList.innerHTML = `
      <p class="empty-message">
        Unable to load recurring transactions.
      </p>
    `;

    return;
  }

  recurringTransactions = (data || []).map(
    function (transaction) {
      return {
        id: transaction.id,
        type: transaction.transaction_type,
        description: transaction.description,
        amount: Number(transaction.amount),
        category: transaction.category,
        frequency: transaction.frequency,
        startDate: transaction.start_date,
        active: transaction.active
      };
    }
  );

  /*
    Keep a local copy so Paycheck Planner can
    continue reading recurring transactions.
  */
  localStorage.setItem(
    "recurring-transactions",
    JSON.stringify(recurringTransactions)
  );

  renderRecurringTransactions();
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

  recurringTransactions.forEach(function (transaction) {
    const item = document.createElement("div");
    item.className = "recurring-item";

    const information = document.createElement("div");
    information.className =
      "recurring-information";

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

    deleteButton.addEventListener(
      "click",
      async function () {
        const confirmed = confirm(
          `Delete "${transaction.description}"?`
        );

        if (!confirmed) {
          return;
        }

        const { error } =
          await supabaseClient
            .from("recurring_transactions")
            .delete()
            .eq("id", transaction.id);

        if (error) {
          console.error(error);
          alert(
            "Unable to delete recurring transaction."
          );
          return;
        }

        await loadRecurringTransactions();
      }
    );

    information.append(title, details);
    item.append(information, deleteButton);
    recurringList.appendChild(item);
  });
}

recurringForm.addEventListener(
  "submit",
  async function (event) {
    event.preventDefault();

    const user = await getRecurringUser();

    if (!user) {
      alert(
        "Please log in before saving a recurring transaction."
      );
      return;
    }

    const transactionType = recurringType.value;
    const description =
      recurringDescription.value.trim();
    const amount = Number(recurringAmount.value);
    const category = recurringCategory.value;
    const frequency = recurringFrequency.value;
    const startDate = recurringStartDate.value;

    if (!transactionType) {
      alert("Please choose a transaction type.");
      return;
    }

    if (!description) {
      alert("Please enter a description.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (!frequency) {
      alert("Please choose a schedule.");
      return;
    }

    if (!startDate) {
      alert("Please choose a starting date.");
      return;
    }

    const { error } =
      await supabaseClient
        .from("recurring_transactions")
        .insert({
          user_id: user.id,
          transaction_type: transactionType,
          description,
          amount,
          category,
          frequency,
          start_date: startDate,
          active: true
        });

    if (error) {
      console.error(error);
      alert(
        "Unable to save recurring transaction."
      );
      return;
    }

    recurringForm.reset();
    await loadRecurringTransactions();

    alert("Recurring transaction saved.");
  }
);

loadRecurringTransactions();