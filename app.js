const STORAGE_KEY = "things-plans-v1";
const SUPABASE_URL = "https://nfyutrshudnmkvcscobc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_It99CB_ttgCo-ZEwiOR1gQ_y8eNkjwJ";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const defaultCategories = ["School", "Work", "Personal", "Errands"];
const DEFAULT_SETTINGS = {
  accent: "#5267d8",
  event: "#c66c49",
  hardDue: "#c24b4b",
  background: "#f1f3f6",
  density: "comfortable",
  progressEnabled: true,
  progressStyle: "ring",
  completionEffect: true,
};

const state = {
  items: [],
  user: null,
  settings: { ...DEFAULT_SETTINGS },
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: formatDate(new Date()),
  activeTab: "task",
  authMode: "signin",
  passwordRecovery: false,
};

const els = {
  authGate: document.querySelector("#authGate"),
  appShell: document.querySelector("#appShell"),
  authTabs: document.querySelector("#authTabs"),
  signInTab: document.querySelector("#signInTab"),
  signUpTab: document.querySelector("#signUpTab"),
  authForm: document.querySelector("#authForm"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authConfirmPasswordWrap: document.querySelector("#authConfirmPasswordWrap"),
  authConfirmPassword: document.querySelector("#authConfirmPassword"),
  authSubmit: document.querySelector("#authSubmit"),
  forgotPasswordButton: document.querySelector("#forgotPasswordButton"),
  resetRequestForm: document.querySelector("#resetRequestForm"),
  resetEmail: document.querySelector("#resetEmail"),
  passwordResetForm: document.querySelector("#passwordResetForm"),
  newPassword: document.querySelector("#newPassword"),
  confirmNewPassword: document.querySelector("#confirmNewPassword"),
  backToAuthButton: document.querySelector("#backToAuthButton"),
  authMessage: document.querySelector("#authMessage"),
  userEmail: document.querySelector("#userEmail"),
  signOutButton: document.querySelector("#signOutButton"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsModal: document.querySelector("#settingsModal"),
  settingsForm: document.querySelector("#settingsForm"),
  settingAccent: document.querySelector("#settingAccent"),
  settingEvent: document.querySelector("#settingEvent"),
  settingHardDue: document.querySelector("#settingHardDue"),
  settingBackground: document.querySelector("#settingBackground"),
  settingDensity: document.querySelector("#settingDensity"),
  settingProgressEnabled: document.querySelector("#settingProgressEnabled"),
  settingProgressStyle: document.querySelector("#settingProgressStyle"),
  settingCompletionEffect: document.querySelector("#settingCompletionEffect"),
  progressCard: document.querySelector("#progressCard"),
  progressWeekLabel: document.querySelector("#progressWeekLabel"),
  ringProgress: document.querySelector("#ringProgress"),
  ringPercent: document.querySelector("#ringPercent"),
  ringCount: document.querySelector("#ringCount"),
  beerProgress: document.querySelector("#beerProgress"),
  beerCan: document.querySelector("#beerCan"),
  beerPercent: document.querySelector("#beerPercent"),
  beerCount: document.querySelector("#beerCount"),
  progressMessage: document.querySelector("#progressMessage"),
  editModal: document.querySelector("#editModal"),
  editTaskForm: document.querySelector("#editTaskForm"),
  editTaskId: document.querySelector("#editTaskId"),
  editTaskTitle: document.querySelector("#editTaskTitle"),
  editTaskNotes: document.querySelector("#editTaskNotes"),
  editTaskCategory: document.querySelector("#editTaskCategory"),
  editTaskPriority: document.querySelector("#editTaskPriority"),
  editTaskDate: document.querySelector("#editTaskDate"),
  editTaskHardDueDate: document.querySelector("#editTaskHardDueDate"),
  todayList: document.querySelector("#todayList"),
  todayCount: document.querySelector("#todayCount"),
  taskForm: document.querySelector("#taskForm"),
  eventForm: document.querySelector("#eventForm"),
  taskTitle: document.querySelector("#taskTitle"),
  taskNotes: document.querySelector("#taskNotes"),
  taskCategory: document.querySelector("#taskCategory"),
  taskDate: document.querySelector("#taskDate"),
  taskHardDueDate: document.querySelector("#taskHardDueDate"),
  eventDate: document.querySelector("#eventDate"),
  taskList: document.querySelector("#taskList"),
  taskCount: document.querySelector("#taskCount"),
  categoryFilter: document.querySelector("#categoryFilter"),
  categoryOptions: document.querySelector("#categoryOptions"),
  calendarGrid: document.querySelector("#calendarGrid"),
  monthLabel: document.querySelector("#monthLabel"),
  selectedDateMessage: document.querySelector("#selectedDateMessage"),
};

function loadLocalItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveItemsLocally() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function toCloudRow(item) {
  return {
    id: item.id,
    user_id: state.user.id,
    type: item.type,
    title: item.title,
    notes: item.notes || "",
    category: item.category || "General",
    date: item.date || null,
    hard_due_date: item.hardDueDate || null,
    time: item.time || null,
    recurrence: item.recurrence || "none",
    recurrence_end_date: item.recurrenceEndDate || null,
    completed: Boolean(item.completed),
    priority: item.priority || "normal",
    created_at: item.createdAt || Date.now(),
  };
}

function fromCloudRow(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    notes: row.notes || "",
    category: row.category || "General",
    date: row.date || "",
    hardDueDate: row.hard_due_date || "",
    time: row.time || "",
    recurrence: row.recurrence || "none",
    recurrenceEndDate: row.recurrence_end_date || "",
    completed: Boolean(row.completed),
    priority: row.priority || "normal",
    createdAt: Number(row.created_at) || Date.now(),
  };
}

async function saveItems() {
  saveItemsLocally();
  if (!state.user || !state.items.length) return;
  const { error } = await supabaseClient.from("items").upsert(state.items.map(toCloudRow), { onConflict: "id" });
  if (error) console.error("Could not sync planner items:", error.message);
}

async function deleteCloudItem(id) {
  if (!state.user) return;
  const { error } = await supabaseClient.from("items").delete().eq("id", id).eq("user_id", state.user.id);
  if (error) console.error("Could not delete planner item:", error.message);
}

async function loadCloudItems(user) {
  const { data, error } = await supabaseClient
    .from("items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const localItems = loadLocalItems();
  if (!data.length && localItems.length) {
    state.items = localItems;
    await saveItems();
    return;
  }
  state.items = (data || []).map(fromCloudRow);
  saveItemsLocally();
}

function normalizeSettings(settings) {
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

function applySettings() {
  document.documentElement.style.setProperty("--accent", state.settings.accent);
  document.documentElement.style.setProperty("--accent-soft", `${state.settings.accent}18`);
  document.documentElement.style.setProperty("--event", state.settings.event);
  document.documentElement.style.setProperty("--hard-due", state.settings.hardDue);
  document.documentElement.style.setProperty("--page-background", state.settings.background);
  document.body.classList.toggle("compact-calendar", state.settings.density === "compact");
}

function setAuthMessage(message, isError = false) {
  els.authMessage.textContent = message;
  els.authMessage.classList.toggle("error", isError);
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isSignIn = mode === "signin";
  const isSignUp = mode === "signup";
  const isResetRequest = mode === "reset-request";
  const isPasswordReset = mode === "password-reset";
  const isAccountForm = isSignIn || isSignUp;

  els.authTabs.classList.toggle("hidden", !isAccountForm);
  els.authForm.classList.toggle("hidden", !isAccountForm);
  els.resetRequestForm.classList.toggle("hidden", !isResetRequest);
  els.passwordResetForm.classList.toggle("hidden", !isPasswordReset);
  els.forgotPasswordButton.classList.toggle("hidden", !isSignIn);
  els.backToAuthButton.classList.toggle("hidden", isAccountForm || isPasswordReset);
  els.authConfirmPasswordWrap.classList.toggle("hidden", !isSignUp);
  els.authConfirmPassword.required = isSignUp;
  els.authPassword.autocomplete = isSignUp ? "new-password" : "current-password";
  els.authSubmit.textContent = isSignUp ? "Create account" : "Sign in";
  els.signInTab.classList.toggle("active", isSignIn);
  els.signUpTab.classList.toggle("active", isSignUp);
}

function showPasswordResetRequest() {
  state.passwordRecovery = false;
  els.resetEmail.value = els.authEmail.value.trim();
  setAuthMode("reset-request");
  setAuthMessage("Enter your email and we’ll send a password reset link.");
  els.resetEmail.focus();
}

function showPasswordResetForm() {
  state.passwordRecovery = true;
  els.authGate.classList.remove("hidden");
  els.appShell.classList.add("hidden");
  setAuthMode("password-reset");
  setAuthMessage("Choose a new password for your account.");
  els.newPassword.focus();
}

function authRedirectUrl() {
  return window.location.href.split("#")[0];
}

async function showSignedInApp(session) {
  if (state.passwordRecovery) return;
  state.user = session.user;
  state.settings = normalizeSettings(session.user.user_metadata?.planner_settings);
  applySettings();
  els.userEmail.textContent = session.user.email || "Signed in";
  els.authGate.classList.add("hidden");
  els.appShell.classList.remove("hidden");
  try {
    await loadCloudItems(session.user);
    renderAll();
  } catch (error) {
    console.error(error);
    setAuthMessage(`Could not load your planner: ${error.message}`, true);
    els.authGate.classList.remove("hidden");
    els.appShell.classList.add("hidden");
  }
}

function showSignedOutApp() {
  state.user = null;
  state.items = [];
  els.userEmail.textContent = "";
  els.appShell.classList.add("hidden");
  els.authGate.classList.remove("hidden");
  if (state.passwordRecovery) {
    showPasswordResetForm();
    return;
  }
  setAuthMode("signin");
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromString(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function readableDate(value, options = { month: "short", day: "numeric" }) {
  return dateFromString(value).toLocaleDateString(undefined, options);
}

function currentWeekBounds() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { start: formatDate(start), end: formatDate(end) };
}

function weeklyTaskProgress() {
  const { start, end } = currentWeekBounds();
  const tasks = state.items.filter((item) => item.type === "task" && item.date && item.date >= start && item.date <= end);
  const completed = tasks.filter((task) => task.completed).length;
  return { start, end, total: tasks.length, completed };
}

function renderWeeklyProgress() {
  els.progressCard.classList.toggle("hidden", !state.settings.progressEnabled);
  if (!state.settings.progressEnabled) return;

  const { start, end, total, completed } = weeklyTaskProgress();
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const remaining = Math.max(0, total - completed);
  const remainingPercent = total ? Math.round((remaining / total) * 100) : 100;
  const weekLabel = `${readableDate(start)} – ${readableDate(end)}`;

  els.progressWeekLabel.textContent = `${weekLabel} · planned tasks`;
  els.ringProgress.style.setProperty("--progress", `${percent}%`);
  els.ringPercent.textContent = `${percent}%`;
  els.ringCount.textContent = `${completed} of ${total} done`;
  els.ringProgress.classList.toggle("hidden", state.settings.progressStyle !== "ring");
  els.beerProgress.classList.toggle("hidden", state.settings.progressStyle !== "beer");
  els.beerCan.style.setProperty("--beer-remaining", `${remainingPercent}%`);
  els.beerCan.classList.toggle("crumpled", total > 0 && remaining === 0);
  els.beerPercent.textContent = `${remainingPercent}% left`;
  els.beerCount.textContent = `${completed} of ${total} done`;
  els.beerCan.setAttribute("aria-label", `${remainingPercent}% of the week's planned tasks remain`);

  if (!total) {
    els.progressMessage.textContent = "Nothing planned this week yet.";
  } else if (!remaining) {
    els.progressMessage.textContent = "You cleared the week! 🎉";
  } else {
    els.progressMessage.textContent = `${remaining} task${remaining === 1 ? "" : "s"} left this week.`;
  }
}

function triggerCompletionEffect(rect) {
  if (!state.settings.completionEffect || !rect) return;
  const burst = document.createElement("div");
  burst.className = "completion-burst";
  burst.style.left = `${rect.left + rect.width / 2}px`;
  burst.style.top = `${rect.top + rect.height / 2}px`;
  const colors = ["var(--accent)", "#e5a93d", "#61a878", "#c66c49"];
  const symbols = ["✦", "•", "✓", "✧"];
  for (let index = 0; index < 14; index += 1) {
    const particle = document.createElement("span");
    const angle = (Math.PI * 2 * index) / 14;
    const distance = 22 + (index % 3) * 9;
    particle.className = "completion-particle";
    particle.textContent = symbols[index % symbols.length];
    particle.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
    particle.style.color = colors[index % colors.length];
    particle.style.animationDelay = `${(index % 4) * 18}ms`;
    burst.appendChild(particle);
  }
  document.body.appendChild(burst);
  window.setTimeout(() => burst.remove(), 900);
}

function toggleTaskCompletion(task, target) {
  const wasCompleted = task.completed;
  const rect = target?.getBoundingClientRect?.();
  task.completed = !task.completed;
  void saveItems();
  renderAll();
  if (!wasCompleted && task.completed) triggerCompletionEffect(rect);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[character]));
}

function getCategories() {
  const categories = new Set(defaultCategories);
  state.items.filter((item) => item.type === "task").forEach((item) => categories.add(item.category || "General"));
  return [...categories].sort((a, b) => a.localeCompare(b));
}

function renderCategoryControls() {
  const categories = getCategories();
  const previous = els.categoryFilter.value || "all";
  els.categoryFilter.innerHTML = `<option value="all">All categories</option>${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
  els.categoryFilter.value = categories.includes(previous) ? previous : "all";
  els.categoryOptions.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
}

function validTaskDates(planDate, hardDueDate) {
  if (planDate && hardDueDate && planDate > hardDueDate) {
    alert("The hard due date should be on or after the planned work date.");
    return false;
  }
  return true;
}

function openEditModal(task) {
  els.editTaskId.value = task.id;
  els.editTaskTitle.value = task.title || "";
  els.editTaskNotes.value = task.notes || "";
  els.editTaskCategory.value = task.category || "General";
  els.editTaskPriority.value = task.priority || "normal";
  els.editTaskDate.value = task.date || "";
  els.editTaskHardDueDate.value = task.hardDueDate || "";
  els.editModal.classList.remove("hidden");
}

function closeModal(id) {
  document.querySelector(`#${id}`).classList.add("hidden");
}

function todayEntries() {
  const today = formatDate(new Date());
  const entries = [];
  state.items.forEach((item) => {
    if (item.type === "event" && eventOccursOnDate(item, today)) {
      entries.push({ item, kind: item.time ? formatTime(item.time) : "Event", rank: 0 });
      return;
    }
    if (item.type !== "task") return;
    const labels = [];
    if (item.date === today) labels.push("Plan today");
    if (item.hardDueDate === today) labels.push("Hard due");
    if (labels.length) entries.push({ item, kind: labels.join(" · "), rank: item.priority === "high" ? 1 : 2 });
  });
  return entries.sort((a, b) => a.rank - b.rank || (a.item.time || "99:99").localeCompare(b.item.time || "99:99"));
}

function renderTodayList() {
  const entries = todayEntries();
  els.todayCount.textContent = entries.filter((entry) => entry.item.type === "event" || !entry.item.completed).length;
  els.todayList.innerHTML = "";
  if (!entries.length) {
    els.todayList.innerHTML = `<div class="today-empty">Nothing scheduled for today.</div>`;
    return;
  }
  entries.forEach(({ item, kind }) => {
    const row = document.createElement("div");
    row.className = `today-item${item.completed ? " done" : ""}`;
    if (item.type === "task") {
      const check = document.createElement("button");
      check.className = `today-check${item.completed ? " done" : ""}`;
      check.setAttribute("aria-label", item.completed ? "Mark task incomplete" : "Mark task complete");
      check.addEventListener("click", (event) => toggleTaskCompletion(item, event.currentTarget));
      row.appendChild(check);
    } else {
      const dot = document.createElement("span");
      dot.className = "legend-dot event-dot";
      row.appendChild(dot);
    }
    const title = document.createElement("span");
    title.className = "today-item-title";
    title.textContent = item.title;
    row.appendChild(title);
    const kindLabel = document.createElement("span");
    kindLabel.className = "today-kind";
    kindLabel.textContent = kind;
    row.appendChild(kindLabel);
    if (item.type === "task") {
      const edit = document.createElement("button");
      edit.className = "edit-button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => openEditModal(item));
      row.appendChild(edit);
    }
    els.todayList.appendChild(row);
  });
}

function renderTasks() {
  const filter = els.categoryFilter.value || "all";
  const tasks = state.items
    .filter((item) => item.type === "task" && (filter === "all" || item.category === filter))
    .sort((a, b) => Number(a.completed) - Number(b.completed) || (a.date || "9999").localeCompare(b.date || "9999") || b.createdAt - a.createdAt);

  els.taskCount.textContent = tasks.filter((task) => !task.completed).length;
  if (!tasks.length) {
    els.taskList.innerHTML = `<div class="empty-state">No tasks here yet.<br />Add one above to get started.</div>`;
    return;
  }

  const template = document.querySelector("#taskTemplate");
  els.taskList.innerHTML = "";
  tasks.forEach((task) => {
    const node = template.content.cloneNode(true);
    const item = node.querySelector(".task-item");
    const check = node.querySelector(".check-button");
    const title = node.querySelector(".task-title");
    const editButton = node.querySelector(".edit-button");
    const category = node.querySelector(".category-pill");
    const schedule = node.querySelector(".task-schedule");
    const priorityBadge = node.querySelector(".priority-badge");
    const hardDueBadge = node.querySelector(".hard-due-badge");
    const notes = node.querySelector(".task-notes");
    const deleteButton = node.querySelector(".delete-button");
    const scheduleControl = node.querySelector(".schedule-control");
    const planDateInput = node.querySelector(".plan-date-input");
    const hardDateInput = node.querySelector(".hard-date-input");
    const saveButton = node.querySelector(".small-button");

    item.dataset.id = task.id;
    if (task.completed) item.classList.add("completed");
    check.setAttribute("aria-label", task.completed ? "Mark task incomplete" : "Mark task complete");
    title.textContent = task.title;
    category.textContent = task.category || "General";
    schedule.textContent = task.date ? readableDate(task.date) : "Unscheduled";
    if (!task.date) schedule.classList.add("unscheduled");
    planDateInput.value = task.date || "";
    hardDateInput.value = task.hardDueDate || "";
    priorityBadge.textContent = task.priority || "normal";
    priorityBadge.className = `priority-badge ${task.priority || "normal"}`;
    if (task.hardDueDate) {
      hardDueBadge.textContent = `Hard: ${readableDate(task.hardDueDate)}`;
      hardDueBadge.classList.remove("hidden");
    }
    if (task.notes) {
      notes.textContent = task.notes;
      notes.classList.remove("hidden");
    }

    if (!task.date || !task.hardDueDate) {
      scheduleControl.classList.remove("hidden");
      saveButton.addEventListener("click", () => {
        if (!validTaskDates(planDateInput.value, hardDateInput.value)) {
          return;
        }
        task.date = planDateInput.value;
        task.hardDueDate = hardDateInput.value;
        void saveItems();
        renderAll();
      });
    }
    editButton.addEventListener("click", () => openEditModal(task));
    check.addEventListener("click", (event) => toggleTaskCompletion(task, event.currentTarget));
    deleteButton.addEventListener("click", () => {
      state.items = state.items.filter((item) => item.id !== task.id);
      saveItemsLocally();
      void deleteCloudItem(task.id);
      renderAll();
    });
    els.taskList.appendChild(node);
  });
}

function itemsForDate(date) {
  const entries = [];
  state.items.forEach((item) => {
    if (item.type === "event" && eventOccursOnDate(item, date)) {
      entries.push({ ...item, calendarKind: "event", calendarTitle: item.title });
      return;
    }
    if (item.type !== "task") return;
    if (item.hardDueDate === date) {
      entries.push({ ...item, calendarKind: "hard-due", calendarTitle: `Due: ${item.title}` });
    } else if (item.date === date) {
      entries.push({ ...item, calendarKind: "task", calendarTitle: item.title });
    }
  });
  return entries.sort((a, b) => {
    const rank = { event: 0, "hard-due": 1, task: 2 };
    return rank[a.calendarKind] - rank[b.calendarKind] || (a.time || "99:99").localeCompare(b.time || "99:99");
  });
}

function utcDay(value) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function eventOccursOnDate(event, date) {
  if (event.date === date) return true;
  if (!event.recurrence || event.recurrence === "none" || date < event.date) return false;
  if (event.recurrenceEndDate && date > event.recurrenceEndDate) return false;

  const dayDifference = Math.round((utcDay(date) - utcDay(event.date)) / 86400000);
  const weekday = dateFromString(date).getDay();
  if (event.recurrence === "daily") return true;
  if (event.recurrence === "weekdays") return weekday >= 1 && weekday <= 5;
  if (event.recurrence === "weekly") return dayDifference % 7 === 0;
  if (event.recurrence === "monthly") return dateFromString(date).getDate() === dateFromString(event.date).getDate();
  return false;
}

function clearDragHighlights() {
  document.querySelectorAll(".day-cell.drag-over").forEach((cell) => cell.classList.remove("drag-over"));
}

function movePlannedTask(taskId, date) {
  const task = state.items.find((item) => item.id === taskId && item.type === "task");
  if (!task || !task.date || !validTaskDates(date, task.hardDueDate)) return;
  task.date = date;
  selectDate(date);
  void saveItems();
  renderAll();
}

function renderCalendar() {
  const month = state.currentMonth;
  els.monthLabel.textContent = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  els.calendarGrid.innerHTML = "";
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const previousMonthDays = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
  const today = formatDate(new Date());

  for (let index = 0; index < 42; index += 1) {
    const dayOffset = index - firstDay + 1;
    let cellDate;
    let isOtherMonth = false;
    if (dayOffset < 1) {
      cellDate = new Date(month.getFullYear(), month.getMonth() - 1, previousMonthDays + dayOffset);
      isOtherMonth = true;
    } else if (dayOffset > daysInMonth) {
      cellDate = new Date(month.getFullYear(), month.getMonth() + 1, dayOffset - daysInMonth);
      isOtherMonth = true;
    } else {
      cellDate = new Date(month.getFullYear(), month.getMonth(), dayOffset);
    }
    const date = formatDate(cellDate);
    const cell = document.createElement("div");
    cell.className = `day-cell${isOtherMonth ? " other-month" : ""}${date === today ? " today" : ""}${date === state.selectedDate ? " selected" : ""}`;
    cell.tabIndex = 0;
    cell.setAttribute("role", "button");
    cell.setAttribute("aria-label", readableDate(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
    cell.innerHTML = `<span class="day-number">${cellDate.getDate()}</span>`;
    cell.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      cell.classList.add("drag-over");
    });
    cell.addEventListener("dragleave", (event) => {
      if (!event.relatedTarget || !cell.contains(event.relatedTarget)) cell.classList.remove("drag-over");
    });
    cell.addEventListener("drop", (event) => {
      event.preventDefault();
      const taskId = event.dataTransfer?.getData("text/plain");
      clearDragHighlights();
      if (taskId) movePlannedTask(taskId, date);
    });
    const dayItems = itemsForDate(date);
    const visibleItems = dayItems.slice(0, 3);
    visibleItems.forEach((item) => {
      const itemButton = document.createElement("button");
      itemButton.className = `calendar-item ${item.calendarKind}${item.completed ? " done" : ""}`;
      itemButton.title = item.calendarKind === "event" && item.notes ? `${item.title}: ${item.notes}` : item.calendarTitle;
      itemButton.innerHTML = `${item.calendarKind === "event" && item.time ? `<span class="item-time">${escapeHtml(formatTime(item.time))}</span>` : ""}${escapeHtml(item.calendarTitle)}`;
      if (item.calendarKind === "task") {
        itemButton.draggable = true;
        itemButton.title = `${item.title} — drag to reschedule`;
        itemButton.addEventListener("dragstart", (event) => {
          event.dataTransfer?.setData("text/plain", item.id);
          if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
          itemButton.classList.add("dragging");
        });
        itemButton.addEventListener("dragend", () => {
          itemButton.classList.remove("dragging");
          clearDragHighlights();
        });
      }
      itemButton.addEventListener("click", (event) => {
        event.stopPropagation();
        state.selectedDate = date;
        const sourceItem = state.items.find((source) => source.id === item.id);
        if (sourceItem && sourceItem.type === "task") openEditModal(sourceItem);
        renderAll();
      });
      cell.appendChild(itemButton);
    });
    if (dayItems.length > visibleItems.length) {
      const more = document.createElement("div");
      more.className = "more-items";
      more.textContent = `+ ${dayItems.length - visibleItems.length} more`;
      cell.appendChild(more);
    }
    cell.addEventListener("click", () => selectDate(date));
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectDate(date);
      }
    });
    els.calendarGrid.appendChild(cell);
  }
  els.selectedDateMessage.innerHTML = `<strong>${readableDate(state.selectedDate, { weekday: "long", month: "long", day: "numeric" })}</strong> is selected. New items can be added from the left. Drag a planned task to another day to reschedule it.`;
}

