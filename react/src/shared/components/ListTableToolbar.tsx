import type { ReactNode } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

type Props = {
  rowsPerPage: number;
  pageSizeOptions: number[];
  totalRows: number;
  searchTerm: string;
  searchPlaceholder: string;
  searchLabel?: string;
  searchId: string;
  onRowsPerPageChange: (next: number) => void;
  onSearchTermChange: (value: string) => void;
  onApplySearch: () => void;
  onClearSearch: () => void;
  leftExtra?: ReactNode;
};

export const ListTableToolbar = ({
  rowsPerPage,
  pageSizeOptions,
  totalRows,
  searchTerm,
  searchPlaceholder,
  searchLabel = 'Search',
  searchId,
  onRowsPerPageChange,
  onSearchTermChange,
  onApplySearch,
  onClearSearch,
  leftExtra,
}: Props) => (
  <div className="d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-2 mb-3">
    <div className="d-flex flex-wrap align-items-end gap-2">
      <div className="flex-shrink-0">
        <label htmlFor={`${searchId}-rows-limit`} className="form-label small text-muted mb-1">
          Rows per page
        </label>
        <select
          id={`${searchId}-rows-limit`}
          className="form-select form-select-sm"
          style={{ minWidth: 88 }}
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      {leftExtra}
    </div>

    <div className="d-flex flex-column align-items-lg-end gap-1" style={{ width: 'min(340px, 100%)' }}>
      <div className="text-muted small text-lg-end">
        Total <span className="fw-semibold text-dark">{totalRows}</span>
      </div>
      <label htmlFor={searchId} className="form-label small text-muted mb-1 w-100">
        {searchLabel}
      </label>
      <div className="input-group input-group-sm">
        <span className="input-group-text bg-white border-end-0 py-1" id={`${searchId}-addon`}>
          <FaSearch className="text-secondary" size={14} aria-hidden />
        </span>
        <input
          id={searchId}
          type="search"
          className="form-control border-start-0"
          placeholder={searchPlaceholder}
          aria-describedby={`${searchId}-addon`}
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onApplySearch();
          }}
        />
        <button
          type="button"
          className="btn btn-primary px-2"
          title="Search"
          aria-label="Search"
          onClick={onApplySearch}
        >
          <FaSearch size={14} aria-hidden />
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary px-2"
          title="Clear search"
          aria-label="Clear search"
          onClick={onClearSearch}
        >
          <FaTimes size={14} aria-hidden />
        </button>
      </div>
    </div>
  </div>
);

