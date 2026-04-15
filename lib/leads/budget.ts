export type LeadProvider = 'exa' | 'openai' | 'perplexity' | 'firecrawl' | 'hunter'

export class BudgetCapReachedError extends Error {
  constructor(
    public readonly spent: number,
    public readonly cap: number
  ) {
    super(`Budget cap reached: $${spent.toFixed(4)} / $${cap.toFixed(2)}`)
    this.name = 'BudgetCapReachedError'
  }
}

export class BudgetTracker {
  private spent = 0
  private perProvider: Record<string, number> = {}

  constructor(private readonly capUsd: number) {}

  get totalUsd(): number {
    return this.spent
  }

  get breakdown(): Record<string, number> {
    return { ...this.perProvider }
  }

  get remainingUsd(): number {
    return Math.max(0, this.capUsd - this.spent)
  }

  /** Throws if adding `estimatedUsd` would exceed the cap. Call BEFORE paid work. */
  assertAffordable(estimatedUsd: number): void {
    if (this.spent + estimatedUsd > this.capUsd) {
      throw new BudgetCapReachedError(this.spent, this.capUsd)
    }
  }

  record(provider: LeadProvider, usd: number): void {
    this.spent += usd
    this.perProvider[provider] = (this.perProvider[provider] || 0) + usd
  }
}
