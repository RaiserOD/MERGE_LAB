/**
 * Time is a domain-level port: the rule "state transitions are
 * deterministic, and time is injected rather than read" belongs to the
 * domain, so the interface does too. `SystemClock` — the adapter that
 * actually reads the wall clock — stays in infrastructure, which is the
 * only layer allowed to touch a platform API.
 *
 * Domain/systems never call Date.now() directly.
 */
export interface Clock {
  now(): number;
}
