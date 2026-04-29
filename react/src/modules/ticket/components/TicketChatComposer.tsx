import { useState } from 'react';

type Props = {
  disabled?: boolean;
  onSend: (text: string, image: File | null) => Promise<void>;
};

export const TicketChatComposer = ({ disabled, onSend }: Props) => {
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const text = draft.trim();
    if (!text && !attachment) return;
    try {
      setSending(true);
      await onSend(text, attachment);
      setDraft('');
      setAttachment(null);
    } finally {
      setSending(false);
    }
  };

  const busy = disabled || sending;

  return (
    <div
      className="border-top bg-white"
      style={{
        padding: '12px 14px',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
      }}
    >
      <div className="d-flex flex-column gap-2">
        <div className="d-flex gap-2 align-items-start">
          <textarea
            className="form-control form-control-sm flex-grow-1"
            rows={2}
            placeholder="Write a message… (optional if you attach an image)"
            value={draft}
            maxLength={2000}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm align-self-stretch px-3"
            disabled={busy || (!draft.trim() && !attachment)}
            onClick={() => void submit()}
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2 small text-muted">
          <label className="btn btn-sm btn-outline-secondary mb-0">
            Attach image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="d-none"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setAttachment(f);
                e.target.value = '';
              }}
            />
          </label>
          {attachment ? (
            <span>
              {attachment.name}{' '}
              <button
                type="button"
                className="btn btn-link btn-sm p-0 align-baseline"
                disabled={busy}
                onClick={() => setAttachment(null)}
              >
                Remove
              </button>
            </span>
          ) : (
            <span>JPG, PNG, or WEBP · max 2 MB</span>
          )}
        </div>
      </div>
    </div>
  );
};
