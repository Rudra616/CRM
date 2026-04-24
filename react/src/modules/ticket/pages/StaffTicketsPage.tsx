import { useEffect, useMemo, useState } from 'react';
import { PageShell } from '../../../shared/components/PageShell';
import { showError, showSuccess } from '../../../shared/utils/toast';
import {
  addTicketMessageApi,
  getAllTicketsApi,
  getTicketMessagesApi,
  updateTicketStatusApi,
} from '../api/ticket.api';
import type { TicketItem, TicketMessageItem, TicketStatus } from '../types/ticket.types';
import { TicketMessageModal } from '../components/TicketMessageModal';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../context/PermissionContext';
import { PERMISSION_MODULE_KEYS } from '../../../shared/utils/permissionModules';

const STATUS_OPTIONS: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

const statusBadgeClass = (status: TicketStatus) => {
  if (status === 'open') return 'bg-primary';
  if (status === 'in_progress') return 'bg-warning text-dark';
  if (status === 'resolved') return 'bg-success';
  return 'bg-secondary';
};

const StaffTicketsPage = () => {
  const { user } = useAuth();
  const { getModulePerm } = usePermissions();
  const ticketPerm = getModulePerm(PERMISSION_MODULE_KEYS.TICKET);
  const canView = useMemo(() => user?.role === 'admin' || ticketPerm.can_view, [user?.role, ticketPerm.can_view]);
  const canEdit = useMemo(() => user?.role === 'admin' || ticketPerm.can_edit, [user?.role, ticketPerm.can_edit]);
  const canMessageView = useMemo(
    () => user?.role === 'admin' || ticketPerm.can_view,
    [user?.role, ticketPerm.can_view]
  );
  const canMessageSend = useMemo(
    () => user?.role === 'admin' || ticketPerm.can_add,
    [user?.role, ticketPerm.can_add]
  );
  const showMessageColumn = canMessageSend;
  const tableColSpan = showMessageColumn ? 7 : 6;

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [activeTicket, setActiveTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<TicketMessageItem[]>([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const loadTickets = async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const res = await getAllTicketsApi();
      setTickets(res.data?.tickets ?? []);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, [canView]);

  const updateStatus = async (ticketId: number, status: TicketStatus) => {
    try {
      setBusyId(ticketId);
      await updateTicketStatusApi(ticketId, status);
      setTickets((prev) => prev.map((row) => (row.id === ticketId ? { ...row, status } : row)));
      showSuccess('Ticket status updated');
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const openMessages = async (ticket: TicketItem) => {
    if (!canMessageView) {
      showError('You do not have permission to view messages');
      return;
    }
    setActiveTicket(ticket);
    setModalOpen(true);
    setMessageLoading(true);
    try {
      const res = await getTicketMessagesApi(ticket.id);
      setMessages(res.data?.messages ?? []);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load ticket messages');
    } finally {
      setMessageLoading(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!activeTicket) return;
    if (!canMessageSend) {
      showError('You do not have permission to send messages');
      return;
    }
    await addTicketMessageApi(activeTicket.id, message);
    const res = await getTicketMessagesApi(activeTicket.id);
    setMessages(res.data?.messages ?? []);
    showSuccess('Reply sent');
  };

  if (!canView) {
    return (
      <PageShell title="Tickets" subtitle="Support tickets">
        <div className="p-4 text-muted small">You do not have permission to view tickets.</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Manage Tickets" subtitle="Review, update status, and reply to ticket messages">
      <div className="p-3 p-md-4">
        <div className="table-responsive">
          <table className="table table-bordered table-striped align-middle mb-0">
            <thead>
              <tr className="small">
                <th>#</th>
                <th>User ID</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Attachment</th>
                <th>Created</th>
                {showMessageColumn && <th>Message</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={tableColSpan} className="text-center text-muted py-4">
                    Loading tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={tableColSpan} className="text-center text-muted py-4">
                    No tickets found
                  </td>
                </tr>
              ) : (
                tickets.map((ticket, idx) => (
                  <tr key={ticket.id}>
                    <td>{idx + 1}</td>
                    <td>{ticket.user_id}</td>
                    <td>
                      <div className="fw-semibold small">{ticket.subject}</div>
                      <div className="text-muted small">{ticket.description}</div>
                    </td>
                    <td style={{ minWidth: 170 }}>
                      {canEdit ? (
                        <select
                          className="form-select form-select-sm text-capitalize"
                          value={ticket.status}
                          disabled={busyId === ticket.id}
                          onChange={(e) => void updateStatus(ticket.id, e.target.value as TicketStatus)}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`badge text-capitalize ${statusBadgeClass(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td>
                      {ticket.image_url ? (
                        <a href={ticket.image_url} target="_blank" rel="noreferrer">
                          View image
                        </a>
                      ) : (
                        <span className="text-muted small">None</span>
                      )}
                    </td>
                    <td>{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '-'}</td>
                    {showMessageColumn && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          disabled={!canMessageView}
                          onClick={() => void openMessages(ticket)}
                        >
                          Open Chat
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TicketMessageModal
        open={modalOpen}
        ticket={activeTicket}
        messages={messages}
        loading={messageLoading}
        canReply={canMessageSend}
        onClose={() => setModalOpen(false)}
        onSend={sendMessage}
      />
    </PageShell>
  );
};

export default StaffTicketsPage;

