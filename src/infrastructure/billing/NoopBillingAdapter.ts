import type { BillingAdapter, PurchaseResult } from "@infrastructure/billing/BillingAdapter";

/**
 * Default adapter: no store billing SDK is wired yet, so every purchase
 * attempt fails cleanly rather than granting anything. Picking a billing
 * vendor/provider is a decision for later, not something to default
 * into silently.
 */
export class NoopBillingAdapter implements BillingAdapter {
  purchase(_productId: string): Promise<PurchaseResult> {
    return Promise.resolve({ success: false });
  }
}
