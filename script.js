let monthlyIncome = 0;
let monthlyBudgetLimit = 0;
let expenses = [];
let selectedMonth = new Date();
let editingId = null;

const incomeForm = document.querySelector("#income-form");
const incomeInput = document.querySelector("#income");
const totalIncomeDisplay = document.querySelector("#total-income");
const budgetLimitInput = document.querySelector("#budget-limit");
const budgetLimitDisplay = document.querySelector("#budget-limit-display");

const expenseForm = document.querySelector("#expense-form");
const expenseDescriptionInput = document.querySelector("#expense-description");
const expenseAmountInput = document.querySelector("#expense-amount");
const categoryInput = document.querySelector("#category");
const expenseDateInput = document.querySelector("#expense-date");
const totalExpensesDisplay = document.querySelector("#total-expenses");
const remainingBudgetDisplay = document.querySelector("#remaining-budget");
const budgetStatus = document.querySelector("#budget-status");
const expenseList = document.querySelector("#expense-list");
const expenseSubmitButton = expenseForm.querySelector(
  'button[type="submit"]'
);

const emptyAddExpenseButton = document.querySelector(
  "#empty-add-expense-button"
);

const closeExpenseModalButton = document.querySelector(
  "#close-expense-modal"
);

const currentMonthDisplay = document.querySelector("#current-month");
const previousMonthButton = document.querySelector("#previous-month");
const nextMonthButton = document.querySelector("#next-month");

const categoryBreakdown = document.querySelector("#category-breakdown");
const gaugeProgress = document.querySelector("#gauge-progress");
const budgetPercent = document.querySelector("#budget-percent");
const gaugeDetails = document.querySelector("#gauge-details");

const savingsForm = document.querySelector("#savings-form");
const savingsNameInput = document.querySelector("#savings-name");
const savingsTargetInput = document.querySelector("#savings-target");
const savingsCurrentInput = document.querySelector("#savings-current");
const savingsGoalsList = document.querySelector("#savings-goals-list");
const addSavingsGoalButton = document.querySelector(
  "#add-savings-goal-button"
);
const savingsSubmitButton = document.querySelector(
  "#savings-submit-button"
);

let savingsGoals = [];
let editingSavingsIndex = null;

function getMonthKey() {
  const year = selectedMonth.getFullYear();
  const month = String(
    selectedMonth.getMonth() + 1
  ).padStart(2, "0");

  return `${year}-${month}`;
}

function getTodayString() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMoney(amount) {
  return Number(amount || 0).toFixed(2);
}

function displaySelectedMonth() {
  currentMonthDisplay.textContent =
    selectedMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });
}

async function getCurrentUser() {
  const { data, error } =
    await supabaseClient.auth.getUser();

  if (error) {
    console.error("Could not get current user:", error);
    return null;
  }

  return data.user;
}

function getLocalMonthData() {
  try {
    const saved = localStorage.getItem(
      `budget-${getMonthKey()}`
    );

    if (!saved) {
      return null;
    }

    const data = JSON.parse(saved);

    return {
      income: Number(data.income) || 0,
      budgetLimit: Number(data.budgetLimit) || 0,
      expenses: Array.isArray(data.expenses)
        ? data.expenses
        : []
    };
  } catch {
    return null;
  }
}

