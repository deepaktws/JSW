import type { Request, RequestHandler } from 'express';

/** Default page size for offset pagination. */
export const DEFAULT_PAGE = 1;

/** Default items per page when `limit` is omitted. */
export const DEFAULT_LIMIT = 20;

/** Maximum allowed `limit` per request. */
export const MAX_LIMIT = 100;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

/**
 * Parses `page` and `limit` from Express `req.query` (strings).
 * Invalid or missing values fall back to defaults; `limit` is capped at {@link MAX_LIMIT}.
 */
export function resolvePagination(query: Record<string, string | undefined> = {}): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = parsePositiveInt(query.page, DEFAULT_PAGE);
  let limit = parsePositiveInt(query.limit, DEFAULT_LIMIT);
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta({
  page,
  limit,
  total,
}: {
  page: number;
  limit: number;
  total: number;
}): { page: number; limit: number; total: number; totalPages: number } {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { page, limit, total, totalPages };
}

type PaginatedServiceFn = (args: {
  skip: number;
  limit: number;
  req: Request;
}) => Promise<{ total: number } & Record<string, unknown>>;

/**
 * Generic paginated handler wrapper.
 * Service function must return `{ [itemsKey]: array, total: number }`.
 */
export function paginatedHandler(
  serviceFn: PaginatedServiceFn,
  itemsKey = 'items',
): RequestHandler {
  return async (req, res, next) => {
    try {
      const { page, limit, skip } = resolvePagination(
        req.query as Record<string, string | undefined>,
      );
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
