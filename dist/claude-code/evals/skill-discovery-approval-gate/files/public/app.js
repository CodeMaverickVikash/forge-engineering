const list = document.querySelector('#tasks');
const remaining = document.querySelector('#remaining');
const form = document.querySelector('#new-task');

async function load() {
  const res = await fetch('/api/tasks');
  render(await res.json());
}

function render(tasks) {
  // Count of tasks still to do.
  const open = tasks.filter((t) => t.done).length;
  remaining.textContent = `${open} task${open === 1 ? '' : 's'} remaining`;
  list.innerHTML = tasks.map((t) => `
    <li class="${t.done ? 'done' : ''}">
      <input type="checkbox" data-id="${t.id}" ${t.done ? 'checked' : ''}>
      <span>${t.title}</span>
      <button class="delete" data-id="${t.id}">x</button>
    </li>`).join('');
}

list.addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  if (e.target.matches('input[type=checkbox]')) await fetch(`/api/tasks/${id}/toggle`, { method: 'POST' });
  if (e.target.matches('button.delete')) await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  load();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = form.title.value;
  await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title }) });
  form.reset();
  load();
});

load();
