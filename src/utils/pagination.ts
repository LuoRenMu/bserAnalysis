/**
 * Calculates visible page numbers for pagination UI.
 * Shows a sliding window of page numbers centered around the current page.
 *
 * @param currentPage - Current active page (1-based)
 * @param totalPage - Total number of pages
 * @param limit - Maximum number of page buttons to show (default: 10)
 * @returns Array of page numbers to display
 *
 * @example
 * calculateVisiblePages(5, 20, 10) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
 * calculateVisiblePages(15, 20, 10) => [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
 * calculateVisiblePages(3, 5, 10) => [1, 2, 3, 4, 5]
 */
export function calculateVisiblePages(
  currentPage: number,
  totalPage: number,
  limit: number = 10
): number[] {
  if (totalPage <= limit) {
    return Array.from({ length: totalPage }, (_, i) => i + 1);
  }

  const half = Math.floor(limit / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPage, start + limit - 1);

  if (end - start + 1 < limit) {
    start = Math.max(1, end - limit + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
