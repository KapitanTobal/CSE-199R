let monthlyIncome = 0;
let monthlyBudgetLimit = 0;
let expenses = [];
let selectedMonth = new Date();

let editingIndex = null;
let savingsGoals = [];
let editingSavingsIndex = null;

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
const expenseSubmitButton = expenseForm.querySelector('button[type="submit"]');
const emptyAddExpenseButton = document.querySelector("#empty-add-expense-button");

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
const addSavingsGoalButton = document.querySelector("#add-savings-goal-button");
const savingsSubmitButton = document.querySelector("#savings-submit-button");

function getMonthKey() {
  const year = selectedMonth.getFullYear();
  const month = String(selectedMonth.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displaySelectedMonth() {
  currentMonthDisplay.textContent = selectedMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function saveCurrentMonth() {
  localStorage.setItem(`budget-${getMonthKey()}`, JSON.stringify({
    income: monthlyIncome,
    budgetLimit: monthlyBudgetLimit,
    expenses
  }));
}

function loadCurrentMonth() {
  const savedData = localStorage.getItem(`budget-${getMonthKey()}`);

  if (savedData) {
    try {
      const monthData = JSON.parse(savedData);
      monthlyIncome = Number(monthData.income) || 0;
      monthlyBudgetLimit = Number(monthData.budgetLimit) || 0;
      expenses = Array.isArray(monthData.expenses) ? monthData.expenses : [];
    } catch {
      monthlyIncome = 0;
      monthlyBudgetLimit = 0;
      expenses = [];
    }
  } else {
    monthlyIncome = 0;
    monthlyBudgetLimit = 0;
    expenses = [];
  }

  incomeInput.value = monthlyIncome > 0 ? monthlyIncome.toFixed(2) : "";
  budgetLimitInput.value = monthlyBudgetLimit > 0
    ? monthlyBudgetLimit.toFixed(2)
    : "";

  editingIndex = null;
  expenseForm.reset();
  expenseDateInput.value = getTodayString();
  expenseSubmitButton.textContent = "Add Expense";

  displaySelectedMonth();
  renderExpenses();
  updateBudgetDisplay();
}

function getTotalExpenses() {
  return expenses.reduce((total, expense) => {
    return total + (Number(expense.amount) || 0);
  }, 0);
}

function updateBudgetDisplay() {
  const totalExpenses = getTotalExpenses();
  const remainingBudget = monthlyBudgetLimit - totalExpenses;

  totalIncomeDisplay.textContent = monthlyIncome.toFixed(2);
  budgetLimitDisplay.textContent = monthlyBudgetLimit.toFixed(2);
  totalExpensesDisplay.textContent = totalExpenses.toFixed(2);
  remainingBudgetDisplay.textContent = remainingBudget.toFixed(2);

  if (monthlyBudgetLimit === 0) {
    budgetStatus.textContent = "Enter your income and monthly budget to begin.";
  } else if (remainingBudget < 0) {
    budgetStatus.textContent =
      `Over budget by $${Math.abs(remainingBudget).toFixed(2)}. ` +
      `You spent $${totalExpenses.toFixed(2)} of your ` +
      `$${monthlyBudgetLimit.toFixed(2)} budget.`;
  } else if (totalExpenses === 0) {
    budgetStatus.textContent =
      `$${monthlyBudgetLimit.toFixed(2)} available to spend.`;
  } else {
    budgetStatus.textContent =
      `$${remainingBudget.toFixed(2)} remaining in your budget.`;
  }

  updateBudgetGauge(totalExpenses);
  renderCategoryBreakdown();
}

function updateBudgetGauge(totalExpenses) {
  const percentUsed = monthlyBudgetLimit > 0
    ? (totalExpenses / monthlyBudgetLimit) * 100
    : 0;

  const gaugeLength = 251.2;
  const gaugePercent = Math.min(percentUsed, 100);
  const dashOffset = gaugeLength - (gaugePercent / 100) * gaugeLength;

  let gaugeColor = "#34c759";

  if (monthlyBudgetLimit === 0) {
    gaugeColor = "#d1d1d6";
  } else if (percentUsed >= 100) {
    gaugeColor = "#ff3b30";
  } else if (percentUsed >= 85) {
    gaugeColor = "#ff9500";
  } else if (percentUsed >= 70) {
    gaugeColor = "#ffcc00";
  }

  gaugeProgress.style.strokeDashoffset = dashOffset;
  gaugeProgress.style.stroke = gaugeColor;
  gaugeDetails.textContent =
    `$${totalExpenses.toFixed(2)} spent of $${monthlyBudgetLimit.toFixed(2)}`;

  if (monthlyBudgetLimit === 0) {
    budgetPercent.textContent = "Add budget";
  } else if (totalExpenses === 0) {
    budgetPercent.textContent = "No spending yet";
  } else {
    budgetPercent.textContent = `${Math.round(percentUsed)}% used`;
  }
}

function getCategoryIcon(category) {
  const icons = {
    Food: "🍔",
    Housing: "🏠",
    Transportation: "🚗",
    School: "🎓",
    Bills: "🧾",
    Shopping: "🛍️",
    Entertainment: "🎬",
    Other: "📦"
  };

  return icons[category] || "💰";
}

function formatExpenseDate(dateValue) {
  if (!dateValue) return "Date not provided";

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Date not provided";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function closeActionMenus(except = null) {
  document.querySelectorAll(".card-actions.is-open").forEach((menu) => {
    if (menu !== except) {
      menu.hidden = true;
      menu.classList.remove("is-open");

      const button = menu.parentElement.querySelector(".more-button");
      if (button) button.setAttribute("aria-expanded", "false");
    }
  });
}

document.addEventListener("click", () => closeActionMenus());

function renderExpenses() {
  expenseList.innerHTML = "";

  if (expenses.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "empty-message expense-empty-state";

    const message = document.createElement("span");
    message.textContent = "Add your first expense to see your progress.";

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "small-button";
    addButton.textContent = "Add Expense";
    addButton.addEventListener("click", focusExpenseForm);

    emptyMessage.append(message, addButton);
    expenseList.appendChild(emptyMessage);
    return;
  }

  expenses.forEach((expense, index) => {
    const listItem = document.createElement("li");
    listItem.className = "expense-item";

    const info = document.createElement("div");
    info.className = "expense-info";

    const description = document.createElement("strong");
    description.className = "expense-description";
    description.textContent = expense.description || expense.category;

    const details = document.createElement("span");
    details.className = "expense-details";
    details.textContent =
      `${getCategoryIcon(expense.category)} ${expense.category} • ` +
      `${formatExpenseDate(expense.date)}`;

    const amount = document.createElement("strong");
    amount.className = "expense-amount";
    amount.textContent = `$${Number(expense.amount).toFixed(2)}`;

    info.append(description, details);

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "more-button";
    menuButton.setAttribute("aria-label", `More options for ${expense.description || expense.category}`);
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.textContent = "•••";

    const actions = document.createElement("div");
    actions.className = "card-actions expense-actions";
    actions.hidden = true;

    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      closeActionMenus(actions);
      actions.hidden = !actions.hidden;
      actions.classList.toggle("is-open", !actions.hidden);
      menuButton.setAttribute("aria-expanded", String(!actions.hidden));
    });

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      expenseDescriptionInput.value = expense.description || "";
      expenseAmountInput.value = Number(expense.amount).toFixed(2);
      categoryInput.value = expense.category;
      expenseDateInput.value = expense.date || getTodayString();
      editingIndex = index;
      expenseSubmitButton.textContent = "Update Expense";
      focusExpenseForm();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      expenses.splice(index, 1);

      if (editingIndex === index) {
        resetExpenseForm();
      } else if (editingIndex > index) {
        editingIndex--;
      }

      saveCurrentMonth();
      renderExpenses();
      updateBudgetDisplay();
      showMessage("Expense deleted.");
    });

    actions.append(editButton, deleteButton);
    listItem.append(info, amount, menuButton, actions);
    expenseList.appendChild(listItem);
  });
}

