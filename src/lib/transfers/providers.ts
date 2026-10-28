import type { Currency } from '@/lib/currency'

export type ExternalTransferRail = 'mobile_money' | 'bank'
export type ExternalTransferStatus =
  | 'submitted'
  | 'processing'
  | 'pending_provider'
  | 'succeeded'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'refund_pending'
  | 'refunded'

export interface TransferDestination {
  country: string
  currency: Currency
  rail: ExternalTransferRail
  beneficiaryName: string
  beneficiaryPhone?: string
  bankName?: string
  accountNumber?: string
  iban?: string
  swiftBic?: string
  localBankFields?: Record<string, string>
}

export interface TransferQuoteRequest {
  destination: TransferDestination
  amount: string
  sendCurrency: Currency
}

export interface TransferQuote {
  quoteId: string
  sendAmount: string
  sendCurrency: Currency
  feeAmount: string
  receiveAmount: string
  receiveCurrency: Currency
  exchangeRate: string | null
  expiresAt: string
}

export type BeneficiaryLookup =
  | { status: 'recognized'; legalName: string; verifiedBy: string }
  | { status: 'not_found' }
  | { status: 'unavailable'; retryable: boolean }

export interface ProviderTransferResult {
  providerReference: string
  status: ExternalTransferStatus
  estimatedCompletionAt?: string
}

/**
 * Server-only integration contract. Each real partner adapter owns its API
 * protocol, credentials, error mapping, webhooks and idempotency behaviour.
 * No adapter is registered by default, so no external rail is advertised as live.
 */
export interface TransferProviderAdapter {
  readonly id: string
  readonly displayName: string
  readonly rail: ExternalTransferRail
  readonly countries: readonly string[]
  readonly currencies: readonly Currency[]
  lookupBeneficiary?(destination: TransferDestination): Promise<BeneficiaryLookup>
  quote(request: TransferQuoteRequest): Promise<TransferQuote>
  submit(request: TransferQuoteRequest & { quoteId: string; idempotencyKey: string }): Promise<ProviderTransferResult>
  getStatus(providerReference: string): Promise<ExternalTransferStatus>
  cancel?(providerReference: string, reason: string): Promise<ExternalTransferStatus>
  refund?(providerReference: string, reason: string): Promise<ExternalTransferStatus>
}

export class TransferProviderRegistry {
  private readonly adapters = new Map<string, TransferProviderAdapter>()

  register(adapter: TransferProviderAdapter): void {
    if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(adapter.id)) throw new Error('Invalid transfer provider id')
    if (this.adapters.has(adapter.id)) throw new Error(`Transfer provider already registered: ${adapter.id}`)
    if (!adapter.countries.length || !adapter.currencies.length) throw new Error('A transfer provider must declare supported corridors')
    this.adapters.set(adapter.id, adapter)
  }

  find(input: Pick<TransferDestination, 'country' | 'currency' | 'rail'>): TransferProviderAdapter[] {
    const country = input.country.toUpperCase()
    return [...this.adapters.values()].filter((adapter) =>
      adapter.rail === input.rail &&
      adapter.countries.includes(country) &&
      adapter.currencies.includes(input.currency),
    )
  }

  capabilities(): Array<{ id: string; name: string; rail: ExternalTransferRail; countries: string[]; currencies: Currency[] }> {
    return [...this.adapters.values()].map((adapter) => ({
      id: adapter.id,
      name: adapter.displayName,
      rail: adapter.rail,
      countries: [...adapter.countries],
      currencies: [...adapter.currencies],
    }))
  }
}

export const transferProviders = new TransferProviderRegistry()
