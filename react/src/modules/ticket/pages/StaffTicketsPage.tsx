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

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

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

  const loadTickets = async () => {
    if (!canView) return;
    setLoading(true);
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
      showError((err as { message?: string })?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, [canView, currentPage, rowsPerPage, appliedSearchTerm]);

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
    try {
      await addTicketMessageApi(activeTicket.id, message, image);
      const res = await getTicketMessagesApi(activeTicket.id);
      setMessages(res.data?.messages ?? []);
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
        {/* Shared list toolbar pattern: left = rows + total, right = compact search. */}
        <div className="d-flex flex-column flex-lg-row gap-2 gap-lg-3 align-items-lg-end justify-content-between mb-3">
          <div className="d-flex flex-wrap gap-2 align-items-end">
            <div>
              <label className="form-label small text-muted mb-1">Rows per page</label>
              <select
                className="form-select form-select-sm"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {limitOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-muted small">
              Total: <strong>{total}</strong>
            </div>
          </div>
          <div className="d-flex gap-2" style={{ width: 'min(320px, 100%)' }}>
            <input
              className="form-control form-control-sm"
              placeholder="Search subject, status, name, @username…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setCurrentPage(1);
                  setAppliedSearchTerm(searchTerm.trim());
                }
              }}
            />
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                setCurrentPage(1);
                setAppliedSearchTerm(searchTerm.trim());
              }}
            >
              Search
            </button>
          </div>
        </div>

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
                          className="btn btn-sm rounded-pill px-3 btn-outline-primary"
                          disabled={!canMessageView}
                          onClick={() => void openMessages(ticket)}
                        >
                          Open chat
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="small text-muted">
            Showing {start}-{end} of {total}
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="small text-muted">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
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
        canReply={canMessageSend}
        viewerIsStaff
        onClose={() => setModalOpen(false)}
        onSend={sendMessage}
      />
    </PageShell>
  );
};

export default StaffTicketsPage;