function renderCategoryBreakdown() {
  categoryBreakdown.innerHTML = "";

  if (expenses.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent = "Add expenses to see your spending breakdown.";
    categoryBreakdown.appendChild(message);
    return;
  }

  const categoryTotals = {};

  expenses.forEach((expense) => {
    categoryTotals[expense.category] =
      (categoryTotals[expense.category] || 0) + Number(expense.amount);
  });

  const totalExpenses = getTotalExpenses();

  Object.entries(categoryTotals).forEach(([category, amount]) => {
    const percentage = totalExpenses > 0
      ? (amount / totalExpenses) * 100
      : 0;

    const row = document.createElement("div");
    row.className = "category-row";

    const header = document.createElement("div");
    header.className = "category-header";

    const name = document.createElement("span");
    name.textContent = `${getCategoryIcon(category)} ${category}`;

    const categoryAmount = document.createElement("span");
    categoryAmount.className = "category-amount";
    categoryAmount.textContent = `$${amount.toFixed(2)}`;

    header.append(name, categoryAmount);

    const bar = document.createElement("div");
    bar.className = "category-bar";

    const fill = document.createElement("div");
    fill.className = "category-fill";
    fill.style.width = `${percentage}%`;

    bar.appendChild(fill);
    row.append(header, bar);
    categoryBreakdown.appendChild(row);
  });
}

function focusExpenseForm() {
  expenseForm.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => expenseDescriptionInput.focus(), 400);
}

function resetExpenseForm() {
  editingIndex = null;
  expenseForm.reset();
  expenseDateInput.value = getTodayString();
  expenseSubmitButton.textContent = "Add Expense";
}

let messageTimeout;

function showMessage(message) {
  let messageBox = document.querySelector("#app-message");

  if (!messageBox) {
    messageBox = document.createElement("div");
    messageBox.id = "app-message";
    messageBox.setAttribute("role", "status");
    document.body.appendChild(messageBox);
  }

  messageBox.textContent = message;
  messageBox.classList.add("visible");

  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    messageBox.classList.remove("visible");
  }, 2500);
}

