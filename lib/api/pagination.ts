import type { PaginationMetadata } from './response'

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

export function createPaginationMetadata(
  page: number,
  pageSize: number,
  total: number
): PaginationMetadata {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * Calculate Supabase range values from page and limit
 */
export function getPagination(page: number, limit: number): { from: number; to: number } {
  const from = (page - 1) * limit
  const to = from + limit - 1
  return { from, to }
}
