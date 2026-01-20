import { NextResponse } from 'next/server'

export interface PaginationMetadata {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface MapMetadata {
  total: number
  filtered: number
  center: { lat: number; lng: number }
  zoom: number
}

export type ResponseMetadata = PaginationMetadata | MapMetadata | Record<string, unknown>

export interface ApiSuccessResponse<T, M = ResponseMetadata> {
  success: true
  data: T
  metadata?: M
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DB_ERROR: 'DB_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_EXCEEDED',
  SPAM_DETECTED: 'SPAM_DETECTED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

export function successResponse<T, M extends ResponseMetadata = ResponseMetadata>(
  data: T,
  metadata?: M,
  status = 200
): NextResponse<ApiSuccessResponse<T, M>> {
  const response: ApiSuccessResponse<T, M> = { success: true, data }
  if (metadata) {
    response.metadata = metadata
  }
  return NextResponse.json(response, { status })
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details },
    },
    { status }
  )
}
