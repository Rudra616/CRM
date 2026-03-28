import type { CSSProperties } from 'react';
import { colors } from '../../theme/colors';

type DashboardStatCardProps = {
  title: string;
  value: number | string;
  hint?: string;
  onClick?: () => void;
  colClass?: string;
};

/** Same visual as admin dashboard summary tiles (left primary stripe + tinted fill). */
export const DashboardStatCard = ({
  title,
  value,
  hint,
  onClick,
  colClass = 'col-sm-6 col-md-4 col-lg-3',
}: DashboardStatCardProps) => {
  const outerStyle: CSSProperties = onClick ? { cursor: 'pointer' } : {};

  return (
    <div className={colClass} style={outerStyle} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div
        className="card shadow-sm h-100"
        style={{
          backgroundColor: colors.cardPrimaryBg,
          borderLeft: `5px solid ${colors.primary}`,
          transition: onClick ? 'transform 0.2s ease' : undefined,
        }}
      >
        <div className="card-body d-flex flex-column align-items-start">
          <h6 className="card-title mb-2 fw-semibold" style={{ color: colors.primary }}>
            {title}
          </h6>
          <span className="display-6 fw-bold" style={{ color: colors.primary }}>
            {value}
          </span>
          {hint ? <small className="text-muted mt-1">{hint}</small> : null}
        </div>
      </div>
    </div>
  );
};
