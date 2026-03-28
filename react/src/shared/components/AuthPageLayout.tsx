import type { CSSProperties, ReactNode } from 'react';
import { colors } from '../../theme/colors';

/** Fixed navbar height — must match Navbar.tsx */
export const AUTH_NAVBAR_OFFSET = 56;

type AuthPageLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Default matches dashboard card column readability */
  maxWidth?: number;
};

/**
 * Auth pages use the same visual language as the dashboard:
 * light gray page background, card with primary left accent + tinted background.
 */
export const AuthPageLayout = ({
  title,
  subtitle,
  children,
  maxWidth = 440,
}: AuthPageLayoutProps) => (
  <div
    className="d-flex justify-content-center px-3"
    style={{
      minHeight: `calc(100vh - ${AUTH_NAVBAR_OFFSET}px)`,
      marginTop: AUTH_NAVBAR_OFFSET,
      paddingTop: 28,
      paddingBottom: 48,
      backgroundColor: '#f8f9fa',
    }}
  >
    <div className="w-100" style={{ maxWidth }}>
      <div
        className="card shadow-sm border-0"
        style={{
          borderLeft: `5px solid ${colors.primary}`,
          backgroundColor: colors.cardPrimaryBg,
        }}
      >
        <div className="card-body p-4 p-md-5">
          <h2 className="h4 fw-semibold mb-2" style={{ color: colors.primary }}>
            {title}
          </h2>
          {subtitle ? <p className="text-muted small mb-4">{subtitle}</p> : null}
          {children}
        </div>
      </div>
    </div>
  </div>
);

/** Inline link style aligned with dashboard primary accent */
export const authLinkStyle: CSSProperties = {
  color: colors.primary,
  fontWeight: 600,
  textDecoration: 'none',
};