function formatTime(time) {
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function selectDate(date) {
  state.selectedDate = date;
  const selected = dateFromString(date);
  state.currentMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
  els.taskDate.value = date;
  els.eventDate.value = date;
  renderCalendar();
}

function resetForm(form) {
  form.reset();
  els.taskDate.value = state.selectedDate;
  els.eventDate.value = state.selectedDate;
}

function renderAll() {
  renderCategoryControls();
  renderTasks();
  renderCalendar();
  renderTodayList();
  renderWeeklyProgress();
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeTab = tab.dataset.tab;
    document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("active", button === tab));
    els.taskForm.classList.toggle("hidden", state.activeTab !== "task");
    els.eventForm.classList.toggle("hidden", state.activeTab !== "event");
  });
});

els.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(els.taskForm);
  const planDate = formData.get("date") || "";
  const hardDueDate = formData.get("hardDueDate") || "";
  if (!validTaskDates(planDate, hardDueDate)) return;
  state.items.push({
    id: makeId("task"), type: "task", title: formData.get("title").trim(),
    notes: formData.get("notes").trim(), category: formData.get("category").trim() || "General",
    date: planDate, hardDueDate,
    priority: formData.get("priority") || "normal",
    completed: false, createdAt: Date.now(),
  });
  saveItems();
  resetForm(els.taskForm);
  renderAll();
});

