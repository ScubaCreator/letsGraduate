const STORAGE_KEY = "things-plans-v1";
const SUPABASE_URL = "https://nfyutrshudnmkvcscobc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_It99CB_ttgCo-ZEwiOR1gQ_y8eNkjwJ";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const defaultCategories = ["School", "Work", "Personal", "Errands"];

const state = {
  items: [],
  user: null,
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: formatDate(new Date()),
  activeTab: "task",
};

const els = {
  authGate: document.querySelector("#authGate"),
  appShell: document.querySelector("#appShell"),
  authForm: document.querySelector("#authForm"),
  authEmail: document.querySelector("#authEmail"),
  authMessage: document.querySelector("#authMessage"),
  userEmail: document.querySelector("#userEmail"),
  signOutButton: document.querySelector("#signOutButton"),
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

function setAuthMessage(message, isError = false) {
  els.authMessage.textContent = message;
  els.authMessage.classList.toggle("error", isError);
}

async function showSignedInApp(session) {
  state.user = session.user;
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
    const category = node.querySelector(".category-pill");
    const schedule = node.querySelector(".task-schedule");
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
        if (planDateInput.value && hardDateInput.value && planDateInput.value > hardDateInput.value) {
          alert("The hard due date should be on or after the planned work date.");
          return;
        }
        task.date = planDateInput.value;
        task.hardDueDate = hardDateInput.value;
        saveItems();
        renderAll();
      });
    }
    check.addEventListener("click", () => {
      task.completed = !task.completed;
      saveItems();
      renderAll();
    });
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
    const dayItems = itemsForDate(date);
    const visibleItems = dayItems.slice(0, 3);
    visibleItems.forEach((item) => {
      const itemButton = document.createElement("button");
      itemButton.className = `calendar-item ${item.calendarKind}${item.completed ? " done" : ""}`;
      itemButton.title = item.calendarKind === "event" && item.notes ? `${item.title}: ${item.notes}` : item.calendarTitle;
      itemButton.innerHTML = `${item.calendarKind === "event" && item.time ? `<span class="item-time">${escapeHtml(formatTime(item.time))}</span>` : ""}${escapeHtml(item.calendarTitle)}`;
      itemButton.addEventListener("click", (event) => {
        event.stopPropagation();
        state.selectedDate = date;
        if (item.calendarKind === "task") {
          item.completed = !item.completed;
          saveItems();
        }
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
  els.selectedDateMessage.innerHTML = `<strong>${readableDate(state.selectedDate, { weekday: "long", month: "long", day: "numeric" })}</strong> is selected. New items can be added from the left.`;
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
  if (planDate && hardDueDate && planDate > hardDueDate) {
    alert("The hard due date should be on or after the planned work date.");
    return;
  }
  state.items.push({
    id: makeId("task"), type: "task", title: formData.get("title").trim(),
    notes: formData.get("notes").trim(), category: formData.get("category").trim() || "General",
    date: planDate, hardDueDate,
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

els.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = els.authEmail.value.trim();
  if (!email) return;
  setAuthMessage("Sending your sign-in link…");
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href.split("#")[0] },
  });
  if (error) {
    setAuthMessage(error.message, true);
    return;
  }
  setAuthMessage("Check your email for the sign-in link.");
});

els.signOutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showSignedOutApp();
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) void showSignedInApp(session);
  else showSignedOutApp();
});

(async function initializeAuth() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    setAuthMessage(error.message, true);
    return;
  }
  if (data.session) await showSignedInApp(data.session);
  else showSignedOutApp();
})();
