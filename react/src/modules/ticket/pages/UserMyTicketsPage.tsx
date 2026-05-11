import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../../../shared/components/PageShell';
import { showError, showSuccess } from '../../../shared/utils/toast';
import {
  addTicketMessageApi,
  getMyTicketsApi,
  getTicketMessagesApi,
  updateMyTicketApi,
  updateTicketStatusApi,
} from '../api/ticket.api';
import type { TicketItem, TicketMessageItem, TicketStatus } from '../types/ticket.types';
import { STATUS_OPTIONS } from '../utils/ticketDisplay';
import { TicketMessageModal } from '../components/TicketMessageModal';
import { useTicketUnread } from '../../../context/TicketUnreadContext';
import { LIST_PAGE_SIZE_OPTIONS } from '../../../shared/constants/pagination';
import { ListTableToolbar } from '../../../shared/components/ListTableToolbar';
import {
  getTicketSocket,
  type NewMessageSocketEvent,
  type TicketUpdatedSocketEvent,
  type StatusUpdatedSocketEvent,
} from '../../../shared/socket/ticketSocket';
import { useAuth } from '../../../context/AuthContext';

const editableStatus = (status: TicketItem['status']) =>
  status === 'open';
const PAGE_SIZE_OPTIONS = [...LIST_PAGE_SIZE_OPTIONS];

