import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../../../shared/components/PageShell';
import { showError, showSuccess } from '../../../shared/utils/toast';
import { createTicketApi } from '../api/ticket.api';

const UserCreateTicketPage = () => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const submitCreate = async () => {
    if (subject.trim().length < 5 || description.trim().length < 10) {
      showError('Subject (min 5) and description (min 10) are required.');
      return;
    }
    try {
      setCreating(true);
      await createTicketApi({ subject: subject.trim(), description: description.trim() }, imageFile);
      showSuccess('Ticket created successfully');
      setSubject('');
      setDescription('');
      setImageFile(null);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageShell
      title="Create Ticket"
      subtitle="Describe your issue; you can edit it later from My Tickets while it is open."
    >
      <div className="p-3 p-md-4">
        <div className="mb-3">
          <label className="form-label small">Subject</label>
          <input
            type="text"
            className="form-control form-control-sm"
            maxLength={150}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Issue subject"
          />
        </div>
        <div className="mb-3">
          <label className="form-label small">Description</label>
          <textarea
            className="form-control form-control-sm"
            rows={5}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your issue in detail"
          />
        </div>
        <div className="mb-3">
          <label className="form-label small">Attachment (optional, JPG/PNG/WEBP up to 2MB)</label>
          <input
            type="file"
            className="form-control form-control-sm"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={creating}
            onClick={() => void submitCreate()}
          >
            {creating ? 'Creating...' : 'Submit Ticket'}
          </button>
          <Link className="btn btn-outline-secondary btn-sm" to="/tickets/my">
            Go to My Tickets
          </Link>
        </div>
      </div>
    </PageShell>
  );
};

export default UserCreateTicketPage;