async function migrateLocalMonthIfNeeded(user) {
  const migrationKey =
    `supabase-migrated-${user.id}-${getMonthKey()}`;

  if (localStorage.getItem(migrationKey)) {
    return;
  }

  const localData = getLocalMonthData();

  if (!localData) {
    localStorage.setItem(migrationKey, "true");
    return;
  }

  const { data: cloudBudget } = await supabaseClient
    .from("budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq("month_key", getMonthKey())
    .maybeSingle();

  const { data: cloudExpenses } = await supabaseClient
    .from("expenses")
    .select("id")
    .eq("user_id", user.id)
    .eq("month_key", getMonthKey());

  const hasCloudData =
    cloudBudget ||
    (cloudExpenses && cloudExpenses.length > 0);

  if (!hasCloudData) {
    if (
      localData.income > 0 ||
      localData.budgetLimit > 0
    ) {
      await supabaseClient
        .from("budgets")
        .upsert(
          {
            user_id: user.id,
            month_key: getMonthKey(),
            income: localData.income,
            budget_limit: localData.budgetLimit
          },
          {
            onConflict: "user_id,month_key"
          }
        );
    }

    if (localData.expenses.length > 0) {
      const expensesToInsert =
        localData.expenses.map(function (expense) {
          return {
            user_id: user.id,
            month_key: getMonthKey(),
            description:
              expense.description ||
              expense.category ||
              "Expense",
            amount: Number(expense.amount) || 0,
            category: expense.category || "Other",
            expense_date:
              expense.date || getTodayString()
          };
        });

      await supabaseClient
        .from("expenses")
        .insert(expensesToInsert);
    }

    showMessage("Your existing budget data was imported.");
  }

  localStorage.setItem(migrationKey, "true");
}

async function loadCurrentMonth() {
  const user = await getCurrentUser();

  if (!user) {
    monthlyIncome = 0;
    monthlyBudgetLimit = 0;
    expenses = [];

    displaySelectedMonth();
    renderExpenses();
    updateBudgetDisplay();

    budgetStatus.textContent =
      "Please log in to load your budget.";

    return;
  }

  await migrateLocalMonthIfNeeded(user);

  const { data: budget, error: budgetError } =
    await supabaseClient
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("month_key", getMonthKey())
      .maybeSingle();

  if (budgetError) {
    console.error("Could not load budget:", budgetError);
  }

  const { data: cloudExpenses, error: expenseError } =
    await supabaseClient
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .eq("month_key", getMonthKey())
      .order("expense_date", {
        ascending: false
      });

  if (expenseError) {
    console.error(
      "Could not load expenses:",
      expenseError
    );
  }

  monthlyIncome = Number(budget?.income) || 0;
  monthlyBudgetLimit =
    Number(budget?.budget_limit) || 0;

  expenses = (cloudExpenses || []).map(function (expense) {
    return {
      id: expense.id,
      description: expense.description,
      amount: Number(expense.amount),
      category: expense.category,
      date: expense.expense_date
    };
  });

  editingId = null;
  displaySelectedMonth();
  renderExpenses();
  updateBudgetDisplay();
}

async function saveBudget() {
  const user = await getCurrentUser();

  if (!user) {
    alert("Please log in before saving your budget.");
    return false;
  }

  const { error } = await supabaseClient
    .from("budgets")
    .upsert(
      {
        user_id: user.id,
        month_key: getMonthKey(),
        income: monthlyIncome,
        budget_limit: monthlyBudgetLimit
      },
      {
        onConflict: "user_id,month_key"
      }
    );

  if (error) {
    console.error("Could not save budget:", error);
    alert("Unable to save your budget.");
    return false;
  }

  return true;
}

function updateBudgetDisplay() {
  const totalExpenses = expenses.reduce(
    function (total, expense) {
      return total + Number(expense.amount || 0);
    },
    0
  );

  const remainingBudget =
    monthlyIncome - totalExpenses;

  totalIncomeDisplay.textContent =
    formatMoney(monthlyIncome);

  budgetLimitDisplay.textContent =
    formatMoney(monthlyBudgetLimit);

  totalExpensesDisplay.textContent =
    formatMoney(totalExpenses);

  remainingBudgetDisplay.textContent =
    formatMoney(remainingBudget);

  const budgetAmount =
    monthlyBudgetLimit > 0
      ? monthlyBudgetLimit
      : monthlyIncome;

  const percentUsed =
    budgetAmount > 0
      ? (totalExpenses / budgetAmount) * 100
      : 0;

  const displayPercent = Math.round(percentUsed);
  const gaugePercent = Math.min(percentUsed, 100);
  const gaugeLength = 251.2;

  const dashOffset =
    gaugeLength -
    (gaugePercent / 100) * gaugeLength;

  gaugeProgress.style.strokeDashoffset =
    dashOffset;

  let gaugeColor = "#34c759";

  if (percentUsed >= 100) {
    gaugeColor = "#ff3b30";
  } else if (percentUsed >= 85) {
    gaugeColor = "#ff9500";
  } else if (percentUsed >= 70) {
    gaugeColor = "#ffcc00";
  }

  gaugeProgress.style.stroke = gaugeColor;

  if (budgetAmount <= 0) {
    budgetPercent.textContent = "Add budget";
  } else if (totalExpenses === 0) {
    budgetPercent.textContent = "No spending yet";
  } else {
    budgetPercent.textContent =
      `${displayPercent}% used`;
  }

  gaugeDetails.textContent =
    `$${formatMoney(totalExpenses)} spent of ` +
    `$${formatMoney(budgetAmount)}`;

  if (
    monthlyIncome === 0 &&
    monthlyBudgetLimit === 0 &&
    totalExpenses === 0
  ) {
    budgetStatus.textContent =
      "Enter your income and monthly budget to begin.";
  } else if (remainingBudget < 0) {
    budgetStatus.textContent =
      `Over budget by $${formatMoney(
        Math.abs(remainingBudget)
      )}.`;
  } else {
    budgetStatus.textContent =
      "You are within your budget.";
  }

  renderCategoryBreakdown();
}

function getCategoryIcon(category) {
  const icons = {
    Food: "🍔",
    Housing: "🏠",
    Transportation: "🚗",
    Bills: "🧾",
    Shopping: "🛍️",
    Entertainment: "🎬",
    School: "🎓",
    Other: "•"
  };

  return icons[category] || "•";
}

function formatExpenseDate(dateString) {
  if (!dateString) {
    return "Date not provided";
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Date not provided";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function closeActionMenus(exceptActions) {
  document
    .querySelectorAll(".card-actions")
    .forEach(function (actions) {
      if (actions !== exceptActions) {
        actions.hidden = true;
        actions.classList.remove("is-open");
      }
    });
}

function focusExpenseForm() {
  document.body.classList.add(
    "expense-modal-open"
  );

  setTimeout(function () {
    expenseDescriptionInput.focus();
  }, 250);
}

function closeExpenseForm() {
  document.body.classList.remove(
    "expense-modal-open"
  );
}

function resetExpenseForm() {
  editingId = null;
  expenseForm.reset();
  expenseDateInput.value = getTodayString();
  expenseSubmitButton.textContent = "Add Expense";
}

function renderExpenses() {
  expenseList.innerHTML = "";

  if (expenses.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className =
      "empty-message expense-empty-state";

    const message = document.createElement("span");
    message.textContent =
      "Add your first expense to see your progress.";

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "small-button";
    addButton.textContent = "Add Expense";

    addButton.addEventListener(
      "click",
      focusExpenseForm
    );

    emptyMessage.append(message, addButton);
    expenseList.appendChild(emptyMessage);

    return;
  }

  expenses.forEach(function (expense) {
    const listItem = document.createElement("li");
    listItem.className = "expense-item";

    const info = document.createElement("div");
    info.className = "expense-info";

    const description = document.createElement("strong");
    description.className = "expense-description";
    description.textContent =
      expense.description || expense.category;

    const details = document.createElement("span");
    details.className = "expense-details";
    details.textContent =
      `${getCategoryIcon(expense.category)} ` +
      `${expense.category} • ` +
      `${formatExpenseDate(expense.date)}`;

    const amount = document.createElement("strong");
    amount.className = "expense-amount";
    amount.textContent =
      `$${formatMoney(expense.amount)}`;

    info.append(description, details);

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "more-button";
    menuButton.textContent = "•••";
    menuButton.setAttribute(
      "aria-label",
      `More options for ${
        expense.description || expense.category
      }`
    );

    const actions = document.createElement("div");
    actions.className =
      "card-actions expense-actions";
    actions.hidden = true;

    menuButton.addEventListener(
      "click",
      function (event) {
        event.stopPropagation();

        closeActionMenus(actions);

        actions.hidden = !actions.hidden;
        actions.classList.toggle(
          "is-open",
          !actions.hidden
        );

        menuButton.setAttribute(
          "aria-expanded",
          String(!actions.hidden)
        );
      }
    );

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.textContent = "Edit";

    editButton.addEventListener(
      "click",
      function () {
        expenseDescriptionInput.value =
          expense.description || "";

        expenseAmountInput.value =
          formatMoney(expense.amount);

        categoryInput.value =
          expense.category;

        expenseDateInput.value =
          expense.date || getTodayString();

        editingId = expense.id;
        expenseSubmitButton.textContent =
          "Update Expense";

        focusExpenseForm();
      }
    );

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener(
      "click",
      async function () {
        const confirmed = confirm(
          "Delete this expense?"
        );

        if (!confirmed) {
          return;
        }

        const { error } = await supabaseClient
          .from("expenses")
          .delete()
          .eq("id", expense.id);

        if (error) {
          console.error(error);
          alert("Unable to delete expense.");
          return;
        }

        await loadCurrentMonth();
        showMessage("Expense deleted.");
      }
    );

    actions.append(editButton, deleteButton);
    listItem.append(
      info,
      amount,
      menuButton,
      actions
    );

    expenseList.appendChild(listItem);
  });
}

function renderCategoryBreakdown() {
  categoryBreakdown.innerHTML = "";

  if (expenses.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent =
      "Add expenses to see your spending breakdown.";

    categoryBreakdown.appendChild(message);
    return;
  }

  const totals = {};

  expenses.forEach(function (expense) {
    const category = expense.category || "Other";

    totals[category] =
      (totals[category] || 0) +
      Number(expense.amount || 0);
  });

  const largestAmount = Math.max(
    ...Object.values(totals)
  );

  Object.entries(totals)
    .sort(function (a, b) {
      return b[1] - a[1];
    })
    .forEach(function ([category, amount]) {
      const row = document.createElement("div");
      row.className = "category-row";

      const header = document.createElement("div");
      header.className = "category-header";

      const name = document.createElement("span");
      name.textContent =
        `${getCategoryIcon(category)} ${category}`;

      const categoryAmount =
        document.createElement("span");

      categoryAmount.className = "category-amount";
      categoryAmount.textContent =
        `$${formatMoney(amount)}`;

      header.append(name, categoryAmount);

      const bar = document.createElement("div");
      bar.className = "category-bar";

      const fill = document.createElement("div");
      fill.className = "category-fill";

      fill.style.width =
        `${(amount / largestAmount) * 100}%`;

      bar.appendChild(fill);
      row.append(header, bar);
      categoryBreakdown.appendChild(row);
    });
}

incomeForm.addEventListener(
  "submit",
  async function (event) {
    event.preventDefault();

    const income = Number(incomeInput.value);
    const budget = Number(budgetLimitInput.value);

    if (!Number.isFinite(income) || income <= 0) {
      alert("Please enter a valid income amount.");
      return;
    }

    if (!Number.isFinite(budget) || budget <= 0) {
      alert("Please enter a valid monthly budget.");
      return;
    }

    monthlyIncome = income;
    monthlyBudgetLimit = budget;

    const saved = await saveBudget();

    if (!saved) {
      return;
    }

    updateBudgetDisplay();
    showMessage("Income and budget saved.");
  }
);

expenseForm.addEventListener(
  "submit",
  async function (event) {
    event.preventDefault();

    const user = await getCurrentUser();

    if (!user) {
      alert("Please log in before saving expenses.");
      return;
    }

    const description =
      expenseDescriptionInput.value.trim();

    const amount = Number(
      expenseAmountInput.value
    );

    const category = categoryInput.value;
    const date = expenseDateInput.value;

    if (!description) {
      alert("Please enter an expense description.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid expense amount.");
      return;
    }

    if (!category) {
      alert("Please choose a category.");
      return;
    }

    if (!date) {
      alert("Please choose an expense date.");
      return;
    }

    const expenseData = {
      user_id: user.id,
      month_key: getMonthKey(),
      description,
      amount,
      category,
      expense_date: date
    };

    let result;

    if (editingId) {
      result = await supabaseClient
        .from("expenses")
        .update({
          description,
          amount,
          category,
          expense_date: date
        })
        .eq("id", editingId);
    } else {
      result = await supabaseClient
        .from("expenses")
        .insert(expenseData);
    }

    if (result.error) {
      console.error(result.error);
      alert("Unable to save expense.");
      return;
    }

    resetExpenseForm();
    closeExpenseForm();
    await loadCurrentMonth();

    showMessage(
      editingId
        ? "Expense updated."
        : "Expense added."
    );
  }
);

previousMonthButton.addEventListener(
  "click",
  async function () {
    selectedMonth.setMonth(
      selectedMonth.getMonth() - 1
    );

    await loadCurrentMonth();
  }
);

nextMonthButton.addEventListener(
  "click",
  async function () {
    selectedMonth.setMonth(
      selectedMonth.getMonth() + 1
    );

    await loadCurrentMonth();
  }
);

if (emptyAddExpenseButton) {
  emptyAddExpenseButton.addEventListener(
    "click",
    focusExpenseForm
  );
}

if (closeExpenseModalButton) {
  closeExpenseModalButton.addEventListener(
    "click",
    closeExpenseForm
  );
}

document.addEventListener(
  "keydown",
  function (event) {
    if (event.key === "Escape") {
      closeExpenseForm();
    }
  }
);

/* Savings goals remain locally stored for now */

function saveSavingsGoals() {
  localStorage.setItem(
    "savings-goals",
    JSON.stringify(savingsGoals)
  );
}

function loadSavingsGoals() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("savings-goals") || "[]"
    );

    savingsGoals = Array.isArray(saved)
      ? saved
      : [];
  } catch {
    savingsGoals = [];
  }

  renderSavingsGoals();
}

