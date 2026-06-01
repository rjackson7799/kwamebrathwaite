import { describe, it, expect } from 'vitest'
import {
  adminPrintFulfillmentSchema,
  adminFounderUpdateSchema,
  adminFounderActivateSchema,
} from '@/lib/api/validation'

describe('adminPrintFulfillmentSchema edition ranges', () => {
  it('accepts a numbered edition within 1..15', () => {
    expect(
      adminPrintFulfillmentSchema.safeParse({ edition_number: 15, is_ap: false, status: 'pending' })
        .success
    ).toBe(true)
  })

  it('rejects a numbered edition above 15', () => {
    expect(
      adminPrintFulfillmentSchema.safeParse({ edition_number: 16, is_ap: false, status: 'pending' })
        .success
    ).toBe(false)
  })

  it('accepts an Artist’s Proof within 1..2', () => {
    expect(
      adminPrintFulfillmentSchema.safeParse({ edition_number: 2, is_ap: true, status: 'pending' })
        .success
    ).toBe(true)
  })

  it('rejects an Artist’s Proof above 2', () => {
    expect(
      adminPrintFulfillmentSchema.safeParse({ edition_number: 3, is_ap: true, status: 'pending' })
        .success
    ).toBe(false)
  })

  it('allows a null/absent edition number (pending assignment)', () => {
    expect(adminPrintFulfillmentSchema.safeParse({ status: 'pending' }).success).toBe(true)
  })
})

describe('founder status enum', () => {
  it('accepts the new declined status', () => {
    expect(adminFounderUpdateSchema.safeParse({ status: 'declined' }).success).toBe(true)
  })

  it('rejects an unknown status', () => {
    expect(adminFounderUpdateSchema.safeParse({ status: 'nope' }).success).toBe(false)
  })
})

describe('adminFounderActivateSchema', () => {
  it('accepts donation details', () => {
    expect(
      adminFounderActivateSchema.safeParse({
        donation_amount: 10000,
        payment_reference: 'GB-1234',
        terms_version: 'fc-2026-05',
      }).success
    ).toBe(true)
  })

  it('accepts an empty payload (defaults applied at the route)', () => {
    expect(adminFounderActivateSchema.safeParse({}).success).toBe(true)
  })
})
