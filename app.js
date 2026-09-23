const STORAGE_KEY = "things-plans-v1";
const defaultCategories = ["School", "Work", "Personal", "Errands"];

const state = {
  items: loadItems(),
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: formatDate(new Date()),
  activeTab: "task",
};

const els = {
  taskForm: document.querySelector("#taskForm"),
  eventForm: document.querySelector("#eventForm"),
  taskTitle: document.querySelector("#taskTitle"),
  taskCategory: document.querySelector("#taskCategory"),
  taskDate: document.querySelector("#taskDate"),
  taskSoftDueDate: document.querySelector("#taskSoftDueDate"),
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

function loadItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
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
    const softDueBadge = node.querySelector(".soft-due-badge");
    const hardDueBadge = node.querySelector(".hard-due-badge");
    const deleteButton = node.querySelector(".delete-button");
    const scheduleControl = node.querySelector(".schedule-control");
    const planDateInput = node.querySelector(".plan-date-input");
    const softDateInput = node.querySelector(".soft-date-input");
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
    softDateInput.value = task.softDueDate || "";
    hardDateInput.value = task.hardDueDate || "";
    if (task.softDueDate) {
      softDueBadge.textContent = `Soft: ${readableDate(task.softDueDate)}`;
      softDueBadge.classList.remove("hidden");
    }
    if (task.hardDueDate) {
      hardDueBadge.textContent = `Hard: ${readableDate(task.hardDueDate)}`;
      hardDueBadge.classList.remove("hidden");
    }

    if (!task.date || !task.softDueDate || !task.hardDueDate) {
      scheduleControl.classList.remove("hidden");
      saveButton.addEventListener("click", () => {
        if (softDateInput.value && hardDateInput.value && softDateInput.value > hardDateInput.value) {
          alert("The soft due date should be on or before the hard due date.");
          return;
        }
        task.date = planDateInput.value;
        task.softDueDate = softDateInput.value;
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
      saveItems();
      renderAll();
    });
    els.taskList.appendChild(node);
  });
}

function itemsForDate(date) {
  const entries = [];
  state.items.forEach((item) => {
    if (item.type === "event" && item.date === date) {
      entries.push({ ...item, calendarKind: "event", calendarTitle: item.title });
      return;
    }
    if (item.type !== "task") return;

    if (item.hardDueDate === date) {
      entries.push({ ...item, calendarKind: "hard-due", calendarTitle: `Due: ${item.title}` });
    } else if (item.softDueDate === date) {
      entries.push({ ...item, calendarKind: "soft-due", calendarTitle: `Soft: ${item.title}` });
    } else if (item.date === date) {
      entries.push({ ...item, calendarKind: "task", calendarTitle: item.title });
    }
  });
  return entries.sort((a, b) => {
    const rank = { event: 0, "hard-due": 1, "soft-due": 2, task: 3 };
    return rank[a.calendarKind] - rank[b.calendarKind] || (a.time || "99:99").localeCompare(b.time || "99:99");
  });
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
  const softDueDate = formData.get("softDueDate") || "";
  const hardDueDate = formData.get("hardDueDate") || "";
  if (softDueDate && hardDueDate && softDueDate > hardDueDate) {
    alert("The soft due date should be on or before the hard due date.");
    return;
  }
  state.items.push({
    id: makeId("task"), type: "task", title: formData.get("title").trim(),
    category: formData.get("category").trim() || "General", date: formData.get("date") || "",
    softDueDate, hardDueDate,
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

els.taskDate.value = state.selectedDate;
els.eventDate.value = state.selectedDate;
renderAll();