function renderSavingsGoals() {
  savingsGoalsList.innerHTML = "";

  if (savingsGoals.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent =
      "Add a savings goal to start tracking your progress.";

    savingsGoalsList.appendChild(message);
    return;
  }

  savingsGoals.forEach(function (goal, index) {
    const target = Number(goal.target) || 0;
    const current = Number(goal.current) || 0;

    const percentage =
      target > 0
        ? Math.min(Math.round(
            (current / target) * 100
          ), 100)
        : 0;

    const card = document.createElement("div");
    card.className = "savings-goal-card";

    const title = document.createElement("h3");
    title.textContent = goal.name;

    const amounts = document.createElement("div");
    amounts.className = "savings-amounts";
    amounts.innerHTML =
      `<span>$${formatMoney(current)} saved</span>` +
      `<span>Goal: $${formatMoney(target)}</span>`;

    const progressBar = document.createElement("div");
    progressBar.className =
      "savings-progress-bar";

    const progressFill = document.createElement("div");
    progressFill.className =
      "savings-progress-fill";

    progressFill.style.width =
      `${percentage}%`;

    progressBar.appendChild(progressFill);

    const percent = document.createElement("p");
    percent.className =
      "savings-progress-percent";

    percent.textContent =
      `${percentage}% complete`;

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "more-button";
    menuButton.textContent = "•••";

    const actions = document.createElement("div");
    actions.className =
      "card-actions savings-buttons";
    actions.hidden = true;

    menuButton.addEventListener(
      "click",
      function () {
        closeActionMenus(actions);
        actions.hidden = !actions.hidden;
      }
    );

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.textContent = "Edit";

    editButton.addEventListener(
      "click",
      function () {
        savingsNameInput.value = goal.name;
        savingsTargetInput.value = target;
        savingsCurrentInput.value = current;
        editingSavingsIndex = index;
        savingsSubmitButton.textContent =
          "Update Goal";
        savingsForm.hidden = false;
        savingsNameInput.focus();
      }
    );

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className =
      "delete-goal-button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener(
      "click",
      function () {
        const confirmed = confirm(
          `Delete "${goal.name}"?`
        );

        if (!confirmed) {
          return;
        }

        savingsGoals.splice(index, 1);
        saveSavingsGoals();
        renderSavingsGoals();
        showMessage("Savings goal deleted.");
      }
    );

    actions.append(editButton, deleteButton);

    card.append(
      title,
      amounts,
      progressBar,
      percent,
      menuButton,
      actions
    );

    savingsGoalsList.appendChild(card);
  });
}

