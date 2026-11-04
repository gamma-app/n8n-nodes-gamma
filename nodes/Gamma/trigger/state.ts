/**
 * Polling state for the Gamma Trigger.
 *
 * Gamma has no webhooks, so the trigger polls. Two endpoints support it:
 * comment threads (`updatedSince`) and gamma search (`updatedAfter`). Both
 * filter on server-side timestamps, so the trigger keeps a high-water mark of
 * the newest timestamp it has seen and asks only for what changed after it.
 *
 * A bare high-water mark loses events in two ways:
 *
 * - Something written at time T can become visible after the trigger has
 *   already seen something newer (replication or search-index lag), so a query
 *   from the newest timestamp never returns it.
 * - The n8n host and Gamma do not share a clock.
 *
 * So every poll reads from the high-water mark minus `LOOKBACK_MS`, and the
 * state remembers what it already emitted inside that window. Keys carry the
 * item's timestamp, so a later edit of the same thread or gamma is a new key
 * and fires again, while a re-read of the same version does not.
 */

/** How far before the high-water mark each poll reads again. */
export const LOOKBACK_MS = 2 * 60 * 1000;

export interface PollState {
	/** What this state belongs to: the event plus its filters. A change resets it. */
	scope: string;
	/** High-water mark, in epoch milliseconds. */
	since: number;
	/** Keys already handled inside the lookback window, with the time each refers to. */
	seen: Record<string, number>;
}

/** Epoch milliseconds for an ISO-8601 string, or undefined if it does not parse. */
export function toMs(value: unknown): number | undefined {
	if (typeof value !== 'string' || value === '') return undefined;
	const ms = Date.parse(value);
	return Number.isNaN(ms) ? undefined : ms;
}

/** Where the next request should start reading. */
export function queryFrom(state: PollState): number {
	return state.since - LOOKBACK_MS;
}

/** Whether `stored` is a usable state for `scope`. Anything else means start over. */
export function isCurrent(stored: unknown, scope: string): stored is PollState {
	if (!stored || typeof stored !== 'object') return false;
	const s = stored as Partial<PollState>;
	return s.scope === scope && typeof s.since === 'number' && !!s.seen && typeof s.seen === 'object';
}

/**
 * Tracks one poll: which keys are new, and the high-water mark the next poll
 * should use.
 */
export class PollTracker {
	private readonly seen: Record<string, number>;
	private newest: number;

	constructor(private readonly state: PollState) {
		this.seen = { ...state.seen };
		this.newest = state.since;
	}

	/** Whether `key` was handled by an earlier poll (or earlier in this one). */
	has(key: string): boolean {
		return Object.prototype.hasOwnProperty.call(this.seen, key);
	}

	/** Records `key` as handled. Returns true if it was not already. */
	mark(key: string, ms: number): boolean {
		if (this.has(key)) return false;
		this.seen[key] = ms;
		return true;
	}

	/** Moves the high-water mark forward to `ms` if it is newer. */
	advance(ms: number | undefined): void {
		if (ms !== undefined && ms > this.newest) this.newest = ms;
	}

	/**
	 * The state to persist. Keys older than the next poll's read window can
	 * never be returned again, so they are dropped and the state stays small.
	 */
	next(): PollState {
		const since = this.newest;
		const floor = since - LOOKBACK_MS;
		const seen: Record<string, number> = {};
		for (const [key, ms] of Object.entries(this.seen)) {
			if (ms >= floor) seen[key] = ms;
		}
		return { scope: this.state.scope, since, seen };
	}
}
