/** Minimal typed pub/sub, generic over any discriminated union keyed by `type`. */
export class EventBus<TEvent extends { type: string }> {
  private readonly handlers = new Map<TEvent["type"], Set<(event: TEvent) => void>>();

  on<TType extends TEvent["type"]>(
    type: TType,
    handler: (event: Extract<TEvent, { type: TType }>) => void,
  ): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    const wrapped = handler as (event: TEvent) => void;
    set.add(wrapped);
    return () => set.delete(wrapped);
  }

  emit(event: TEvent): void {
    const set = this.handlers.get(event.type);
    if (!set) {
      return;
    }
    for (const handler of set) {
      handler(event);
    }
  }
}
