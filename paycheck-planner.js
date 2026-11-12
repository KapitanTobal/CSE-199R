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
const SETTINGS_KEY = "paycheck-planner-settings";

let paycheckPlans = readArray(PAYCHECK_KEY);
let plannerSettings = readObject(SETTINGS_KEY, {
  currentBalance: 0,
  plannedSavings: 0
});

let currentUser = null;
let cloudEnabled = false;

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readObject(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

function saveLocalData() {
  localStorage.setItem(PAYCHECK_KEY, JSON.stringify(paycheckPlans));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(plannerSettings));
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
  const normalized = String(frequency || "").toLowerCase();

  if (normalized === "weekly") {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (
    normalized === "biweekly" ||
    normalized === "bi-weekly"
  ) {
    nextDate.setDate(nextDate.getDate() + 14);
  } else if (
    normalized === "twice-monthly" ||
    normalized === "twicemonthly"
  ) {
    nextDate.setDate(nextDate.getDate() + 15);
  } else if (
    normalized === "yearly" ||
    normalized === "annual"
  ) {
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

  let safetyCounter = 0;

  while (date < today && safetyCounter < 1000) {
    date = addFrequency(date, frequency);
    safetyCounter++;
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
  return Number(amount || 0).toFixed(2);
}

function formatDisplayDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function normalizePlan(plan) {
  return {
    id: plan.id || Date.now() + Math.random(),
    name: plan.name || "Paycheck",
    amount: Number(plan.amount) || 0,
    frequency: plan.frequency || "monthly",
    nextPayday: plan.nextPayday || plan.next_payday,
    active: plan.active !== false
  };
}

function getLocalRecurringTransactions() {
  return readArray("recurring-transactions");
}

function getLocalSubscriptions() {
  return readArray("subscriptions");
}

async function getSignedInUser() {
  if (typeof supabaseClient === "undefined") {
    return null;
  }

  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data || !data.user) {
    return null;
  }

  return data.user;
}

async function loadCloudPlannerData() {
  currentUser = await getSignedInUser();

  if (!currentUser) {
    return false;
  }

  const [plansResult, settingsResult] = await Promise.all([
    supabaseClient
      .from("paycheck_plans")
      .select("id, name, amount, frequency, next_payday, active")
      .eq("user_id", currentUser.id)
      .order("next_payday", { ascending: true }),

    supabaseClient
      .from("paycheck_settings")
      .select("id, current_balance, planned_savings")
      .eq("user_id", currentUser.id)
      .maybeSingle()
  ]);

  if (plansResult.error || settingsResult.error) {
    console.warn("Could not load paycheck data.", {
      plansError: plansResult.error,
      settingsError: settingsResult.error
    });

    return false;
  }

  cloudEnabled = true;

  const cloudPlans = (plansResult.data || []).map(normalizePlan);

  if (cloudPlans.length > 0) {
    paycheckPlans = cloudPlans;
  } else if (paycheckPlans.length > 0) {
    await migrateLocalPlans();
  } else {
    paycheckPlans = [];
  }

  if (settingsResult.data) {
    plannerSettings = {
      currentBalance:
        Number(settingsResult.data.current_balance) || 0,

      plannedSavings:
        Number(settingsResult.data.planned_savings) || 0
    };
  } else {
    await saveSettingsToCloud();
  }

  saveLocalData();

  return true;
}

async function migrateLocalPlans() {
  if (!cloudEnabled || !currentUser || paycheckPlans.length === 0) {
    return;
  }

  const plansToUpload = paycheckPlans
    .map(normalizePlan)
    .filter(function (plan) {
      return (
        plan.name &&
        plan.amount > 0 &&
        plan.nextPayday
      );
    });

  if (plansToUpload.length === 0) {
    return;
  }

  const rows = plansToUpload.map(function (plan) {
    return {
      user_id: currentUser.id,
      name: plan.name,
      amount: plan.amount,
      frequency: plan.frequency,
      next_payday: plan.nextPayday,
      active: plan.active !== false
    };
  });

  const { data, error } = await supabaseClient
    .from("paycheck_plans")
    .insert(rows)
    .select("id, name, amount, frequency, next_payday, active");

  if (error) {
    console.warn("Could not migrate local paycheck plans.", error);
    return;
  }

  paycheckPlans = (data || []).map(normalizePlan);
  saveLocalData();
}

async function saveSettingsToCloud() {
  if (!cloudEnabled || !currentUser) {
    return;
  }

  const settings = {
    user_id: currentUser.id,
    current_balance: Number(plannerSettings.currentBalance) || 0,
    planned_savings: Number(plannerSettings.plannedSavings) || 0
  };

  const { data: existing, error: findError } = await supabaseClient
    .from("paycheck_settings")
    .select("id")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (findError) {
    console.warn("Could not find paycheck settings.", findError);
    return;
  }

  let result;

  if (existing) {
    result = await supabaseClient
      .from("paycheck_settings")
      .update(settings)
      .eq("id", existing.id);
  } else {
    result = await supabaseClient
      .from("paycheck_settings")
      .insert(settings);
  }

  if (result.error) {
    console.warn("Could not save paycheck settings.", result.error);
  }
}

async function savePlanToCloud(plan) {
  if (!cloudEnabled || !currentUser) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from("paycheck_plans")
    .insert({
      user_id: currentUser.id,
      name: plan.name,
      amount: plan.amount,
      frequency: plan.frequency,
      next_payday: plan.nextPayday,
      active: true
    })
    .select("id, name, amount, frequency, next_payday, active")
    .single();

  if (error) {
    console.warn("Could not save paycheck plan.", error);
    return null;
  }

  return normalizePlan(data);
}

async function deletePlanFromCloud(planId) {
  if (
    !cloudEnabled ||
    !currentUser ||
    typeof planId !== "string"
  ) {
    return;
  }

  const { error } = await supabaseClient
    .from("paycheck_plans")
    .delete()
    .eq("id", planId)
    .eq("user_id", currentUser.id);

  if (error) {
    console.warn("Could not delete paycheck plan.", error);
  }
}

async function getRecurringTransactions() {
  if (!cloudEnabled || !currentUser) {
    return getLocalRecurringTransactions();
  }

  const { data, error } = await supabaseClient
    .from("recurring_transactions")
    .select(
      "type, description, amount, frequency, start_date, active"
    )
    .eq("user_id", currentUser.id);

  if (error) {
    console.warn("Could not load recurring transactions.", error);
    return getLocalRecurringTransactions();
  }

  return (data || []).map(function (transaction) {
    return {
      ...transaction,
      startDate: transaction.start_date
    };
  });
}

async function getSubscriptions() {
  if (!cloudEnabled || !currentUser) {
    return getLocalSubscriptions();
  }

  const { data, error } = await supabaseClient
    .from("subscriptions")
    .select(
      "name, amount, billing_cycle, next_payment, autopay"
    )
    .eq("user_id", currentUser.id);

  if (error) {
    console.warn("Could not load subscriptions.", error);
    return getLocalSubscriptions();
  }

  return (data || []).map(function (subscription) {
    return {
      ...subscription,
      billingCycle: subscription.billing_cycle,
      nextPayment: subscription.next_payment
    };
  });
}

async function getUpcomingBills(endDate) {
  const [
    recurringTransactions,
    subscriptions
  ] = await Promise.all([
    getRecurringTransactions(),
    getSubscriptions()
  ]);

  const events = [];

  recurringTransactions.forEach(function (transaction) {
    if (
      transaction.active === false ||
      transaction.type !== "expense"
    ) {
      return;
    }

    const amount = Number(transaction.amount) || 0;

    const firstDate = dateFromString(
      transaction.startDate ||
      transaction.start_date
    );

    if (amount <= 0 || !firstDate) {
      return;
    }

    let date = getNextDate(
      firstDate,
      transaction.frequency
    );

    while (date <= endDate) {
      events.push({
        date: new Date(date),
        amount,
        type: "expense",
        description:
          transaction.description ||
          "Recurring expense",
        source: "recurring"
      });

      date = addFrequency(
        date,
        transaction.frequency
      );
    }
  });

  subscriptions.forEach(function (subscription) {
    const amount = Number(subscription.amount) || 0;

    const firstDate = dateFromString(
      subscription.nextPayment ||
      subscription.next_payment
    );

    if (amount <= 0 || !firstDate) {
      return;
    }

    const billingCycle = String(
      subscription.billingCycle ||
      subscription.billing_cycle ||
      ""
    ).toLowerCase();

    const frequency =
      billingCycle === "yearly"
        ? "yearly"
        : "monthly";

    let date = getNextDate(firstDate, frequency);

    while (date <= endDate) {
      events.push({
        date: new Date(date),
        amount,
        type: "expense",
        description: subscription.name || "Subscription",
        source: "subscription"
      });

      date = addFrequency(date, frequency);
    }
  });

  return removeDuplicateEvents(events);
}

function removeDuplicateEvents(events) {
  const seen = new Set();

  return events.filter(function (event) {
    const key = [
      event.type,
      String(event.description).toLowerCase(),
      Number(event.amount).toFixed(2),
      dateToString(event.date)
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getUpcomingPaychecks(endDate) {
  const events = [];

  paycheckPlans.forEach(function (plan) {
    if (plan.active === false) {
      return;
    }

    const amount = Number(plan.amount) || 0;
    const firstDate = dateFromString(plan.nextPayday);

    if (amount <= 0 || !firstDate) {
      return;
    }

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

      date = addFrequency(
        date,
        plan.frequency
      );
    }
  });

  return events;
}

async function calculatePlannerResult() {
  if (paycheckPlans.length === 0) {
    return null;
  }

  const today = todayAtMidnight();

  const nextPayday = paycheckPlans
    .filter(function (plan) {
      return plan.active !== false;
    })
    .map(function (plan) {
      const date = dateFromString(plan.nextPayday);

      return date
        ? getNextDate(date, plan.frequency)
        : null;
    })
    .filter(Boolean)
    .sort(function (first, second) {
      return first - second;
    })[0];

  if (!nextPayday) {
    return null;
  }

  const [
    paychecks,
    bills
  ] = await Promise.all([
    Promise.resolve(getUpcomingPaychecks(nextPayday)),
    getUpcomingBills(nextPayday)
  ]);

  const expectedIncome = paychecks.reduce(
    function (total, event) {
      return total + event.amount;
    },
    0
  );

  const billsBeforePayday = bills.reduce(
    function (total, event) {
      return total + event.amount;
    },
    0
  );

  const currentBalance =
    Number(plannerSettings.currentBalance) || 0;

  const plannedSavings =
    Number(plannerSettings.plannedSavings) || 0;

  const safeToSpend =
    currentBalance +
    expectedIncome -
    billsBeforePayday -
    plannedSavings;

  const daysRemaining = daysBetween(
    today,
    nextPayday
  );

  const dailyAllowance =
    safeToSpend > 0
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
  ].sort(function (first, second) {
    return first.date - second.date;
  });

  let projectedBalance = currentBalance;
  let lowestBalance =
    currentBalance - plannedSavings;

  timelineEvents.forEach(function (event) {
    if (event.source === "savings") {
      return;
    }

    if (event.type === "income") {
      projectedBalance += event.amount;
    } else {
      projectedBalance -= event.amount;
    }

    lowestBalance = Math.min(
      lowestBalance,
      projectedBalance
    );
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

async function updatePaycheckSummary() {
  const result = await calculatePlannerResult();

  if (!result) {
    paycheckSummary.hidden = true;
    renderPaycheckPlans();
    return;
  }

  paycheckSummary.hidden = false;

  nextPaydayDisplay.textContent =
    formatDisplayDate(result.nextPayday);

  daysRemainingDisplay.textContent =
    result.daysRemaining;

  paycheckAmountDisplay.textContent =
    formatMoney(result.expectedIncome);

  billsDisplay.textContent =
    formatMoney(result.billsBeforePayday);

  safeToSpendDisplay.textContent =
    formatMoney(result.safeToSpend);

  dailyAllowanceDisplay.textContent =
    formatMoney(result.dailyAllowance);

  lowestBalanceDisplay.textContent =
    formatMoney(result.lowestBalance);

  if (
    result.lowestBalance < 0 ||
    result.safeToSpend < 0
  ) {
    paycheckWarning.textContent =
      "Warning: your projected balance may become negative before payday.";

    paycheckWarning.className =
      "paycheck-warning warning-danger";
  } else if (result.lowestBalance < 100) {
    paycheckWarning.textContent =
      "Your projected balance is getting low before payday.";

    paycheckWarning.className =
      "paycheck-warning warning-caution";
  } else {
    paycheckWarning.textContent =
      "Your projected balance remains positive before payday.";

    paycheckWarning.className =
      "paycheck-warning warning-safe";
  }

  renderPaycheckPlans();
}

function renderPaycheckPlans() {
  paycheckPlansList.innerHTML = "";

  if (paycheckPlans.length === 0) {
    const message = document.createElement("p");

    message.className = "empty-message";
    message.textContent =
      "No paycheck plans added yet.";

    paycheckPlansList.appendChild(message);
    return;
  }

  paycheckPlans.forEach(function (plan, index) {
    const item = document.createElement("div");
    item.className = "paycheck-plan-item";

    const details = document.createElement("div");
    details.className = "paycheck-plan-details";

    const title = document.createElement("strong");
    title.textContent = plan.name;

    const description = document.createElement("span");
    description.textContent =
      `$${formatMoney(plan.amount)} • ` +
      `${plan.frequency} • ` +
      `Next: ${plan.nextPayday}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className =
      "delete-button small-button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener(
      "click",
      async function () {
        const planToDelete = paycheckPlans[index];

        paycheckPlans.splice(index, 1);
        saveLocalData();

        await deletePlanFromCloud(planToDelete.id);
        await updatePaycheckSummary();
      }
    );

    details.append(title, description);
    item.append(details, deleteButton);
    paycheckPlansList.appendChild(item);
  });
}

paycheckForm.addEventListener(
  "submit",
  async function (event) {
    event.preventDefault();

    const currentBalance =
      Number(currentBalanceInput.value);

    const name =
      paycheckNameInput.value.trim();

    const amount =
      Number(paycheckAmountInput.value);

    const frequency =
      paycheckFrequencyInput.value;

    const nextPayday =
      nextPaydayInput.value;

    const plannedSavings =
      Number(plannedSavingsInput.value || 0);

    if (
      !Number.isFinite(currentBalance) ||
      currentBalance < 0
    ) {
      alert("Please enter a valid current balance.");
      return;
    }

    if (!name) {
      alert("Please enter an income source.");
      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      alert("Please enter a valid paycheck amount.");
      return;
    }

    if (!frequency) {
      alert("Please choose a pay frequency.");
      return;
    }

    if (
      !nextPayday ||
      !dateFromString(nextPayday)
    ) {
      alert("Please choose a valid next payday.");
      return;
    }

    if (
      !Number.isFinite(plannedSavings) ||
      plannedSavings < 0
    ) {
      alert("Please enter a valid savings amount.");
      return;
    }

    plannerSettings = {
      currentBalance,
      plannedSavings
    };

    saveLocalData();

    if (cloudEnabled) {
      await saveSettingsToCloud();
    }

    const localPlan = {
      id: Date.now(),
      name,
      amount,
      frequency,
      nextPayday,
      active: true
    };

    const cloudPlan =
      await savePlanToCloud(localPlan);

    paycheckPlans.push(cloudPlan || localPlan);

    saveLocalData();

    await updatePaycheckSummary();

    paycheckForm.reset();
    plannedSavingsInput.value = "0";

    alert("Paycheck plan saved.");
  }
);

async function initializePaycheckPlanner() {
  try {
    cloudEnabled =
      await loadCloudPlannerData();
  } catch (error) {
    console.warn(
      "Using local paycheck planner data.",
      error
    );

    cloudEnabled = false;
  }

  currentBalanceInput.value =
    plannerSettings.currentBalance || "";

  plannedSavingsInput.value =
    plannerSettings.plannedSavings || "0";

  await updatePaycheckSummary();
}

initializePaycheckPlanner();