els.eventForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(els.eventForm);
  state.items.push({
    id: makeId("event"), type: "event", title: formData.get("title").trim(),
    date: formData.get("date"), time: formData.get("time"), notes: formData.get("notes").trim(),
    recurrence: formData.get("recurrence") || "none",
    recurrenceEndDate: formData.get("recurrenceEndDate") || "",
    createdAt: Date.now(),
  });
  saveItems();
  resetForm(els.eventForm);
  renderAll();
});

els.editTaskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const task = state.items.find((item) => item.id === els.editTaskId.value);
  if (!task) return;
  const planDate = els.editTaskDate.value;
  const hardDueDate = els.editTaskHardDueDate.value;
  if (!validTaskDates(planDate, hardDueDate)) return;
  task.title = els.editTaskTitle.value.trim();
  task.notes = els.editTaskNotes.value.trim();
  task.category = els.editTaskCategory.value.trim() || "General";
  task.priority = els.editTaskPriority.value;
  task.date = planDate;
  task.hardDueDate = hardDueDate;
  void saveItems();
  closeModal("editModal");
  renderAll();
});

els.settingsButton.addEventListener("click", () => {
  els.settingAccent.value = state.settings.accent;
  els.settingEvent.value = state.settings.event;
  els.settingHardDue.value = state.settings.hardDue;
  els.settingBackground.value = state.settings.background;
  els.settingDensity.value = state.settings.density;
  els.settingProgressEnabled.checked = state.settings.progressEnabled;
  els.settingProgressStyle.value = state.settings.progressStyle;
  els.settingCompletionEffect.checked = state.settings.completionEffect;
  els.settingsModal.classList.remove("hidden");
});

