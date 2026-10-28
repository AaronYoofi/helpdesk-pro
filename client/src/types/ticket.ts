export type TicketPriority = 'Urgent' | 'High' | 'Medium' | 'Low'
export type TicketStatus = 'Open' | 'In progress' | 'Escalated' | 'Resolved'
export type TicketCategory = 'Hardware' | 'Software' | 'Access' | 'Network'

export type Ticket = {
  id: string
  subject: string
  requester: string
  initials: string
  priority: TicketPriority
  status: TicketStatus
  assignee: string
  category: TicketCategory
  description: string
  createdAt: string
  updatedAt?: string
}
