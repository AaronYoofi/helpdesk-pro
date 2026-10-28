import type { Ticket } from '../types/ticket'

// Fictional TopTrust Bank demo tickets. Never use real customer or account data.
export const sampleTickets: Ticket[] = [
  {
    id: 'HD-2048', subject: 'Branch workstation cannot reach internal network', requester: 'Ama Mensah', initials: 'AM',
    priority: 'High', status: 'In progress', assignee: 'Kwame Asante', category: 'Network',
    description: 'Fictional demo: a branch workstation cannot connect to the internal staff network.', createdAt: '12 min ago',
  },
  {
    id: 'HD-2047', subject: 'Request access to sandbox transaction system', requester: 'Kojo Owusu', initials: 'KO',
    priority: 'Medium', status: 'Open', assignee: 'Unassigned', category: 'Access',
    description: 'Fictional demo: a staff member needs approved access to the training sandbox.', createdAt: '28 min ago',
  },
  {
    id: 'HD-2046', subject: 'Branch workstation monitor flickering', requester: 'Abena Boateng', initials: 'AB',
    priority: 'Low', status: 'Open', assignee: 'Esi Mensah', category: 'Hardware',
    description: 'Fictional demo: the monitor at a staff workstation flickers after restart.', createdAt: '1 hour ago',
  },
  {
    id: 'HD-2045', subject: 'Staff portal password reset blocked by MFA', requester: 'Yaw Osei', initials: 'YO',
    priority: 'Urgent', status: 'Escalated', assignee: 'Kojo Boateng', category: 'Access',
    description: 'Fictional demo: a staff member cannot complete a password reset because their test MFA device is unavailable.', createdAt: '2 hours ago',
  },
  {
    id: 'HD-2044', subject: 'Install approved document software', requester: 'Akosua Asante', initials: 'AA',
    priority: 'Medium', status: 'Resolved', assignee: 'Abena Osei', category: 'Software',
    description: 'Fictional demo: install an approved document tool on a training workstation.', createdAt: 'Yesterday',
  },
]
