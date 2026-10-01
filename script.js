let monthlyIncome = 0;
let monthlyBudgetLimit = 0;
let expenses = [];
let selectedMonth = new Date();

let editingIndex = null;
let savingsGoals = [];
let editingSavingsIndex = null;

// Budget elements
const incomeForm = document.querySelector("#income-form");
const incomeInput = document.querySelector("#income");
const totalIncomeDisplay = document.querySelector("#total-income");

const budgetLimitInput = document.querySelector("#budget-limit");
const budgetLimitDisplay = document.querySelector("#budget-limit-display");

// Expense elements
const expenseForm = document.querySelector("#expense-form");
const expenseAmountInput = document.querySelector("#expense-amount");
const categoryInput = document.querySelector("#category");
const totalExpensesDisplay = document.querySelector("#total-expenses");
const remainingBudgetDisplay = document.querySelector("#remaining-budget");
const budgetStatus = document.querySelector("#budget-status");
const expenseList = document.querySelector("#expense-list");

const expenseSubmitButton = expenseForm.querySelector(
  'button[type="submit"]'
);

// Month navigation
const currentMonthDisplay = document.querySelector("#current-month");
const previousMonthButton = document.querySelector("#previous-month");
const nextMonthButton = document.querySelector("#next-month");

// Category breakdown
const categoryBreakdown = document.querySelector("#category-breakdown");

// Budget gauge
const gaugeProgress = document.querySelector("#gauge-progress");
const budgetPercent = document.querySelector("#budget-percent");

// Savings goals
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

// Return the selected month as YYYY-MM
function getMonthKey() {
  const year = selectedMonth.getFullYear();
  const month = String(selectedMonth.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

// Display selected month
function displaySelectedMonth() {
  currentMonthDisplay.textContent = selectedMonth.toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric"
    }
  );
}

// Save the current month's data
function saveCurrentMonth() {
  const monthData = {
    income: monthlyIncome,
    budgetLimit: monthlyBudgetLimit,
    expenses: expenses
  };

  localStorage.setItem(
    `budget-${getMonthKey()}`,
    JSON.stringify(monthData)
  );
}

// Load the selected month's data
function loadCurrentMonth() {
  const savedData = localStorage.getItem(
    `budget-${getMonthKey()}`
  );

  if (savedData) {
    const monthData = JSON.parse(savedData);

    monthlyIncome = Number(monthData.income) || 0;
    monthlyBudgetLimit = Number(monthData.budgetLimit) || 0;

    expenses = Array.isArray(monthData.expenses)
      ? monthData.expenses
      : [];
  } else {
    monthlyIncome = 0;
    monthlyBudgetLimit = 0;
    expenses = [];
  }

  incomeInput.value =
    monthlyIncome > 0 ? monthlyIncome.toFixed(2) : "";

  budgetLimitInput.value =
    monthlyBudgetLimit > 0
      ? monthlyBudgetLimit.toFixed(2)
      : "";

  editingIndex = null;
  expenseForm.reset();
  expenseSubmitButton.textContent = "Add Expense";

  displaySelectedMonth();
  renderExpenses();
  updateBudgetDisplay();
}

