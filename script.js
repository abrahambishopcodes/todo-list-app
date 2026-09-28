// ------------------------------------------------------------
// 1. Grab the elements from the page that we need to work with
// ------------------------------------------------------------
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const emptyMessage = document.getElementById("empty-message");

// ------------------------------------------------------------
// 2. Our data: an array (list) of todo objects.
//    Each todo looks like: { id: 123, text: "Buy milk", done: false }
//    We load saved todos from the browser's storage so they
//    are still there after you refresh the page.
// ------------------------------------------------------------
let todos = JSON.parse(localStorage.getItem("todos")) || [];

// Save the current todos to the browser's storage
function saveTodos() {
  localStorage.setItem("todos", JSON.stringify(todos));
}

// ------------------------------------------------------------
// 3. Draw (render) all todos on the page
// ------------------------------------------------------------
function renderTodos() {
  // Clear the list first, then rebuild it from our data
  list.innerHTML = "";

  todos.forEach(function (todo) {
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
    checkbox.addEventListener("change", function () {
      toggleTodo(todo.id);
    });

    // The todo text
    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = todo.text;

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", function () {
      deleteTodo(todo.id);
    });

    // Put the pieces inside the <li>, then the <li> inside the list
    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });

  // Show the "nothing to do" message only when the list is empty
  emptyMessage.style.display = todos.length === 0 ? "block" : "none";
}

// ------------------------------------------------------------
// 4. The three features: add, delete, mark as done
// ------------------------------------------------------------
function addTodo(text) {
  const newTodo = {
    id: Date.now(), // the current time works as a simple unique id
    text: text,
    done: false,
  };
  todos.push(newTodo);
  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  // Keep every todo EXCEPT the one with this id
  todos = todos.filter(function (todo) {
    return todo.id !== id;
  });
  saveTodos();
  renderTodos();
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

// ------------------------------------------------------------
// 5. When the form is submitted (Add button or Enter key)
// ------------------------------------------------------------
form.addEventListener("submit", function (event) {
  event.preventDefault(); // stop the page from reloading

  const text = input.value.trim(); // remove extra spaces
  if (text === "") {
    return; // don't add empty todos
  }

  addTodo(text);
  input.value = ""; // clear the input box
  input.focus();
});

// Draw the todos when the page first loads
renderTodos();
