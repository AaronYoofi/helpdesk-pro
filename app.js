// Fictional demo tickets. This stage keeps data in memory; database storage comes later.
const sampleTickets = [
  { id:'HD-2048', subject:'Laptop won’t connect to office Wi-Fi', requester:'Maya Chen', initials:'MC', avatar:'a2', priority:'High', status:'In progress', assignee:'Alex Morgan', since:'12 min ago', category:'Network', description:'The laptop sees the office network but fails to connect after the latest restart.' },
  { id:'HD-2047', subject:'Request access to design workspace', requester:'Noah Williams', initials:'NW', avatar:'a3', priority:'Medium', status:'Open', assignee:'Unassigned', since:'28 min ago', category:'Access', description:'Please grant access to the fictional design workspace for the new project.' },
  { id:'HD-2046', subject:'Monitor flickering after update', requester:'Sofia Patel', initials:'SP', avatar:'a4', priority:'Low', status:'Open', assignee:'Jamie Lee', since:'1 hour ago', category:'Hardware', description:'The external monitor flickers every few minutes since the latest system update.' },
  { id:'HD-2045', subject:'Cannot reset password with MFA', requester:'Ethan Brooks', initials:'EB', avatar:'', priority:'Urgent', status:'Escalated', assignee:'Riley Kim', since:'2 hours ago', category:'Access', description:'Password reset is blocked because the registered MFA device is unavailable.' },
  { id:'HD-2044', subject:'Install approved PDF editor', requester:'Ava Thompson', initials:'AT', avatar:'a3', priority:'Medium', status:'Resolved', assignee:'Alex Morgan', since:'Yesterday', category:'Software', description:'Install the approved PDF editor on the demo workstation.' },
];
const ticketStorageKey = 'helpdesk-pro-tickets-v1';
let tickets;
try {
  const savedTickets = localStorage.getItem(ticketStorageKey);
  tickets = savedTickets ? JSON.parse(savedTickets) : [...sampleTickets];
  if (!Array.isArray(tickets)) tickets = [...sampleTickets];
} catch {
  // If browser storage is unavailable or invalid, keep the sample dashboard usable.
  tickets = [...sampleTickets];
}

function saveTickets() {
  try {
    localStorage.setItem(ticketStorageKey, JSON.stringify(tickets));
    storageStatus.textContent = 'Saved in this browser. Your tickets should remain after refresh.';
    storageStatus.classList.remove('storage-error');
  } catch {
    storageStatus.textContent = 'Could not save in this browser. Open this project through VS Code Live Server and try again.';
    storageStatus.classList.add('storage-error');
  }
}

const rows = document.querySelector('#ticket-rows');
const search = document.querySelector('#search');
const statusFilter = document.querySelector('#status-filter');
const priorityFilter = document.querySelector('#priority-filter');
const emptyState = document.querySelector('#empty-state');
const ticketDialog = document.querySelector('#ticket-dialog');
const ticketForm = document.querySelector('#ticket-form');
const storageStatus = document.querySelector('#storage-status');
const detailDialog = document.querySelector('#detail-dialog');
const detailForm = document.querySelector('#detail-form');
let activeTicketId = null;