addSavingsGoalButton.addEventListener(
  "click",
  function () {
    editingSavingsIndex = null;
    savingsForm.reset();
    savingsSubmitButton.textContent = "Save Goal";
    savingsForm.hidden = false;
    savingsNameInput.focus();
  }
);

savingsForm.addEventListener(
  "submit",
  function (event) {
    event.preventDefault();

    const name = savingsNameInput.value.trim();
    const target = Number(savingsTargetInput.value);
    const current = Number(savingsCurrentInput.value);

    if (!name) {
      alert("Please enter a savings goal name.");
      return;
    }

    if (!Number.isFinite(target) || target <= 0) {
      alert("Please enter a valid target amount.");
      return;
    }

    if (
      !Number.isFinite(current) ||
      current < 0 ||
      current > target
    ) {
      alert(
        "Amount saved must be between $0 and the target."
      );
      return;
    }

    const goal = {
      name,
      target,
      current
    };

    if (editingSavingsIndex === null) {
      savingsGoals.push(goal);
      showMessage("Savings goal added.");
    } else {
      savingsGoals[editingSavingsIndex] = goal;
      showMessage("Savings goal updated.");
    }

    saveSavingsGoals();
    renderSavingsGoals();

    savingsForm.reset();
    savingsForm.hidden = true;
    savingsSubmitButton.textContent = "Save Goal";
    editingSavingsIndex = null;
  }
);

let messageTimeout;

function showMessage(message) {
  let messageBox = document.querySelector(
    "#app-message"
  );

  if (!messageBox) {
    messageBox = document.createElement("div");
    messageBox.id = "app-message";
    messageBox.setAttribute("role", "status");
    document.body.appendChild(messageBox);
  }

  messageBox.textContent = message;
  messageBox.classList.add("visible");

  clearTimeout(messageTimeout);

  messageTimeout = setTimeout(function () {
    messageBox.classList.remove("visible");
  }, 2500);
}

loadSavingsGoals();
loadCurrentMonth();