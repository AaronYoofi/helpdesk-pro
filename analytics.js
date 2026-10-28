const storageKey = 'helpdesk-pro-tickets-v1';
const categories = ['Hardware', 'Software', 'Access', 'Network'];
const statuses = ['Open', 'In progress', 'Escalated', 'Resolved'];
const priorities = ['Urgent', 'High', 'Medium', 'Low'];
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
}
const sample = [
  { id:'HD-2048', subject:'Laptop won’t connect to office Wi-Fi', requester:'Maya Chen', priority:'High', status:'In progress', assignee:'Alex Morgan', category:'Network' },
  { id:'HD-2047', subject:'Request access to design workspace', requester:'Noah Williams', priority:'Medium', status:'Open', assignee:'Unassigned', category:'Access' },
  { id:'HD-2046', subject:'Monitor flickering after update', requester:'Sofia Patel', priority:'Low', status:'Open', assignee:'Jamie Lee', category:'Hardware' },
  { id:'HD-2045', subject:'Cannot reset password with MFA', requester:'Ethan Brooks', priority:'Urgent', status:'Escalated', assignee:'Riley Kim', category:'Access' },
  { id:'HD-2044', subject:'Install approved PDF editor', requester:'Ava Thompson', priority:'Medium', status:'Resolved', assignee:'Alex Morgan', category:'Software' },
];
let tickets = sample;
let storageAvailable = true;
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) tickets = parsed;
  }
  localStorage.setItem(`${storageKey}-analytics-check`, 'ok');
  localStorage.removeItem(`${storageKey}-analytics-check`);
} catch {
  storageAvailable = false;
}

const countBy = (key, value) => tickets.filter(ticket => ticket[key] === value).length;
const openCount = countBy('status', 'Open') + countBy('status', 'Escalated');
document.querySelector('#total-count').textContent = tickets.length;
document.querySelector('#open-count').textContent = openCount;
document.querySelector('#resolved-count').textContent = countBy('status', 'Resolved');
document.querySelector('#resolved-rate').textContent = `${tickets.length ? Math.round(countBy('status', 'Resolved') / tickets.length * 100) : 0}% of all tickets`;
document.querySelector('#urgent-count').textContent = countBy('priority', 'Urgent');
document.querySelector('#today').textContent = new Intl.DateTimeFormat('en', { weekday:'short', month:'short', day:'numeric', year:'numeric' }).format(new Date());
document.querySelector('#analytics-status').textContent = storageAvailable
  ? 'Report uses the saved ticket list from this browser.'
  : 'Browser storage is unavailable. Run the dashboard through VS Code Live Server.';

const categoryCounts = categories.map(category => [category, countBy('category', category)]);
const largestCategory = Math.max(1, ...categoryCounts.map(([, count]) => count));
document.querySelector('#category-report').innerHTML = categoryCounts.map(([category, count]) => `
  <div class="bar-row"><span>${category}</span><div class="bar-track"><div class="bar-fill" style="width:${count / largestCategory * 100}%"></div></div><strong>${count}</strong></div>`).join('');

const maxStatus = Math.max(1, ...statuses.map(status => countBy('status', status)));
document.querySelector('#status-report').innerHTML = statuses.map(status => {
  const count = countBy('status', status);
  return `<div class="status-column"><strong>${count}</strong><div class="status-bar" style="height:${Math.max(4, count / maxStatus * 88)}px"></div><span>${status}</span></div>`;
}).join('');

document.querySelector('#priority-report').innerHTML = priorities.map(priority => `
  <div class="priority-card ${priority.toLowerCase()}"><span><i></i>${priority}</span><strong>${countBy('priority', priority)}</strong></div>`).join('');

const reportRows = document.querySelector('#report-rows');
reportRows.innerHTML = tickets.map(ticket => `
  <tr><td class="ticket-id">${escapeHtml(ticket.id)}</td><td class="subject">${escapeHtml(ticket.subject)}</td><td>${escapeHtml(ticket.category || 'Uncategorized')}</td><td><span class="priority ${escapeHtml(ticket.priority.toLowerCase())}"><i></i>${escapeHtml(ticket.priority)}</span></td><td><span class="status ${escapeHtml(ticket.status.toLowerCase().replaceAll(' ', '-'))}">${escapeHtml(ticket.status)}</span></td><td>${escapeHtml(ticket.assignee)}</td></tr>`).join('');
document.querySelector('#report-empty').hidden = tickets.length > 0;

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}
document.querySelector('#export-report').addEventListener('click', () => {
  const fields = ['id', 'subject', 'requester', 'category', 'priority', 'status', 'assignee', 'description'];
  const csv = [fields.join(','), ...tickets.map(ticket => fields.map(field => csvCell(ticket[field])).join(','))].join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type:'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'helpdesk-pro-ticket-report.csv';
  link.click();
  URL.revokeObjectURL(url);
});