incomeForm.addEventListener("submit", (event) => {
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
  saveCurrentMonth();
  updateBudgetDisplay();
  showMessage("Income and budget saved.");
});

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const description = expenseDescriptionInput.value.trim();
  const amount = Number(expenseAmountInput.value);
  const category = categoryInput.value;
  const date = expenseDateInput.value;

  if (!description) {
    alert("Please enter an expense description.");
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Please enter an expense greater than zero.");
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

  const expense = { description, amount, category, date };

  if (editingIndex === null) {
    expenses.push(expense);
    showMessage("Expense added successfully.");
  } else {
    expenses[editingIndex] = expense;
    showMessage("Expense updated successfully.");
  }

  saveCurrentMonth();
  renderExpenses();
  updateBudgetDisplay();
  resetExpenseForm();
});

previousMonthButton.addEventListener("click", () => {
  saveCurrentMonth();
  selectedMonth.setMonth(selectedMonth.getMonth() - 1);
  loadCurrentMonth();
});

nextMonthButton.addEventListener("click", () => {
  saveCurrentMonth();
  selectedMonth.setMonth(selectedMonth.getMonth() + 1);
  loadCurrentMonth();
});

function saveSavingsGoals() {
  localStorage.setItem("savings-goals", JSON.stringify(savingsGoals));
}

function loadSavingsGoals() {
  const savedGoals = localStorage.getItem("savings-goals");

  if (savedGoals) {
    try {
      savingsGoals = JSON.parse(savedGoals);
    } catch {
      savingsGoals = [];
    }
  } else {
    const oldGoal = localStorage.getItem("savings-goal");

    if (oldGoal) {
      savingsGoals = [JSON.parse(oldGoal)];
      saveSavingsGoals();
    }
  }

  renderSavingsGoals();
}

function renderSavingsGoals() {
  savingsGoalsList.innerHTML = "";

  if (savingsGoals.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent = "Add a savings goal to start tracking your progress.";
    savingsGoalsList.appendChild(message);
    return;
  }

  savingsGoals.forEach((goal, index) => {
    const target = Number(goal.target);
    const current = Number(goal.current);
    const percentage = target > 0 ? (current / target) * 100 : 0;
    const displayedPercentage = Math.min(Math.round(percentage), 100);

    const card = document.createElement("div");
    card.className = "savings-goal-card";

    const title = document.createElement("h3");
    title.textContent = goal.name;

    const amounts = document.createElement("div");
    amounts.className = "savings-amounts";
    amounts.innerHTML = `<span>$${current.toFixed(2)} saved</span>` +
      `<span>Goal: $${target.toFixed(2)}</span>`;

    const progressBar = document.createElement("div");
    progressBar.className = "savings-progress-bar";

    const progressFill = document.createElement("div");
    progressFill.className = "savings-progress-fill";
    progressFill.style.width = `${displayedPercentage}%`;
    progressBar.appendChild(progressFill);

    const percent = document.createElement("p");
    percent.className = "savings-progress-percent";
    percent.textContent = `${displayedPercentage}% complete`;

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "more-button";
    menuButton.setAttribute("aria-label", `More options for ${goal.name}`);
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.textContent = "•••";

    const actions = document.createElement("div");
    actions.className = "card-actions savings-buttons";
    actions.hidden = true;

    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      closeActionMenus(actions);
      actions.hidden = !actions.hidden;
      actions.classList.toggle("is-open", !actions.hidden);
      menuButton.setAttribute("aria-expanded", String(!actions.hidden));
    });

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      savingsNameInput.value = goal.name;
      savingsTargetInput.value = target.toFixed(2);
      savingsCurrentInput.value = current.toFixed(2);
      editingSavingsIndex = index;
      savingsSubmitButton.textContent = "Update Goal";
      savingsForm.hidden = false;
      savingsNameInput.focus();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-goal-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      savingsGoals.splice(index, 1);
      saveSavingsGoals();
      renderSavingsGoals();
      showMessage("Savings goal deleted.");
    });

    actions.append(editButton, deleteButton);
    card.append(title, amounts, progressBar, percent, menuButton, actions);
    savingsGoalsList.appendChild(card);
  });
}

addSavingsGoalButton.addEventListener("click", () => {
  editingSavingsIndex = null;
  savingsForm.reset();
  savingsSubmitButton.textContent = "Save Goal";
  savingsForm.hidden = false;
  savingsNameInput.focus();
});

savingsForm.addEventListener("submit", (event) => {
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

  if (!Number.isFinite(current) || current < 0 || current > target) {
    alert("Please enter a saved amount between $0 and the target amount.");
    return;
  }

  const goal = { name, target, current };

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
});

if (emptyAddExpenseButton) {
  emptyAddExpenseButton.addEventListener("click", focusExpenseForm);
}

loadCurrentMonth();
loadSavingsGoals();