const UserMyTicketsPage = () => {
  const { refreshTicketUnread } = useTicketUnread();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [limitOptions, setLimitOptions] = useState<number[]>(PAGE_SIZE_OPTIONS);

  const [activeTicket, setActiveTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<TicketMessageItem[]>([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTicket, setEditTicket] = useState<TicketItem | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImage, setEditImage] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<number | null>(null);

  const loadTickets = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      const res = await getMyTicketsApi({
        page: currentPage,
        limit: rowsPerPage,
        search: appliedSearchTerm,
      });
      setTickets(res.data?.items ?? []);
      setTotal(res.data?.pagination?.total ?? 0);
      setTotalPages(Math.max(1, res.data?.pagination?.totalPages ?? 1));
      if (res.data?.pagination?.limit) setRowsPerPage(res.data.pagination.limit);
      if (res.data?.pagination?.limitOptions?.length) {
        setLimitOptions(res.data.pagination.limitOptions);
      }
      void refreshTicketUnread();
    } catch (err: unknown) {
      if (!silent) {
        showError((err as { message?: string })?.message || 'Failed to load tickets');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, [currentPage, rowsPerPage, appliedSearchTerm]);

  useEffect(() => {
    const socket = getTicketSocket();
    const myId = user?.id;
    const onRealtimeMessage = (payload: NewMessageSocketEvent) => {
      if (myId && payload.senderId === myId) return;
      setTickets((prev) =>
        prev.map((row) =>
          row.id === payload.ticketId
            ? {
                ...row,
                unread_from_admin_count:
                  payload.senderType === 'admin'
                    ? Number(row.unread_from_admin_count ?? 0) + 1
                    : Number(row.unread_from_admin_count ?? 0),
              }
            : row
        )
      );
      if (activeTicket?.id === payload.ticketId) {
        if (payload.message) {
          setMessages((prev) => [...prev, payload.message!]);
        }
      }
    };
    const onStatusUpdated = (payload: StatusUpdatedSocketEvent) => {
      if (payload.type !== 'ticket_status') return;
      if (myId && payload.updatedById === myId) return;
      const nextStatus = payload.status;
      setTickets((prev) =>
        prev.map((row) => (row.id === payload.ticketId ? { ...row, status: nextStatus } : row))
      );
      if (activeTicket?.id === payload.ticketId) {
        setActiveTicket((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      }
    };
    const onTicketUpdated = (payload: TicketUpdatedSocketEvent) => {
      if (myId && payload.updatedById === myId) return;
      const nextStatus = payload.status;
      if (!nextStatus) return;
      setTickets((prev) =>
        prev.map((row) => (row.id === payload.ticketId ? { ...row, status: nextStatus } : row))
      );
      if (activeTicket?.id === payload.ticketId) {
        setActiveTicket((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      }
    };

    socket.on('new_message', onRealtimeMessage);
    socket.on('status_updated', onStatusUpdated);
    socket.on('ticket_updated', onTicketUpdated);

    return () => {
      socket.off('new_message', onRealtimeMessage);
      socket.off('status_updated', onStatusUpdated);
      socket.off('ticket_updated', onTicketUpdated);
    };
  }, [activeTicket?.id, user?.id]);

  const start = total === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, total);

  const openMessages = async (ticket: TicketItem) => {
    setModalOpen(true);
    setActiveTicket(ticket);
    setMessageLoading(true);
    try {
      const res = await getTicketMessagesApi(ticket.id);
      setMessages(res.data?.messages ?? []);
      setActiveTicket(res.data?.ticket ?? ticket);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load ticket messages');
    } finally {
      setMessageLoading(false);
    }
  };

  const sendMessage = async (message: string, image?: File | null) => {
    if (!activeTicket) return;
    if (activeTicket.status === 'closed') {
      showError('Cannot send message: ticket is closed');
      return;
    }
    try {
      await addTicketMessageApi(activeTicket.id, message, image);
      const optimisticId = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          ticket_id: activeTicket.id,
          sender_id: user?.id ?? 0,
          sender_type: 'user',
          message,
          image: image ? URL.createObjectURL(image) : null,
          created_at: new Date().toISOString(),
          is_read_by_user: 1,
          is_read_by_admin: 0,
        },
      ]);
      setTickets((prev) =>
        prev.map((row) =>
          row.id === activeTicket.id ? { ...row, unread_from_admin_count: 0 } : row
        )
      );
      if (refreshTicketUnread) {
        void refreshTicketUnread();
      }
      showSuccess('Message sent');
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to send message');
    }
  };

  const updateTicketStatus = async (ticketId: number, status: TicketStatus) => {
    try {
      setStatusBusyId(ticketId);
      await updateTicketStatusApi(ticketId, status);
      setTickets((prev) => prev.map((row) => (row.id === ticketId ? { ...row, status } : row)));
      if (activeTicket?.id === ticketId) {
        setActiveTicket((t) => (t ? { ...t, status } : null));
      }
      showSuccess('Status updated');
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to update status');
    } finally {
      setStatusBusyId(null);
    }
  };

  const openEdit = (ticket: TicketItem) => {
    if (!editableStatus(ticket.status)) {
      showError('You can only edit tickets that are open or in progress.');
      return;
    }
    setEditTicket(ticket);
    setEditSubject(ticket.subject);
    setEditDescription(ticket.description);
    setEditImage(null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editTicket) return;
    if (editSubject.trim().length < 5 || editDescription.trim().length < 10) {
      showError('Subject (min 5) and description (min 10) are required.');
      return;
    }
    try {
      setSavingEdit(true);
      await updateMyTicketApi(
        editTicket.id,
        { subject: editSubject.trim(), description: editDescription.trim() },
        editImage
      );
      showSuccess('Ticket updated');
      setEditOpen(false);
      setEditTicket(null);
      await loadTickets();
      if (activeTicket?.id === editTicket.id) {
        const res = await getTicketMessagesApi(editTicket.id);
        setActiveTicket(res.data?.ticket ?? null);
      }
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to update ticket');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <PageShell
      title="My Tickets"
      subtitle="View your tickets, edit while open, and message support."
    >
      <div className="p-3 p-md-4 d-flex flex-column gap-3">
        <div>
          <Link className="btn btn-sm btn-primary" to="/tickets/create">
            Create new ticket
          </Link>
        </div>

        <ListTableToolbar
          rowsPerPage={rowsPerPage}
          pageSizeOptions={limitOptions}
          totalRows={total}
          searchTerm={searchTerm}
          searchPlaceholder="Search tickets..."
          searchId="my-ticket-search"
          onRowsPerPageChange={(next) => {
            setRowsPerPage(next);
            setCurrentPage(1);
          }}
          onSearchTermChange={setSearchTerm}
          onApplySearch={() => {
            setCurrentPage(1);
            setAppliedSearchTerm(searchTerm.trim());
          }}
          onClearSearch={() => {
            setSearchTerm('');
            setCurrentPage(1);
            setAppliedSearchTerm('');
          }}
        />

        <div className="table-responsive">
          <table className="table table-bordered table-striped align-middle mb-0">
            <thead>
              <tr className="small">
                <th>#</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Attachment</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    Loading tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No tickets yet —{' '}
                    <Link to="/tickets/create">create one</Link>.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket, idx) => (
                  <tr key={ticket.id}>
                    <td>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                    <td>
                      <div className="fw-semibold small d-flex align-items-center gap-2 flex-wrap">
                        <span>{ticket.subject}</span>
                        {Number(ticket.unread_from_admin_count ?? 0) > 0 ? (
                          <span
                            className="badge rounded-pill bg-danger"
                            title="Unread messages from support"
                          >
                            {Number(ticket.unread_from_admin_count) > 99
                              ? '99+'
                              : ticket.unread_from_admin_count}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-muted small">{ticket.description}</div>
                    </td>
                    <td style={{ minWidth: 170 }}>
                      <select
                        className="form-select form-select-sm text-capitalize"
                        value={ticket.status}
                        disabled={ticket.status === 'closed' || statusBusyId === ticket.id}
                        title={
                          ticket.status === 'closed'
                            ? 'Closed tickets cannot be changed'
                            : 'Change ticket status'
                        }
                        onChange={(e) =>
                          void updateTicketStatus(ticket.id, e.target.value as TicketStatus)
                        }
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
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
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn btn-sm rounded-pill px-3 btn-outline-primary position-relative"
                          onClick={() => void openMessages(ticket)}
                        >
                          Open chat
                          {Number(ticket.unread_from_admin_count ?? 0) > 0 ? (
                            <span
                              className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                              style={{ fontSize: '0.65rem' }}
                            >
                              {Number(ticket.unread_from_admin_count) > 99
                                ? '99+'
                                : ticket.unread_from_admin_count}
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={!editableStatus(ticket.status)}
                          title={
                            editableStatus(ticket.status)
                              ? 'Edit subject and description'
                              : 'Closed tickets cannot be edited'
                          }
                          onClick={() => openEdit(ticket)}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
          <div className="text-muted small">
            {start}-{end} of {total}
            <span className="ms-1">(page {currentPage} of {totalPages})</span>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline-primary'}`}
                style={{ minWidth: 36 }}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <TicketMessageModal
        open={modalOpen}
        ticket={activeTicket}
        messages={messages}
        loading={messageLoading}
        canReply={activeTicket?.status !== 'closed'}
        viewerIsStaff={false}
        onClose={() => setModalOpen(false)}
        onSend={sendMessage}
      />

      {editOpen && editTicket ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setEditOpen(false)}
        >
          <div
            className="card shadow-sm"
            style={{ width: 'min(520px, 100%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header d-flex justify-content-between align-items-center">
              <strong className="small">Edit ticket #{editTicket.id}</strong>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditOpen(false)}>
                Close
              </button>
            </div>
            <div className="card-body">
              <div className="mb-2">
                <label className="form-label small">Subject</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  maxLength={150}
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                />
              </div>
              <div className="mb-2">
                <label className="form-label small">Description</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={5}
                  maxLength={2000}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small">
                  Replace attachment (optional). Leave empty to keep current image.
                </label>
                <input
                  type="file"
                  className="form-control form-control-sm"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setEditImage(e.target.files?.[0] ?? null)}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={savingEdit}
                onClick={() => void saveEdit()}
              >
                {savingEdit ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
};

export default UserMyTicketsPage;