function canUseLocalStorage() {
  try {
    const testKey = `${ticketStorageKey}-check`;
    localStorage.setItem(testKey, 'ok');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
}

function renderTickets() {
  const query = search.value.trim().toLowerCase();
  const status = statusFilter.value;
  const priority = priorityFilter.value;
  const visible = tickets.filter(ticket => {
    const matchesText = [ticket.id, ticket.subject, ticket.requester, ticket.assignee].some(value => value.toLowerCase().includes(query));
    return matchesText && (status === 'all' || ticket.status === status) && (priority === 'all' || ticket.priority === priority);
  });

  rows.innerHTML = visible.map(ticket => {
    const statusClass = ticket.status.toLowerCase().replaceAll(' ', '-');
    return `<tr>
      <td class="ticket-id">${escapeHtml(ticket.id)}</td>
      <td class="subject">${escapeHtml(ticket.subject)}<div class="row-time">${escapeHtml(ticket.since)}</div></td>
      <td><div class="requester"><span class="mini-avatar ${escapeHtml(ticket.avatar)}">${escapeHtml(ticket.initials)}</span>${escapeHtml(ticket.requester)}</div></td>
      <td><span class="priority ${ticket.priority.toLowerCase()}"><i></i>${ticket.priority}</span></td>
      <td><span class="status ${statusClass}">${ticket.status}</span></td>
      <td><div class="assignee"><span class="mini-avatar">${ticket.assignee === 'Unassigned' ? '—' : escapeHtml(ticket.assignee.split(' ').map(part => part[0]).join(''))}</span>${escapeHtml(ticket.assignee)}</div></td>
      <td><button class="row-more" data-ticket-id="${escapeHtml(ticket.id)}" aria-label="Edit ${escapeHtml(ticket.id)}">Edit</button></td>
    </tr>`;
  }).join('');

  emptyState.hidden = visible.length > 0;
  document.querySelector('#result-count').textContent = `Showing ${visible.length} of ${tickets.length} tickets`;
}

function updateSummary() {
  const open = tickets.filter(ticket => ticket.status === 'Open' || ticket.status === 'Escalated').length;
  document.querySelector('#open-total').textContent = open;
  document.querySelector('#progress-total').textContent = tickets.filter(ticket => ticket.status === 'In progress').length;
  document.querySelector('#resolved-total').textContent = tickets.filter(ticket => ticket.status === 'Resolved').length;
  document.querySelector('#nav-count').textContent = tickets.length;
}

search.addEventListener('input', renderTickets);
statusFilter.addEventListener('change', renderTickets);
priorityFilter.addEventListener('change', renderTickets);
rows.addEventListener('click', event => {
  const button = event.target.closest('[data-ticket-id]');
  if (!button) return;
  const ticket = tickets.find(item => item.id === button.dataset.ticketId);
  if (!ticket) return;
  activeTicketId = ticket.id;
  document.querySelector('#detail-id').textContent = ticket.id;
  document.querySelector('#detail-title').textContent = ticket.subject;
  document.querySelector('#detail-requester').textContent = `Requested by ${ticket.requester} · ${ticket.since}`;
  document.querySelector('#detail-description').value = ticket.description || 'No description provided.';
  document.querySelector('#detail-category').value = ticket.category || 'Software';
  document.querySelector('#detail-priority').value = ticket.priority;
  document.querySelector('#detail-status').value = ticket.status;
  document.querySelector('#detail-assignee').value = ticket.assignee;
  detailDialog.showModal();
});
document.querySelector('#close-detail').addEventListener('click', () => detailDialog.close());
document.querySelector('#cancel-detail').addEventListener('click', () => detailDialog.close());
detailDialog.addEventListener('click', event => {
  if (event.target === detailDialog) detailDialog.close();
});
detailForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!detailForm.reportValidity()) return;
  const ticket = tickets.find(item => item.id === activeTicketId);
  if (!ticket) return;
  const form = new FormData(detailForm);
  ticket.description = form.get('description').trim();
  ticket.category = form.get('category');
  ticket.priority = form.get('priority');
  ticket.status = form.get('status');
  ticket.assignee = form.get('assignee');
  ticket.since = 'Updated just now';
  saveTickets();
  updateSummary();
  renderTickets();
  detailDialog.close();
});
document.querySelector('#new-ticket').addEventListener('click', () => {
  ticketForm.reset();
  ticketDialog.showModal();
});
document.querySelector('#close-dialog').addEventListener('click', () => ticketDialog.close());
document.querySelector('#cancel-ticket').addEventListener('click', () => ticketDialog.close());
ticketDialog.addEventListener('click', event => {
  if (event.target === ticketDialog) ticketDialog.close();
});
ticketForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!ticketForm.reportValidity()) return;
  const form = new FormData(ticketForm);
  const requester = form.get('requester').trim();
  const initials = requester.split(/\s+/).slice(0, 2).map(part => part[0].toUpperCase()).join('');
  const nextNumber = Math.max(...tickets.map(ticket => Number(ticket.id.replace('HD-', '')))) + 1;
  tickets.unshift({
    id: `HD-${nextNumber}`,
    subject: form.get('subject').trim(),
    requester,
    initials,
    avatar: 'a2',
    priority: form.get('priority'),
    status: 'Open',
    assignee: 'Unassigned',
    since: 'Just now',
    category: form.get('category'),
    description: form.get('description').trim(),
  });
  saveTickets();
  updateSummary();
  renderTickets();
  ticketDialog.close();
  document.querySelector('#tickets').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.querySelector('#chart-range').addEventListener('click', () => {
  window.alert('The chart currently shows a fixed fictional weekly sample. Interactive reporting will be added in the analytics stage.');
});

document.querySelector('#today').textContent = new Intl.DateTimeFormat('en', { weekday:'short', month:'short', day:'numeric', year:'numeric' }).format(new Date());
if (canUseLocalStorage()) {
  storageStatus.textContent = tickets.length > sampleTickets.length
    ? 'Browser storage is available. Your saved tickets loaded.'
    : 'Browser storage is available. New tickets will be saved here.';
} else {
  storageStatus.textContent = 'Browser storage is blocked. Run this page through VS Code Live Server to save tickets.';
  storageStatus.classList.add('storage-error');
}
updateSummary();
renderTickets();
