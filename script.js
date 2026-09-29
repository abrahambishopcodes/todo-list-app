// ------------------------------------------------------------
// 1. Grab the elements from the page that we need to work with
// ------------------------------------------------------------
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const dueInput = document.getElementById("due-input");
const list = document.getElementById("todo-list");
const emptyMessage = document.getElementById("empty-message");
const filterButtons = document.querySelectorAll("#filters button");
const footer = document.getElementById("footer");
const counter = document.getElementById("counter");
const clearCompletedBtn = document.getElementById("clear-completed");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toast-message");
const undoBtn = document.getElementById("undo-btn");

// ------------------------------------------------------------
// 2. Our data
//    todos: an array (list) of todo objects. Each looks like:
//      { id: 123, text: "Buy milk", done: false, dueDate: "2026-10-01" }
//    (dueDate is "" when the todo has no due date)
//    We load saved data from the browser's storage so it is
//    still there after you refresh the page.
// ------------------------------------------------------------
let todos = JSON.parse(localStorage.getItem("todos")) || [];

// Which todos to show: "all", "active" or "completed"
let currentFilter = localStorage.getItem("filter") || "all";

// Remembers the last deleted todos so they can be brought back (Undo)
let lastDeleted = null;
let toastTimer = null;

// Save the current todos to the browser's storage
function saveTodos() {
  localStorage.setItem("todos", JSON.stringify(todos));
}

// ------------------------------------------------------------
// 3. Due date helpers
// ------------------------------------------------------------

// Today's date as text in the same format the date picker uses: "2026-09-29"
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

// Turn "2026-10-03" into something friendly like "Oct 3"
function formatDate(dateString) {
  const parts = dateString.split("-");
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Build the small "Due ..." label shown under a todo
function createDueLabel(todo) {
  const label = document.createElement("span");
  label.className = "due-label";

  const today = todayString();
  // Dates in "YYYY-MM-DD" format can be compared like normal text
  if (todo.dueDate === today) {
    label.textContent = "Due today";
    label.classList.add("today");
  } else if (todo.dueDate < today && !todo.done) {
    label.textContent = "Overdue · " + formatDate(todo.dueDate);
    label.classList.add("overdue");
  } else {
    label.textContent = "Due " + formatDate(todo.dueDate);
  }
  return label;
}

// ------------------------------------------------------------
// 4. Draw (render) the todos on the page
// ------------------------------------------------------------

// Returns only the todos that match the selected filter
function getVisibleTodos() {
  if (currentFilter === "active") {
    return todos.filter(function (todo) { return !todo.done; });
  }
  if (currentFilter === "completed") {
    return todos.filter(function (todo) { return todo.done; });
  }
  return todos;
}

function renderTodos() {
  // Clear the list first, then rebuild it from our data
  list.innerHTML = "";

  const visibleTodos = getVisibleTodos();

  visibleTodos.forEach(function (todo) {
    // Create the <li> for this todo
    const li = document.createElement("li");
    li.className = "todo-item";
    if (todo.done) {
      li.classList.add("done");
    }

    // Checkbox: mark as done / not done
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.setAttribute("aria-label", "Mark as done");
    checkbox.addEventListener("change", function () {
      toggleTodo(todo.id);
    });

    // The text (and due date, if there is one)
    const body = document.createElement("div");
    body.className = "todo-body";

    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = todo.text;
    span.title = "Double-click to edit";
    span.addEventListener("dblclick", function () {
      startEditing(li, todo);
    });
    body.appendChild(span);

    if (todo.dueDate) {
      body.appendChild(createDueLabel(todo));
    }

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.className = "small-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", function () {
      startEditing(li, todo);
    });

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "small-btn delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", function () {
      deleteTodo(todo.id);
    });

    // Put the pieces inside the <li>, then the <li> inside the list
    li.appendChild(checkbox);
    li.appendChild(body);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });

  // Show a helpful message when there is nothing to show
  if (visibleTodos.length === 0) {
    emptyMessage.style.display = "block";
    if (todos.length === 0) {
      emptyMessage.textContent = "Nothing to do yet. Add your first todo above!";
    } else if (currentFilter === "active") {
      emptyMessage.textContent = "All done! 🎉";
    } else {
      emptyMessage.textContent = "No completed todos yet.";
    }
  } else {
    emptyMessage.style.display = "none";
  }

  renderFooter();
  renderFilters();
}

// Update the "X items left" counter and the Clear completed button
function renderFooter() {
  // Hide the footer and filters when there are no todos at all
  const hasTodos = todos.length > 0;
  footer.style.display = hasTodos ? "flex" : "none";
  document.getElementById("filters").style.display = hasTodos ? "flex" : "none";

  const activeCount = todos.filter(function (todo) { return !todo.done; }).length;
  const completedCount = todos.length - activeCount;

  counter.textContent = activeCount + (activeCount === 1 ? " item left" : " items left");
  clearCompletedBtn.disabled = completedCount === 0;
}

