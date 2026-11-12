const addActionSheet = document.querySelector(
    "#add-action-sheet"
  );
  
  const addSavingsSheet = document.querySelector(
    "#add-savings-sheet"
  );
  
  const quickAddButton = document.querySelector(
    "#quick-add-expense-button"
  );
  
  const chooseExpenseButton = document.querySelector(
    "#choose-add-expense"
  );
  
  const chooseSavingsButton = document.querySelector(
    "#choose-add-savings"
  );
  
  const chooseIncomeButton = document.querySelector(
    "#choose-add-income"
  );
  
  const closeIncomeModalButton = document.querySelector(
    "#close-income-modal"
  );
  
  const quickSavingsForm = document.querySelector(
    "#quick-savings-form"
  );
  
  const quickSavingsGoal = document.querySelector(
    "#quick-savings-goal"
  );
  
  const quickSavingsAmount = document.querySelector(
    "#quick-savings-amount"
  );
  
  function openSheet(sheet) {
    if (!sheet) return;
  
    sheet.hidden = false;
    document.body.classList.add("sheet-open");
  }
  
  function closeSheet(sheet) {
    if (!sheet) return;
  
    sheet.hidden = true;
  
    if (
      addActionSheet.hidden &&
      addSavingsSheet.hidden
    ) {
      document.body.classList.remove("sheet-open");
    }
  }
  
  function closeAllSheets() {
    if (addActionSheet) {
      addActionSheet.hidden = true;
    }
  
    if (addSavingsSheet) {
      addSavingsSheet.hidden = true;
    }
  
    document.body.classList.remove("sheet-open");
    closeIncomeForm();
  }
  
  function getSavingsGoals() {
    try {
      const savedGoals = JSON.parse(
        localStorage.getItem("savings-goals") || "[]"
      );
  
      return Array.isArray(savedGoals)
        ? savedGoals
        : [];
    } catch {
      return [];
    }
  }
  
  function loadSavingsGoalsIntoSelect() {
    const goals = getSavingsGoals();
  
    quickSavingsGoal.innerHTML = "";
  
    if (goals.length === 0) {
      const option = document.createElement("option");
  
      option.value = "";
      option.textContent =
        "Create a savings goal first";
  
      quickSavingsGoal.appendChild(option);
      quickSavingsGoal.disabled = true;
  
      return;
    }
  
    quickSavingsGoal.disabled = false;
  
    goals.forEach(function (goal, index) {
      const option = document.createElement("option");
  
      option.value = index;
      option.textContent =
        `${goal.name} — $${Number(
          goal.current
        ).toFixed(2)} saved`;
  
      quickSavingsGoal.appendChild(option);
    });
  }
  
  function openAddExpenseForm() {
    closeSheet(addActionSheet);
  
    if (typeof focusExpenseForm === "function") {
      focusExpenseForm();
      return;
    }
  
    const expenseForm = document.querySelector(
      "#expense-form"
    );
  
    if (expenseForm) {
      expenseForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }
  
  function openAddSavingsForm() {
    closeSheet(addActionSheet);
  
    loadSavingsGoalsIntoSelect();
    quickSavingsAmount.value = "";
  
    openSheet(addSavingsSheet);
  
    setTimeout(function () {
      quickSavingsGoal.focus();
    }, 250);
  }
  
  function openIncomeForm() {
    closeSheet(addActionSheet);
  
    document.body.classList.add(
      "income-modal-open"
    );
  
    const incomeInput = document.querySelector(
      "#income"
    );
  
    if (incomeInput) {
      setTimeout(function () {
        incomeInput.focus();
      }, 250);
    }
  }
  
  function closeIncomeForm() {
    document.body.classList.remove(
      "income-modal-open"
    );
  }
  
  /*
    Capture the plus-button click before script.js
    opens the expense form automatically.
  */
  if (quickAddButton) {
    quickAddButton.addEventListener(
      "click",
      function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
  
        openSheet(addActionSheet);
      },
      true
    );
  }
  
  if (chooseExpenseButton) {
    chooseExpenseButton.addEventListener(
      "click",
      openAddExpenseForm
    );
  }
  
  if (chooseSavingsButton) {
    chooseSavingsButton.addEventListener(
      "click",
      openAddSavingsForm
    );
  }
  
  if (chooseIncomeButton) {
    chooseIncomeButton.addEventListener(
      "click",
      openIncomeForm
    );
  }
  
  document.querySelector(
    "#close-action-sheet"
  )?.addEventListener(
    "click",
    function () {
      closeSheet(addActionSheet);
    }
  );
  
  document.querySelector(
    "#cancel-add-action"
  )?.addEventListener(
    "click",
    function () {
      closeSheet(addActionSheet);
    }
  );
  
  document.querySelector(
    "#close-savings-sheet"
  )?.addEventListener(
    "click",
    function () {
      closeSheet(addSavingsSheet);
    }
  );
  
  document.querySelector(
    "#cancel-savings-sheet"
  )?.addEventListener(
    "click",
    function () {
      closeSheet(addSavingsSheet);
    }
  );
  
  if (closeIncomeModalButton) {
    closeIncomeModalButton.addEventListener(
      "click",
      closeIncomeForm
    );
  }
  
  /*
    Close the income sheet after saving.
  */
  document.querySelector(
    "#income-form"
  )?.addEventListener(
    "submit",
    function () {
      setTimeout(function () {
        closeIncomeForm();
      }, 0);
    }
  );
  
  /*
    Add money to an existing savings goal.
  */
  quickSavingsForm?.addEventListener(
    "submit",
    function (event) {
      event.preventDefault();
  
      const goals = getSavingsGoals();
      const goalIndex = Number(
        quickSavingsGoal.value
      );
  
      const amount = Number(
        quickSavingsAmount.value
      );
  
      if (!goals[goalIndex]) {
        alert("Please create a savings goal first.");
        return;
      }
  
      if (!Number.isFinite(amount) || amount <= 0) {
        alert("Please enter an amount greater than zero.");
        return;
      }
  
      const selectedGoal = goals[goalIndex];
  
      const currentAmount =
        Number(selectedGoal.current) || 0;
  
      const targetAmount =
        Number(selectedGoal.target) || 0;
  
      const newAmount =
        currentAmount + amount;
  
      if (newAmount > targetAmount) {
        alert(
          `You can only add $${(
            targetAmount - currentAmount
          ).toFixed(2)} to this goal.`
        );
  
        return;
      }
  
      selectedGoal.current = newAmount;
  
      localStorage.setItem(
        "savings-goals",
        JSON.stringify(goals)
      );
  
      if (typeof renderSavingsGoals === "function") {
        renderSavingsGoals();
      }
  
      if (typeof showMessage === "function") {
        showMessage("Money added to savings.");
      }
  
      quickSavingsForm.reset();
      closeSheet(addSavingsSheet);
    }
  );
  
  /*
    Open an edit form when an existing savings goal
    or expense uses its Edit button.
  */
  document.addEventListener(
    "click",
    function (event) {
      if (
        event.target.closest(
          ".savings-buttons .edit-button"
        )
      ) {
        closeAllSheets();
      }
  
      if (
        event.target.closest(
          ".expense-actions .edit-button"
        )
      ) {
        closeAllSheets();
      }
    }
  );
  
  /*
    Escape closes every open sheet.
  */
  document.addEventListener(
    "keydown",
    function (event) {
      if (event.key === "Escape") {
        closeAllSheets();
      }
    }
  );