// Update all budget summary information
function updateBudgetDisplay() {
  const totalExpenses = expenses.reduce(function (total, expense) {
    return total + Number(expense.amount);
  }, 0);

  const remainingBudget = monthlyBudgetLimit - totalExpenses;

  totalIncomeDisplay.textContent = monthlyIncome.toFixed(2);
  budgetLimitDisplay.textContent =
    monthlyBudgetLimit.toFixed(2);
  totalExpensesDisplay.textContent = totalExpenses.toFixed(2);
  remainingBudgetDisplay.textContent =
    remainingBudget.toFixed(2);

  if (monthlyBudgetLimit === 0) {
    budgetStatus.textContent =
      "Enter your income and monthly budget to begin.";
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

// Update the semicircle gauge
function updateBudgetGauge(totalExpenses) {
  let percentUsed = 0;

  if (monthlyBudgetLimit > 0) {
    percentUsed =
      (totalExpenses / monthlyBudgetLimit) * 100;
  }

  const gaugePercent = Math.min(percentUsed, 100);
  const gaugeLength = 251.2;

  const dashOffset =
    gaugeLength -
    (gaugePercent / 100) * gaugeLength;

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

  if (monthlyBudgetLimit === 0) {
    budgetPercent.textContent = "Add budget";
  } else if (totalExpenses === 0) {
    budgetPercent.textContent = "No spending yet";
  } else {
    budgetPercent.textContent =
      `${Math.round(percentUsed)}% used`;
  }
}

// Category icons
function getCategoryIcon(category) {
  const categoryIcons = {
    Food: "🍔",
    Housing: "🏠",
    Transportation: "🚗",
    School: "🎓",
    Other: "📦"
  };

  return categoryIcons[category] || "💰";
}

// Close all open swipe actions
function closeSwipedItems() {
  document
    .querySelectorAll(".swipe-item.swiped")
    .forEach(function (item) {
      item.classList.remove("swiped");
    });
}

// Display expenses
function renderExpenses() {
  expenseList.innerHTML = "";

  if (expenses.length === 0) {
    const emptyMessage = document.createElement("li");

    emptyMessage.className = "empty-message";
    emptyMessage.textContent =
      "Your expenses will appear here after you add one.";

    expenseList.appendChild(emptyMessage);
    return;
  }

  expenses.forEach(function (expense, index) {
    const listItem = document.createElement("li");
    listItem.className = "swipe-item";

    const expenseContent = document.createElement("div");
    expenseContent.className = "expense-content";

    const expenseText = document.createElement("span");

    expenseText.textContent =
      `${getCategoryIcon(expense.category)} ` +
      `${expense.category}: ` +
      `$${Number(expense.amount).toFixed(2)}`;

    const swipeActions = document.createElement("div");
    swipeActions.className = "swipe-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.className = "edit-button";

    editButton.addEventListener("click", function () {
      expenseAmountInput.value = Number(expense.amount).toFixed(2);
      categoryInput.value = expense.category;

      editingIndex = index;
      expenseSubmitButton.textContent = "Update Expense";

      listItem.classList.remove("swiped");
      expenseAmountInput.focus();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete-button";

    deleteButton.addEventListener("click", function () {
      expenses.splice(index, 1);

      if (editingIndex === index) {
        editingIndex = null;
        expenseForm.reset();
        expenseSubmitButton.textContent = "Add Expense";
      } else if (editingIndex > index) {
        editingIndex--;
      }

      saveCurrentMonth();
      renderExpenses();
      updateBudgetDisplay();
    });

    expenseContent.appendChild(expenseText);
    swipeActions.append(editButton, deleteButton);
    listItem.append(expenseContent, swipeActions);
    expenseList.appendChild(listItem);

    let startX = 0;
    let startY = 0;

    listItem.addEventListener("pointerdown", function (event) {
      startX = event.clientX;
      startY = event.clientY;

      listItem.setPointerCapture(event.pointerId);
    });

    listItem.addEventListener("pointerup", function (event) {
      const endX = event.clientX;
      const endY = event.clientY;

      const horizontalDistance = startX - endX;
      const verticalDistance = Math.abs(startY - endY);

      if (
        horizontalDistance > 50 &&
        horizontalDistance > verticalDistance
      ) {
        closeSwipedItems();
        listItem.classList.add("swiped");
      } else if (
        horizontalDistance < -50 &&
        Math.abs(horizontalDistance) > verticalDistance
      ) {
        listItem.classList.remove("swiped");
      }
    });

    listItem.addEventListener("pointercancel", function () {
      listItem.classList.remove("swiped");
    });

    expenseContent.addEventListener("click", function () {
      if (listItem.classList.contains("swiped")) {
        listItem.classList.remove("swiped");
      }
    });
  });
}

// Display spending by category
function renderCategoryBreakdown() {
  categoryBreakdown.innerHTML = "";

  if (expenses.length === 0) {
    const emptyMessage = document.createElement("p");

    emptyMessage.className = "empty-message";
    emptyMessage.textContent =
      "Add expenses to see your spending breakdown.";

    categoryBreakdown.appendChild(emptyMessage);
    return;
  }

  const categoryTotals = {};

  expenses.forEach(function (expense) {
    const category = expense.category;
    const amount = Number(expense.amount);

    if (!categoryTotals[category]) {
      categoryTotals[category] = 0;
    }

    categoryTotals[category] += amount;
  });

  const totalExpenses = expenses.reduce(function (total, expense) {
    return total + Number(expense.amount);
  }, 0);

  Object.entries(categoryTotals).forEach(function (
    [category, amount]
  ) {
    const percentage =
      totalExpenses > 0
        ? (amount / totalExpenses) * 100
        : 0;

    const categoryRow = document.createElement("div");
    categoryRow.className = "category-row";

    const categoryHeader = document.createElement("div");
    categoryHeader.className = "category-header";

    const categoryName = document.createElement("span");
    categoryName.textContent =
      `${getCategoryIcon(category)} ${category}`;

    const categoryAmount = document.createElement("span");
    categoryAmount.className = "category-amount";
    categoryAmount.textContent =
      `$${amount.toFixed(2)}`;

    categoryHeader.append(categoryName, categoryAmount);

    const categoryBar = document.createElement("div");
    categoryBar.className = "category-bar";

    const categoryFill = document.createElement("div");
    categoryFill.className = "category-fill";
    categoryFill.style.width = `${percentage}%`;

    categoryBar.appendChild(categoryFill);
    categoryRow.append(categoryHeader, categoryBar);
    categoryBreakdown.appendChild(categoryRow);
  });
}

// Save income and monthly budget
incomeForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const enteredIncome = Number(incomeInput.value);
  const enteredBudgetLimit = Number(budgetLimitInput.value);

  if (!Number.isFinite(enteredIncome) || enteredIncome <= 0) {
    alert("Please enter a valid income amount.");
    return;
  }

  if (
    !Number.isFinite(enteredBudgetLimit) ||
    enteredBudgetLimit <= 0
  ) {
    alert("Please enter a valid monthly budget.");
    return;
  }

  monthlyIncome = enteredIncome;
  monthlyBudgetLimit = enteredBudgetLimit;

  saveCurrentMonth();
  updateBudgetDisplay();

  incomeInput.value = monthlyIncome.toFixed(2);
  budgetLimitInput.value =
    monthlyBudgetLimit.toFixed(2);
});

// Add or update an expense
expenseForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const amount = Number(expenseAmountInput.value);
  const category = categoryInput.value;

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Please enter an expense greater than zero.");
    return;
  }

  if (category === "") {
    alert("Please choose a category.");
    return;
  }

  const expense = {
    amount: amount,
    category: category
  };

  if (editingIndex === null) {
    expenses.push(expense);
  } else {
    expenses[editingIndex] = expense;
    editingIndex = null;
  }

  saveCurrentMonth();
  renderExpenses();
  updateBudgetDisplay();

  expenseForm.reset();
  expenseSubmitButton.textContent = "Add Expense";
});

