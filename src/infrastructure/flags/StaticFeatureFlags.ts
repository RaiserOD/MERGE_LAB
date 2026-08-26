import type { FeatureFlagName, FeatureFlags } from "@infrastructure/flags/FeatureFlags";

/**
 * Default flags source: a fixed set read once at startup. Every flag is off
 * unless explicitly turned on — safe-by-default for features that need a
 * vendor decision before they can do anything real. Swap for a remote
 * config adapter later without touching any caller.
 */
export class StaticFeatureFlags implements FeatureFlags {
  constructor(private readonly overrides: Partial<Record<FeatureFlagName, boolean>> = {}) {}

  isEnabled(flag: FeatureFlagName): boolean {
    return this.overrides[flag] ?? false;
  }
}