els.settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.settings = normalizeSettings({
    accent: els.settingAccent.value,
    event: els.settingEvent.value,
    hardDue: els.settingHardDue.value,
    background: els.settingBackground.value,
    density: els.settingDensity.value,
    progressEnabled: els.settingProgressEnabled.checked,
    progressStyle: els.settingProgressStyle.value,
    completionEffect: els.settingCompletionEffect.checked,
  });
  applySettings();
  const { error } = await supabaseClient.auth.updateUser({ data: { planner_settings: state.settings } });
  if (error) console.error("Could not save planner settings:", error.message);
  closeModal("settingsModal");
  renderAll();
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => closeModal(button.dataset.closeModal));
});

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.classList.add("hidden");
  });
});

els.categoryFilter.addEventListener("change", renderTasks);
document.querySelector("#previousMonth").addEventListener("click", () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
  renderCalendar();
});
document.querySelector("#nextMonth").addEventListener("click", () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
  renderCalendar();
});
document.querySelector("#todayButton").addEventListener("click", () => {
  const today = new Date();
  state.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  selectDate(formatDate(today));
});

els.signInTab.addEventListener("click", () => {
  setAuthMode("signin");
  setAuthMessage("");
});

els.signUpTab.addEventListener("click", () => {
  setAuthMode("signup");
  setAuthMessage("");
});