// Previous month
previousMonthButton.addEventListener("click", function () {
  saveCurrentMonth();

  selectedMonth.setMonth(
    selectedMonth.getMonth() - 1
  );

  loadCurrentMonth();
});

// Next month
nextMonthButton.addEventListener("click", function () {
  saveCurrentMonth();

  selectedMonth.setMonth(
    selectedMonth.getMonth() + 1
  );

  loadCurrentMonth();
});

// Save savings goals
function saveSavingsGoals() {
  localStorage.setItem(
    "savings-goals",
    JSON.stringify(savingsGoals)
  );
}

// Load savings goals
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

// Display savings goals
function renderSavingsGoals() {
  savingsGoalsList.innerHTML = "";

  if (savingsGoals.length === 0) {
    const emptyMessage = document.createElement("p");

    emptyMessage.className = "empty-message";
    emptyMessage.textContent =
      "Add a savings goal to start tracking your progress.";

    savingsGoalsList.appendChild(emptyMessage);
    return;
  }

  savingsGoals.forEach(function (goal, index) {
    const target = Number(goal.target);
    const current = Number(goal.current);

    const percentage =
      target > 0 ? (current / target) * 100 : 0;

    const displayedPercentage = Math.min(
      Math.round(percentage),
      100
    );

    const goalCard = document.createElement("div");
    goalCard.className = "savings-goal-card";

    const goalTitle = document.createElement("h3");
    goalTitle.textContent = goal.name;

    const goalAmounts = document.createElement("div");
    goalAmounts.className = "savings-amounts";

    const savedText = document.createElement("span");
    savedText.textContent =
      `$${current.toFixed(2)} saved`;

    const targetText = document.createElement("span");
    targetText.textContent =
      `Goal: $${target.toFixed(2)}`;

    goalAmounts.append(savedText, targetText);

    const progressBar = document.createElement("div");
    progressBar.className = "savings-progress-bar";

    const progressFill = document.createElement("div");
    progressFill.className = "savings-progress-fill";
    progressFill.style.width =
      `${displayedPercentage}%`;

    progressBar.appendChild(progressFill);

    const percentageText = document.createElement("p");
    percentageText.className =
      "savings-progress-percent";
    percentageText.textContent =
      `${displayedPercentage}% complete`;

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "savings-buttons";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";

    editButton.addEventListener("click", function () {
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
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete-goal-button";

    deleteButton.addEventListener("click", function () {
      savingsGoals.splice(index, 1);

      if (editingSavingsIndex === index) {
        editingSavingsIndex = null;
        savingsForm.reset();
        savingsForm.hidden = true;
        savingsSubmitButton.textContent = "Save Goal";
      }

      saveSavingsGoals();
      renderSavingsGoals();
    });

    buttonContainer.append(editButton, deleteButton);

    goalCard.append(
      goalTitle,
      goalAmounts,
      progressBar,
      percentageText,
      buttonContainer
    );

    savingsGoalsList.appendChild(goalCard);
  });
}

// Show savings goal form
addSavingsGoalButton.addEventListener("click", function () {
  editingSavingsIndex = null;

  savingsForm.reset();
  savingsSubmitButton.textContent = "Save Goal";
  savingsForm.hidden = false;
  savingsNameInput.focus();
});

// Add or update savings goal
savingsForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const name = savingsNameInput.value.trim();
  const target = Number(savingsTargetInput.value);
  const current = Number(savingsCurrentInput.value);

  if (name === "") {
    alert("Please enter a savings goal name.");
    return;
  }

  if (!Number.isFinite(target) || target <= 0) {
    alert("Please enter a valid target amount.");
    return;
  }

  if (!Number.isFinite(current) || current < 0) {
    alert("Please enter a valid saved amount.");
    return;
  }

  if (current > target) {
    alert("The amount saved cannot exceed the goal.");
    return;
  }

  const savingsGoal = {
    name: name,
    target: target,
    current: current
  };

  if (editingSavingsIndex === null) {
    savingsGoals.push(savingsGoal);
  } else {
    savingsGoals[editingSavingsIndex] = savingsGoal;
    editingSavingsIndex = null;
  }

  saveSavingsGoals();
  renderSavingsGoals();

  savingsForm.reset();
  savingsForm.hidden = true;
  savingsSubmitButton.textContent = "Save Goal";
});

// Start the app
loadCurrentMonth();
loadSavingsGoals();