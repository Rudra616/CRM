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
import { formatTicketOwner, STATUS_OPTIONS, statusBadgeClass } from '../utils/ticketDisplay';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../context/PermissionContext';
import { PERMISSION_MODULE_KEYS } from '../../../shared/utils/permissionModules';
import { LIST_PAGE_SIZE_OPTIONS } from '../../../shared/constants/pagination';
import { ListTableToolbar } from '../../../shared/components/ListTableToolbar';
import {
  getTicketSocket,
  type NewMessageSocketEvent,
  type TicketUpdatedSocketEvent,
  type StatusUpdatedSocketEvent,
} from '../../../shared/socket/ticketSocket';

const PAGE_SIZE_OPTIONS = [...LIST_PAGE_SIZE_OPTIONS];

const StaffTicketsPage = () => {
  const { user } = useAuth();
  const { getModulePerm } = usePermissions();
  const ticketPerm = getModulePerm(PERMISSION_MODULE_KEYS.TICKET);
  const fullBypass = user?.is_main_admin;
  const canView = useMemo(() => fullBypass || ticketPerm.can_view, [fullBypass, ticketPerm.can_view]);
  const canEdit = useMemo(() => fullBypass || ticketPerm.can_edit, [fullBypass, ticketPerm.can_edit]);
  const canMessageView = useMemo(
    () => fullBypass || ticketPerm.can_view,
    [fullBypass, ticketPerm.can_view]
  );
  const canMessageSend = useMemo(
    () => fullBypass || ticketPerm.can_add,
    [fullBypass, ticketPerm.can_add]
  );
  const showMessageColumn = canMessageSend;
  const tableColSpan = showMessageColumn ? 7 : 6;

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
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

  const loadTickets = async (options?: { silent?: boolean }) => {
    if (!canView) return;
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      const res = await getAllTicketsApi({
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
  }, [canView, currentPage, rowsPerPage, appliedSearchTerm]);

  useEffect(() => {
    if (!canView) return;
    const socket = getTicketSocket();
    const myId = user?.id;
    const onRealtimeMessage = (payload: NewMessageSocketEvent) => {
      if (myId && payload.senderId === myId) return;
      let existsInCurrentList = false;
      setTickets((prev) =>
        prev.map((row) => {
          if (row.id !== payload.ticketId) return row;
          existsInCurrentList = true;
          return {
            ...row,
            unread_from_user_count:
              payload.senderType === 'user'
                ? Number(row.unread_from_user_count ?? 0) + 1
                : Number(row.unread_from_user_count ?? 0),
          };
        })
      );
      if (!existsInCurrentList) {
        void loadTickets({ silent: true });
      }
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
      if (!nextStatus) {
        void loadTickets({ silent: true });
        return;
      }
      let existsInCurrentList = false;
      setTickets((prev) =>
        prev.map((row) => {
          if (row.id !== payload.ticketId) return row;
          existsInCurrentList = true;
          return { ...row, status: nextStatus };
        })
      );
      if (!existsInCurrentList) {
        void loadTickets({ silent: true });
      }
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
  }, [canView, activeTicket?.id, user?.id]);

  const start = total === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, total);

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
      setActiveTicket(res.data?.ticket ?? ticket);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load ticket messages');
    } finally {
      setMessageLoading(false);
    }
  };

  const sendMessage = async (message: string, image?: File | null) => {
    if (!activeTicket) return;
    if (!canMessageSend) {
      showError('You do not have permission to send messages');
      return;
    }
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
          sender_type: 'admin',
          message,
          image: image ? URL.createObjectURL(image) : null,
          created_at: new Date().toISOString(),
          is_read_by_user: 0,
          is_read_by_admin: 1,
        },
      ]);
      setTickets((prev) =>
        prev.map((row) =>
          row.id === activeTicket.id ? { ...row, unread_from_user_count: 0 } : row
        )
      );
      showSuccess('Reply sent');
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to send reply');
    }
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
        <ListTableToolbar
          rowsPerPage={rowsPerPage}
          pageSizeOptions={limitOptions}
          totalRows={total}
          searchTerm={searchTerm}
          searchPlaceholder="Search subject, status, name, @username…"
          searchId="staff-ticket-search"
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
                <th style={{ minWidth: 160 }}>Customer</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Attachment</th>
                <th>Created</th>
                {showMessageColumn && <th style={{ minWidth: 120 }}>Chat</th>}
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
                    <td>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                    <td>
                      <div className="small fw-semibold">{formatTicketOwner(ticket)}</div>
                    </td>
                    <td>
                      <div className="fw-semibold small d-flex align-items-center gap-2 flex-wrap">
                        <span>{ticket.subject}</span>
                        {/* {Number(ticket.unread_from_user_count ?? 0) > 0 ? (
                          <span className="badge rounded-pill bg-danger" title="Unread user messages">
                            {Number(ticket.unread_from_user_count) > 99
                              ? '99+'
                              : ticket.unread_from_user_count}
                          </span>
                        ) : null} */}
                      </div>
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
                          className="btn btn-sm rounded-pill px-3 btn-outline-primary position-relative"
                          disabled={!canMessageView}
                          onClick={() => void openMessages(ticket)}
                        >
                          Open chat
                          {Number(ticket.unread_from_user_count ?? 0) > 0 ? (
                            <span
                              className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                              style={{ fontSize: '0.65rem' }}
                            >
                              {Number(ticket.unread_from_user_count) > 99
                                ? '99+'
                                : ticket.unread_from_user_count}
                            </span>
                          ) : null}
                        </button>
                      </td>
                    )}
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
        canReply={canMessageSend && activeTicket?.status !== 'closed'}
        viewerIsStaff
        onClose={() => setModalOpen(false)}
        onSend={sendMessage}
      />
    </PageShell>
  );
};

export default StaffTicketsPage;

