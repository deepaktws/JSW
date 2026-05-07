/** Default page size for offset pagination. */
export const DEFAULT_PAGE = 1;

/** Default items per page when `limit` is omitted. */
export const DEFAULT_LIMIT = 20;

/** Maximum allowed `limit` per request. */
export const MAX_LIMIT = 100;

function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

/**
 * Parses `page` and `limit` from Express `req.query` (strings).
 * Invalid or missing values fall back to defaults; `limit` is capped at {@link MAX_LIMIT}.
 *
 * @param {Record<string, string | undefined>} [query]
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function resolvePagination(query = {}) {
  const page = parsePositiveInt(query.page, DEFAULT_PAGE);
  let limit = parsePositiveInt(query.limit, DEFAULT_LIMIT);
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * @param {{ page: number, limit: number, total: number }} args
 * @returns {{ page: number, limit: number, total: number, totalPages: number }}
 */
export function buildPaginationMeta({ page, limit, total }) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { page, limit, total, totalPages };
}

/**
 * Generic paginated handler wrapper.
 * Service function must return `{ [itemsKey]: array, total: number }`.
 *
 * @param {Function} serviceFn - Service function accepting `{ skip, limit, req }`
 * @param {string} [itemsKey='items'] - Key for the items array in service response and final JSON
 * @returns {Function} Express handler (req, res, next) => Promise<void>
 */
export function paginatedHandler(serviceFn, itemsKey = 'items') {
  return async (req, res, next) => {
    try {
      const { page, limit, skip } = resolvePagination(req.query);
      const result = await serviceFn({ skip, limit, req });
      const { total } = result;
      const items = result[itemsKey];
      const meta = buildPaginationMeta({ page, limit, total });
      res.json({ [itemsKey]: items, meta });
    } catch (err) {
      next(err);
    }
  };
}
