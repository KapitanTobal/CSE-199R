const cloudSavingsForm = document.querySelector("#savings-form");
const cloudSavingsName = document.querySelector("#savings-name");
const cloudSavingsTarget = document.querySelector("#savings-target");
const cloudSavingsCurrent = document.querySelector("#savings-current");
const cloudSavingsSubmit = document.querySelector("#savings-submit-button");
const cloudSavingsList = document.querySelector("#savings-goals-list");
const cloudAddSavingsButton = document.querySelector(
  "#add-savings-goal-button"
);
const cloudQuickSavingsForm = document.querySelector(
  "#quick-savings-form"
);
const cloudQuickSavingsGoal = document.querySelector(
  "#quick-savings-goal"
);
const cloudQuickSavingsAmount = document.querySelector(
  "#quick-savings-amount"
);
const cloudChooseSavingsButton = document.querySelector(
  "#choose-add-savings"
);
const cloudAddSavingsSheet = document.querySelector(
  "#add-savings-sheet"
);
const cloudAddActionSheet = document.querySelector(
  "#add-action-sheet"
);

let cloudSavingsGoals = [];
let cloudEditingGoalId = null;

async function getSavingsUser() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Could not get savings user:", error);
    return null;
  }

  return data.user;
}

function readLocalSavingsGoals() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("savings-goals") || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

async function migrateSavingsGoals(user) {
  const migrationKey = `savings-migrated-${user.id}`;

  if (localStorage.getItem(migrationKey)) {
    return;
  }

  const { data: existing, error } = await supabaseClient
    .from("savings_goals")
    .select("id")
    .eq("user_id", user.id);

  if (error) {
    console.error("Could not check savings goals:", error);
    return;
  }

  const localGoals = readLocalSavingsGoals();

  if ((!existing || existing.length === 0) && localGoals.length > 0) {
    const goalsToInsert = localGoals.map(function (goal) {
      return {
        user_id: user.id,
        name: goal.name,
        target: Number(goal.target) || 0,
        current_amount: Number(goal.current) || 0
      };
    });

    const { error: insertError } = await supabaseClient
      .from("savings_goals")
      .insert(goalsToInsert);

    if (insertError) {
      console.error("Could not migrate savings goals:", insertError);
      return;
    }

    if (typeof showMessage === "function") {
      showMessage("Your savings goals were imported.");
    }
  }

  localStorage.setItem(migrationKey, "true");
}

function formatSavingsMoney(amount) {
  return Number(amount || 0).toFixed(2);
}

function closeSavingsMenus(except) {
  document.querySelectorAll(".savings-buttons").forEach(function (menu) {
    if (menu !== except) {
      menu.hidden = true;
    }
  });
}

async function loadCloudSavingsGoals() {
  const user = await getSavingsUser();

  if (!user) {
    cloudSavingsGoals = [];
    renderCloudSavingsGoals();
    return;
  }

  await migrateSavingsGoals(user);

  const { data, error } = await supabaseClient
    .from("savings_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Could not load savings goals:", error);
    return;
  }

  cloudSavingsGoals = (data || []).map(function (goal) {
    return {
      id: goal.id,
      name: goal.name,
      target: Number(goal.target),
      current: Number(goal.current_amount)
    };
  });

  renderCloudSavingsGoals();
  populateCloudSavingsSelect();
}

function renderCloudSavingsGoals() {
  if (!cloudSavingsList) return;

  cloudSavingsList.innerHTML = "";

  if (cloudSavingsGoals.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent = "Add a savings goal to start tracking your progress.";
    cloudSavingsList.appendChild(message);
    return;
  }

  cloudSavingsGoals.forEach(function (goal) {
    const percentage = goal.target > 0
      ? Math.min(Math.round((goal.current / goal.target) * 100), 100)
      : 0;

    const card = document.createElement("div");
    card.className = "savings-goal-card";

    const title = document.createElement("h3");
    title.textContent = goal.name;

    const amounts = document.createElement("div");
    amounts.className = "savings-amounts";
    amounts.innerHTML =
      `<span>$${formatSavingsMoney(goal.current)} saved</span>` +
      `<span>Goal: $${formatSavingsMoney(goal.target)}</span>`;

    const progressBar = document.createElement("div");
    progressBar.className = "savings-progress-bar";

    const progressFill = document.createElement("div");
    progressFill.className = "savings-progress-fill";
    progressFill.style.width = `${percentage}%`;
    progressBar.appendChild(progressFill);

    const percent = document.createElement("p");
    percent.className = "savings-progress-percent";
    percent.textContent = `${percentage}% complete`;

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "more-button";
    menuButton.textContent = "•••";
    menuButton.setAttribute("aria-label", `More options for ${goal.name}`);

    const actions = document.createElement("div");
    actions.className = "card-actions savings-buttons";
    actions.hidden = true;

    menuButton.addEventListener("click", function () {
      closeSavingsMenus(actions);
      actions.hidden = !actions.hidden;
    });

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.textContent = "Edit";

    editButton.addEventListener("click", function () {
      cloudEditingGoalId = goal.id;
      cloudSavingsName.value = goal.name;
      cloudSavingsTarget.value = goal.target;
      cloudSavingsCurrent.value = goal.current;
      cloudSavingsSubmit.textContent = "Update Goal";
      cloudSavingsForm.hidden = false;
      cloudSavingsName.focus();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-goal-button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", async function () {
      if (!confirm(`Delete "${goal.name}"?`)) return;

      const { error } = await supabaseClient
        .from("savings_goals")
        .delete()
        .eq("id", goal.id);

      if (error) {
        console.error(error);
        alert("Unable to delete savings goal.");
        return;
      }

      await loadCloudSavingsGoals();

      if (typeof showMessage === "function") {
        showMessage("Savings goal deleted.");
      }
    });

    actions.append(editButton, deleteButton);
    card.append(title, amounts, progressBar, percent, menuButton, actions);
    cloudSavingsList.appendChild(card);
  });
}