// Highlight the selected filter button
function renderFilters() {
  filterButtons.forEach(function (button) {
    const isSelected = button.dataset.filter === currentFilter;
    button.classList.toggle("active", isSelected);
  });
}

// ------------------------------------------------------------
// 5. The features: add, edit, delete, mark as done
// ------------------------------------------------------------
function addTodo(text, dueDate) {
  const newTodo = {
    id: Date.now(), // the current time works as a simple unique id
    text: text,
    done: false,
    dueDate: dueDate,
  };
  todos.push(newTodo);
  saveTodos();

  // If we're looking at "Completed", switch to "All" so you can see the new todo
  if (currentFilter === "completed") {
    setFilter("all");
  } else {
    renderTodos();
  }
}

function toggleTodo(id) {
  // Find the todo with this id and flip its "done" value
  todos.forEach(function (todo) {
    if (todo.id === id) {
      todo.done = !todo.done;
    }
  });
  saveTodos();
  renderTodos();
}

// Removes every todo that matches the test, but remembers them for Undo
function removeTodos(shouldRemove, message) {
  const removed = [];
  const kept = [];

  todos.forEach(function (todo, index) {
    if (shouldRemove(todo)) {
      removed.push({ todo: todo, index: index }); // remember where it was
    } else {
      kept.push(todo);
    }
  });

  if (removed.length === 0) {
    return;
  }

  todos = kept;
  lastDeleted = removed;
  saveTodos();
  renderTodos();
  showToast(message);
}

function deleteTodo(id) {
  removeTodos(function (todo) { return todo.id === id; }, "Todo deleted");
}

function clearCompleted() {
  const count = todos.filter(function (todo) { return todo.done; }).length;
  removeTodos(
    function (todo) { return todo.done; },
    count === 1 ? "1 completed todo cleared" : count + " completed todos cleared"
  );
}

// Put the last deleted todos back where they were
function undoDelete() {
  if (!lastDeleted) {
    return;
  }
  lastDeleted.forEach(function (item) {
    todos.splice(item.index, 0, item.todo);
  });
  lastDeleted = null;
  saveTodos();
  renderTodos();
  hideToast();
}

// Swap the todo text for a text box so it can be changed
function startEditing(li, todo) {
  const span = li.querySelector(".todo-text");
  if (!span) {
    return; // already editing
  }

  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.className = "edit-input";
  editInput.value = todo.text;
  span.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  let finished = false;

  function finishEditing(shouldSave) {
    if (finished) {
      return; // make sure we only finish once
    }
    finished = true;

    if (shouldSave) {
      const newText = editInput.value.trim();
      if (newText === "") {
        // Saving an empty todo means "delete it"
        deleteTodo(todo.id);
        return;
      }
      todo.text = newText;
      saveTodos();
    }
    renderTodos();
  }

  editInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      finishEditing(true); // Enter = save
    } else if (event.key === "Escape") {
      finishEditing(false); // Escape = cancel
    }
  });
  // Clicking somewhere else also saves
  editInput.addEventListener("blur", function () {
    finishEditing(true);
  });
}

function setFilter(filter) {
  currentFilter = filter;
  localStorage.setItem("filter", filter);
  renderTodos();
}

// ------------------------------------------------------------
// 6. The Undo bar ("toast")
// ------------------------------------------------------------
function showToast(message) {
  toastMessage.textContent = message;
  toast.hidden = false;

  // Hide it automatically after 5 seconds
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 5000);
}

function hideToast() {
  toast.hidden = true;
  lastDeleted = null; // once the bar is gone, the delete is final
}

// ------------------------------------------------------------
// 7. Listen for clicks and key presses
// ------------------------------------------------------------

// When the form is submitted (Add button or Enter key)
form.addEventListener("submit", function (event) {
  event.preventDefault(); // stop the page from reloading

  const text = input.value.trim(); // remove extra spaces
  if (text === "") {
    input.focus();
    return; // don't add empty todos
  }

  addTodo(text, dueInput.value);
  input.value = ""; // clear the inputs
  dueInput.value = "";
  input.focus();
});

filterButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    setFilter(button.dataset.filter);
  });
});

clearCompletedBtn.addEventListener("click", clearCompleted);
undoBtn.addEventListener("click", undoDelete);

// Ctrl+Z (or Cmd+Z on Mac) also undoes a delete,
// as long as you're not typing in a text box
document.addEventListener("keydown", function (event) {
  const isUndoKey = (event.ctrlKey || event.metaKey) && event.key === "z";
  const isTyping = document.activeElement.tagName === "INPUT";
  if (isUndoKey && !isTyping && lastDeleted) {
    event.preventDefault();
    undoDelete();
  }
});

// Draw the todos when the page first loads
renderTodos();
