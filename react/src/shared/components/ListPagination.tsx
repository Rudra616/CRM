import { getPaginationItems } from '../utils/paginationPages';

type Props = {
  page: number;
  totalPages: number;
  total: number;
  start: number;
  end: number;
  onPageChange: (page: number) => void;
};

export const ListPagination = ({
  page,
  totalPages,
  total,
  start,
  end,
  onPageChange,
}: Props) => {
  if (total <= 0) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const items = getPaginationItems(page, safeTotalPages);

  return (
    <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
      <div className="text-muted small">
        {start}–{end} of {total}
        <span className="ms-1">
          (page {page} of {safeTotalPages})
        </span>
      </div>
      <nav aria-label="Table pagination">
        <ul className="pagination pagination-sm mb-0 flex-wrap">
          <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Prev
            </button>
          </li>
          {items.map((item, idx) =>
            item === 'ellipsis' ? (
              <li key={`ellipsis-${idx}`} className="page-item disabled" aria-hidden="true">
                <span className="page-link">…</span>
              </li>
            ) : (
              <li key={item} className={`page-item ${page === item ? 'active' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => onPageChange(item)}
                  aria-current={page === item ? 'page' : undefined}
                >
                  {item}
                </button>
              </li>
            )
          )}
          <li className={`page-item ${page >= safeTotalPages ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link"
              disabled={page >= safeTotalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};