els.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  if (!email || !password) return;

  if (state.authMode === "signup") {
    if (password !== els.authConfirmPassword.value) {
      setAuthMessage("The passwords do not match.", true);
      return;
    }
    setAuthMessage("Creating your account…");
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
      setAuthMessage(error.message, true);
      return;
    }
    if (data.session) {
      await showSignedInApp(data.session);
    } else {
      setAuthMessage("Account created. Email confirmation is still enabled in Supabase, so check your inbox to finish signing in.");
    }
    return;
  }

  setAuthMessage("Signing in…");
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) setAuthMessage(error.message, true);
});

els.forgotPasswordButton.addEventListener("click", showPasswordResetRequest);

els.resetRequestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = els.resetEmail.value.trim();
  if (!email) return;
  setAuthMessage("Sending password reset email…");
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: authRedirectUrl(),
  });
  if (error) {
    setAuthMessage(error.message, true);
    return;
  }
  setAuthMessage("Check your email for the password reset link.");
});

els.passwordResetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = els.newPassword.value;
  if (password !== els.confirmNewPassword.value) {
    setAuthMessage("The passwords do not match.", true);
    return;
  }
  setAuthMessage("Updating your password…");
  const { data, error } = await supabaseClient.auth.updateUser({ password });
  if (error) {
    setAuthMessage(error.message, true);
    return;
  }
  state.passwordRecovery = false;
  setAuthMessage("Password updated. Loading your planner…");
  if (data.user) {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (sessionData.session) await showSignedInApp(sessionData.session);
  }
});

els.backToAuthButton.addEventListener("click", () => {
  state.passwordRecovery = false;
  setAuthMode("signin");
  setAuthMessage("");
});

els.signOutButton.addEventListener("click", async () => {
  state.passwordRecovery = false;
  await supabaseClient.auth.signOut();
  showSignedOutApp();
});

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    showPasswordResetForm();
    return;
  }
  if (state.passwordRecovery) return;
  if (session) void showSignedInApp(session);
  else showSignedOutApp();
});

(async function initializeAuth() {
  if (window.location.hash.includes("type=recovery")) showPasswordResetForm();
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    setAuthMessage(error.message, true);
    return;
  }
  if (data.session && !state.passwordRecovery) await showSignedInApp(data.session);
  else showSignedOutApp();
})();