function populateCloudSavingsSelect() {
  if (!cloudQuickSavingsGoal) return;

  cloudQuickSavingsGoal.innerHTML = "";

  if (cloudSavingsGoals.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Create a savings goal first";
    cloudQuickSavingsGoal.appendChild(option);
    cloudQuickSavingsGoal.disabled = true;
    return;
  }

  cloudQuickSavingsGoal.disabled = false;

  cloudSavingsGoals.forEach(function (goal) {
    const option = document.createElement("option");
    option.value = goal.id;
    option.textContent = `${goal.name} — $${formatSavingsMoney(goal.current)} saved`;
    cloudQuickSavingsGoal.appendChild(option);
  });
}

cloudSavingsForm?.addEventListener("submit", async function (event) {
  event.preventDefault();
  event.stopImmediatePropagation();

  const user = await getSavingsUser();
  const name = cloudSavingsName.value.trim();
  const target = Number(cloudSavingsTarget.value);
  const current = Number(cloudSavingsCurrent.value);

  if (!user) {
    alert("Please log in before saving a savings goal.");
    return;
  }

  if (!name || !Number.isFinite(target) || target <= 0) {
    alert("Please enter a valid goal name and target.");
    return;
  }

  if (!Number.isFinite(current) || current < 0 || current > target) {
    alert("Amount saved must be between $0 and the target.");
    return;
  }

  let result;

  if (cloudEditingGoalId) {
    result = await supabaseClient
      .from("savings_goals")
      .update({
        name,
        target,
        current_amount: current
      })
      .eq("id", cloudEditingGoalId);
  } else {
    result = await supabaseClient
      .from("savings_goals")
      .insert({
        user_id: user.id,
        name,
        target,
        current_amount: current
      });
  }

  if (result.error) {
    console.error(result.error);
    alert("Unable to save savings goal.");
    return;
  }

  cloudEditingGoalId = null;
  cloudSavingsForm.reset();
  cloudSavingsForm.hidden = true;
  cloudSavingsSubmit.textContent = "Save Goal";

  await loadCloudSavingsGoals();

  if (typeof showMessage === "function") {
    showMessage("Savings goal saved.");
  }
}, true);

cloudQuickSavingsForm?.addEventListener("submit", async function (event) {
  event.preventDefault();
  event.stopImmediatePropagation();

  const goalId = cloudQuickSavingsGoal.value;
  const amount = Number(cloudQuickSavingsAmount.value);
  const goal = cloudSavingsGoals.find(function (item) {
    return item.id === goalId;
  });

  if (!goal) {
    alert("Please create a savings goal first.");
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Please enter an amount greater than zero.");
    return;
  }

  const newAmount = goal.current + amount;

  if (newAmount > goal.target) {
    alert(`You can only add $${formatSavingsMoney(goal.target - goal.current)} to this goal.`);
    return;
  }

  const { error } = await supabaseClient
    .from("savings_goals")
    .update({ current_amount: newAmount })
    .eq("id", goal.id);

  if (error) {
    console.error(error);
    alert("Unable to add money to savings.");
    return;
  }

  cloudQuickSavingsForm.reset();
  cloudAddSavingsSheet.hidden = true;
  document.body.classList.remove("sheet-open");

  await loadCloudSavingsGoals();

  if (typeof showMessage === "function") {
    showMessage("Money added to savings.");
  }
}, true);

cloudChooseSavingsButton?.addEventListener("click", function (event) {
  event.preventDefault();
  event.stopImmediatePropagation();

  if (cloudAddActionSheet) {
    cloudAddActionSheet.hidden = true;
  }

  populateCloudSavingsSelect();
  cloudAddSavingsSheet.hidden = false;
  document.body.classList.add("sheet-open");
}, true);

cloudAddSavingsButton?.addEventListener("click", function () {
  cloudEditingGoalId = null;
  cloudSavingsForm.reset();
  cloudSavingsSubmit.textContent = "Save Goal";
  cloudSavingsForm.hidden = false;
  cloudSavingsName.focus();
});

loadCloudSavingsGoals();
