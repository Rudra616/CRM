import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../../../shared/components/PageShell';
import { showError, showSuccess } from '../../../shared/utils/toast';
import {
  addTicketMessageApi,
  getMyTicketsApi,
  getTicketMessagesApi,
  updateMyTicketApi,
} from '../api/ticket.api';
import type { TicketItem, TicketMessageItem } from '../types/ticket.types';
import { TicketMessageModal } from '../components/TicketMessageModal';

const editableStatus = (status: TicketItem['status']) =>
  status === 'open' || status === 'in_progress';

const UserMyTicketsPage = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketItem[]>([]);

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

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await getMyTicketsApi();
      setTickets(res.data?.tickets ?? []);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const openMessages = async (ticket: TicketItem) => {
    setModalOpen(true);
    setActiveTicket(ticket);
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
    await addTicketMessageApi(activeTicket.id, message);
    const res = await getTicketMessagesApi(activeTicket.id);
    setMessages(res.data?.messages ?? []);
    showSuccess('Message sent');
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
                    <td>{idx + 1}</td>
                    <td>
                      <div className="fw-semibold small">{ticket.subject}</div>
                      <div className="text-muted small">{ticket.description}</div>
                    </td>
                    <td className="text-capitalize">{ticket.status.replace('_', ' ')}</td>
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
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => void openMessages(ticket)}
                        >
                          Messages
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={!editableStatus(ticket.status)}
                          title={
                            editableStatus(ticket.status)
                              ? 'Edit subject and description'
                              : 'Closed or resolved tickets cannot be edited'
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
      </div>

      <TicketMessageModal
        open={modalOpen}
        ticket={activeTicket}
        messages={messages}
        loading={messageLoading}
        canReply
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
