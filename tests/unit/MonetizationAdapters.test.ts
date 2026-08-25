import { describe, expect, it } from "vitest";
import { NoopRewardedAdAdapter } from "@infrastructure/ads/NoopRewardedAdAdapter";
import { NoopBillingAdapter } from "@infrastructure/billing/NoopBillingAdapter";

describe("NoopRewardedAdAdapter", () => {
  it("never grants a reward, since no ad SDK is wired", async () => {
    const adapter = new NoopRewardedAdAdapter();
    await expect(adapter.show("placement.double_coins")).resolves.toEqual({ granted: false });
  });
});

describe("NoopBillingAdapter", () => {
  it("never succeeds, since no billing SDK is wired", async () => {
    const adapter = new NoopBillingAdapter();
    await expect(adapter.purchase("product.remove_ads")).resolves.toEqual({ success: false });
  });
});
