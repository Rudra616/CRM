import type { ReactNode } from 'react';
import { colors } from '../../theme/colors';

export type PageShellProps = {
  title: string;
  subtitle?: string;
  loading?: boolean;
  loadingMessage?: string;
  /** Use for full-width tables (padding only on outer chrome) */
  flush?: boolean;
  children?: ReactNode;
};

/**
 * Shared chrome for all in-app pages (dashboards, lists, profile):
 * primary-colored title, optional subtitle, card with left accent matching admin dashboard tiles.
 */
export const PageShell = ({
  title,
  subtitle,
  loading,
  loadingMessage = 'Loading…',
  flush,
  children,
}: PageShellProps) => (
  <div>
    <header className="mb-4">
      <h1 className="h4 fw-semibold mb-1" style={{ color: colors.primary }}>
        {title}
      </h1>
      {subtitle ? <p className="text-muted small mb-0">{subtitle}</p> : null}
    </header>

    {loading ? (
      <div
        className="card shadow-sm border-0"
        style={{
          borderLeft: `5px solid ${colors.primary}`,
          backgroundColor: colors.cardPrimaryBg,
        }}
      >
        <div className="card-body p-5 text-center">
          <div className="spinner-border text-primary mb-3" role="status" />
          <p className="text-muted small mb-0">{loadingMessage}</p>
        </div>
      </div>
    ) : (
      <div
        className="card shadow-sm border-0"
        style={{
          borderLeft: `5px solid ${colors.primary}`,
          backgroundColor: '#fff',
        }}
      >
        <div className={flush ? 'card-body p-0' : 'card-body p-4'}>{children}</div>
      </div>
    )}
  </div>
);
