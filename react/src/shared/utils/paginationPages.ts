export type PaginationItem = number | 'ellipsis';

/**
 * Returns a compact page list for UI pagination (e.g. 1 … 4 5 6 … 351).
 */
export const getPaginationItems = (
  currentPage: number,
  totalPages: number,
  siblingCount = 1
): PaginationItem[] => {
  const total = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, currentPage), total);

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: PaginationItem[] = [];
  const left = Math.max(2, current - siblingCount);
  const right = Math.min(total - 1, current + siblingCount);

  items.push(1);
  if (left > 2) items.push('ellipsis');
  for (let p = left; p <= right; p += 1) items.push(p);
  if (right < total - 1) items.push('ellipsis');
  items.push(total);

  return items;
};
