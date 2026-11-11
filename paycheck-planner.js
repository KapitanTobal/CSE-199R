const paycheckForm = document.querySelector("#paycheck-form");
const currentBalanceInput = document.querySelector("#current-balance");
const paycheckNameInput = document.querySelector("#paycheck-name");
const paycheckAmountInput = document.querySelector("#paycheck-amount");
const paycheckFrequencyInput = document.querySelector("#paycheck-frequency");
const nextPaydayInput = document.querySelector("#next-payday");
const plannedSavingsInput = document.querySelector("#planned-savings");

const paycheckSummary = document.querySelector("#paycheck-summary");
const nextPaydayDisplay = document.querySelector("#display-next-payday");
const daysRemainingDisplay = document.querySelector("#display-days-remaining");
const paycheckAmountDisplay = document.querySelector("#display-paycheck-amount");
const billsDisplay = document.querySelector("#display-bills-before-payday");
const safeToSpendDisplay = document.querySelector("#display-safe-to-spend");
const dailyAllowanceDisplay = document.querySelector("#display-daily-allowance");
const lowestBalanceDisplay = document.querySelector("#display-lowest-balance");
const paycheckWarning = document.querySelector("#paycheck-warning");
const paycheckPlansList = document.querySelector("#paycheck-plans-list");

const PAYCHECK_KEY = "paycheck-schedules";
const PLANNER_SETTINGS_KEY = "paycheck-planner-settings";

let paycheckPlans = readStorageArray(PAYCHECK_KEY);
let plannerSettings = readStorageObject(PLANNER_SETTINGS_KEY, {
  currentBalance: 0,
  plannedSavings: 0
});

function readStorageArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readStorageObject(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

function savePaycheckData() {
  localStorage.setItem(PAYCHECK_KEY, JSON.stringify(paycheckPlans));
  localStorage.setItem(
    PLANNER_SETTINGS_KEY,
    JSON.stringify(plannerSettings)
  );
}

function dateFromString(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateToString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayAtMidnight() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addFrequency(date, frequency) {
  const nextDate = new Date(date);

  if (frequency === "weekly" || frequency === "Weekly") {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (frequency === "biweekly" || frequency === "Biweekly") {
    nextDate.setDate(nextDate.getDate() + 14);
  } else if (
    frequency === "twice-monthly" ||
    frequency === "twiceMonthly"
  ) {
    nextDate.setDate(nextDate.getDate() + 15);
  } else if (frequency === "yearly" || frequency === "Yearly") {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  } else {
    const originalDay = nextDate.getDate();
    nextDate.setDate(1);
    nextDate.setMonth(nextDate.getMonth() + 1);
    const lastDay = new Date(
      nextDate.getFullYear(),
      nextDate.getMonth() + 1,
      0
    ).getDate();
    nextDate.setDate(Math.min(originalDay, lastDay));
  }

  return nextDate;
}

function getNextDate(startDate, frequency) {
  let date = new Date(startDate);
  const today = todayAtMidnight();

  while (date < today) {
    date = addFrequency(date, frequency);
  }

  return date;
}

function daysBetween(startDate, endDate) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.max(
    0,
    Math.ceil((endDate - startDate) / millisecondsPerDay)
  );
}

function formatMoney(amount) {
  return Number(amount).toFixed(2);
}

function formatDisplayDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getUpcomingPaychecks(endDate) {
  const events = [];

  paycheckPlans.forEach((plan) => {
    const amount = Number(plan.amount) || 0;
    const firstDate = dateFromString(plan.nextPayday);
    if (amount <= 0 || !firstDate) return;

    let date = getNextDate(
      firstDate,
      plan.frequency
    );

    while (date <= endDate) {
      events.push({
        date: new Date(date),
        amount,
        type: "income",
        description: plan.name || "Paycheck",
        source: "paycheck"
      });

      date = addFrequency(date, plan.frequency);
    }
  });

  return events;
}

function getUpcomingBills(endDate) {
  const events = [];

  const recurringTransactions = readStorageArray(
    "recurring-transactions"
  );

  recurringTransactions.forEach((transaction) => {
    if (transaction.active === false || transaction.type !== "expense") {
      return;
    }

    const amount = Number(transaction.amount) || 0;
    const firstDate = dateFromString(transaction.startDate);

    if (amount <= 0 || !firstDate) return;

    let date = getNextDate(firstDate, transaction.frequency);

    while (date <= endDate) {
      events.push({
        date: new Date(date),
        amount,
        type: "expense",
        description: transaction.description,
        source: "recurring"
      });

      date = addFrequency(date, transaction.frequency);
    }
  });

  const subscriptions = readStorageArray("subscriptions");

  subscriptions.forEach((subscription) => {
    const amount = Number(subscription.amount) || 0;
    const firstDate = dateFromString(subscription.nextPayment);

    if (amount <= 0 || !firstDate) return;

    const frequency =
      subscription.billingCycle === "Yearly" ? "yearly" : "monthly";

    let date = getNextDate(firstDate, frequency);

    while (date <= endDate) {
      events.push({
        date: new Date(date),
        amount,
        type: "expense",
        description: subscription.name,
        source: "subscription"
      });

      date = frequency === "yearly"
        ? new Date(date.getFullYear() + 1, date.getMonth(), date.getDate())
        : addFrequency(date, "monthly");
    }
  });

  return removeDuplicateEvents(events);
}

function removeDuplicateEvents(events) {
  const seen = new Set();

  return events.filter((event) => {
    const key = [
      event.type,
      event.description.toLowerCase(),
      event.amount.toFixed(2),
      dateToString(event.date)
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getPlannerResult() {
  if (paycheckPlans.length === 0) return null;

  const today = todayAtMidnight();
  const nextPayday = paycheckPlans
    .map((plan) => {
      const date = dateFromString(plan.nextPayday);
      return date ? getNextDate(date, plan.frequency) : null;
    })
    .filter(Boolean)
    .sort((a, b) => a - b)[0];

  if (!nextPayday) return null;

  const paychecks = getUpcomingPaychecks(nextPayday);
  const bills = getUpcomingBills(nextPayday);
  const expectedIncome = paychecks
    .filter((event) => event.date <= nextPayday)
    .reduce((total, event) => total + event.amount, 0);
  const billsBeforePayday = bills
    .filter((event) => event.date <= nextPayday)
    .reduce((total, event) => total + event.amount, 0);
  const currentBalance = Number(plannerSettings.currentBalance) || 0;
  const plannedSavings = Number(plannerSettings.plannedSavings) || 0;
  const safeToSpend =
    currentBalance +
    expectedIncome -
    billsBeforePayday -
    plannedSavings;
  const daysRemaining = daysBetween(today, nextPayday);
  const dailyAllowance = safeToSpend > 0
    ? safeToSpend / Math.max(daysRemaining, 1)
    : 0;

  const timelineEvents = [
    ...paychecks,
    ...bills,
    {
      date: new Date(today),
      amount: plannedSavings,
      type: "expense",
      description: "Planned savings",
      source: "savings"
    }
  ].sort((a, b) => a.date - b.date);

  let projectedBalance = currentBalance;
  let lowestBalance = currentBalance - plannedSavings;

  timelineEvents.forEach((event) => {
    if (event.source === "savings") return;

    if (event.type === "income") {
      projectedBalance += event.amount;
    } else {
      projectedBalance -= event.amount;
    }

    lowestBalance = Math.min(lowestBalance, projectedBalance);
  });

  return {
    nextPayday,
    expectedIncome,
    billsBeforePayday,
    plannedSavings,
    safeToSpend,
    daysRemaining,
    dailyAllowance,
    lowestBalance
  };
}

function updatePaycheckSummary() {
  const result = getPlannerResult();

  if (!result) {
    paycheckSummary.hidden = true;
    renderPaycheckPlans();
    return;
  }

  paycheckSummary.hidden = false;
  nextPaydayDisplay.textContent = formatDisplayDate(result.nextPayday);
  daysRemainingDisplay.textContent = result.daysRemaining;
  paycheckAmountDisplay.textContent = formatMoney(result.expectedIncome);
  billsDisplay.textContent = formatMoney(result.billsBeforePayday);
  safeToSpendDisplay.textContent = formatMoney(result.safeToSpend);
  dailyAllowanceDisplay.textContent = formatMoney(result.dailyAllowance);
  lowestBalanceDisplay.textContent = formatMoney(result.lowestBalance);

  if (result.lowestBalance < 0 || result.safeToSpend < 0) {
    paycheckWarning.textContent =
      "Warning: your projected balance may become negative before payday.";
    paycheckWarning.className = "paycheck-warning warning-danger";
  } else if (result.lowestBalance < 100) {
    paycheckWarning.textContent =
      "Your projected balance is getting low before payday.";
    paycheckWarning.className = "paycheck-warning warning-caution";
  } else {
    paycheckWarning.textContent =
      "Your projected balance remains positive before payday.";
    paycheckWarning.className = "paycheck-warning warning-safe";
  }

  renderPaycheckPlans();
}

function renderPaycheckPlans() {
  paycheckPlansList.innerHTML = "";

  if (paycheckPlans.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent = "No paycheck plans added yet.";
    paycheckPlansList.appendChild(message);
    return;
  }

  paycheckPlans.forEach((plan, index) => {
    const item = document.createElement("div");
    item.className = "paycheck-plan-item";

    const details = document.createElement("div");
    details.className = "paycheck-plan-details";

    const title = document.createElement("strong");
    title.textContent = plan.name;

    const description = document.createElement("span");
    description.textContent =
      `$${formatMoney(plan.amount)} • ${plan.frequency} • ` +
      `Next: ${plan.nextPayday}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button small-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      paycheckPlans.splice(index, 1);
      savePaycheckData();
      updatePaycheckSummary();
    });

    details.append(title, description);
    item.append(details, deleteButton);
    paycheckPlansList.appendChild(item);
  });
}

paycheckForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const currentBalance = Number(currentBalanceInput.value);
  const name = paycheckNameInput.value.trim();
  const amount = Number(paycheckAmountInput.value);
  const frequency = paycheckFrequencyInput.value;
  const nextPayday = nextPaydayInput.value;
  const plannedSavings = Number(plannedSavingsInput.value);

  if (!Number.isFinite(currentBalance) || currentBalance < 0) {
    alert("Please enter a valid current balance.");
    return;
  }

  if (!name) {
    alert("Please enter an income source.");
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Please enter a valid paycheck amount.");
    return;
  }

  if (!frequency) {
    alert("Please choose a pay frequency.");
    return;
  }

  if (!nextPayday || !dateFromString(nextPayday)) {
    alert("Please choose a valid next payday.");
    return;
  }

  if (!Number.isFinite(plannedSavings) || plannedSavings < 0) {
    alert("Please enter a valid savings amount.");
    return;
  }

  plannerSettings = {
    currentBalance,
    plannedSavings
  };

  paycheckPlans.push({
    id: Date.now(),
    name,
    amount,
    frequency,
    nextPayday,
    active: true
  });

  savePaycheckData();
  updatePaycheckSummary();
  paycheckForm.reset();
  plannedSavingsInput.value = "0";

  alert("Paycheck plan saved.");
});

currentBalanceInput.value = plannerSettings.currentBalance || "";
plannedSavingsInput.value = plannerSettings.plannedSavings || "0";
updatePaycheckSummary();
