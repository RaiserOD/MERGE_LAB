export interface PurchaseResult {
  readonly success: boolean;
}

/**
 * The only interface gameplay/application code should need for in-app
 * purchases (B4: third-party billing SDKs load only from
 * src/infrastructure/**). `productId` is a store-side SKU — the catalog of
 * what's for sale is a product/economy decision (A16/B9) that doesn't
 * exist yet, so nothing in this codebase invents product ids.
 */
export interface BillingAdapter {
  purchase(productId: string): Promise<PurchaseResult>;
}
