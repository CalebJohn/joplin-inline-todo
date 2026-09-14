import { ExternalSource, ExternalSourceError } from './types';
import { ExternalTodo, ExternalFetchResult, Settings } from '../types';
import Logger from "@joplin/utils/Logger";

export const CACHE_TTL_MS = 5 * 60 * 1000;
export const FAILURE_BACKOFF_BASE_MS = 30 * 1000;
export const FAILURE_BACKOFF_MAX_MS = 5 * 60 * 1000;
export const RATE_LIMIT_DEFAULT_MS = 60 * 1000;

interface CacheEntry {
	result: ExternalFetchResult;
	expiresAt: number;
}

interface InflightFetch {
	promise: Promise<ExternalFetchResult>;
	// mutationGen at the time the fetch started
	startGen: number;
	// configGen at the time the fetch started
	configGen: number;
}

export abstract class BaseExternalSource implements ExternalSource {
	protected logger: ReturnType<typeof Logger.create>;
	protected _settings: Settings;

	private cache?: CacheEntry;
	private inflight?: InflightFetch;
	// Incremented on every successful markDone. A fetch that started before a mutation
	// may not reflect it, so its result gets the override applied.
	private mutationGen = 0;
	// Incremented by resetState. A fetch started under an older config is discarded.
	private configGen = 0;
	// externalId -> generation of the markDone that completed it
	private overrides: Map<string, { gen: number }> = new Map();
	private cooldownUntil = 0;
	private consecutiveFailures = 0;
	private authBlocked = false;
	private lastError?: string;
	private refreshCallback?: (result: ExternalFetchResult) => void;

	constructor(readonly sourceId: string, settings: Settings) {
		this._settings = settings;
		this.logger = Logger.create(`inline-todo: ${sourceId}`);
	}

	abstract isEnabled(): boolean;
	protected abstract fetchTodosInternal(): Promise<ExternalFetchResult>;
	protected abstract markDoneInternal(todo: ExternalTodo): Promise<boolean>;

	updateSettings(settings: Settings): void {
		// joplin.settings.onChange fires for every setting, so subclasses decide
		// whether the change requires resetState().
		this._settings = settings;
	}

	setRefreshCallback(callback: (result: ExternalFetchResult) => void): void {
		this.refreshCallback = callback;
	}

	async fetchTodos(forceFresh: boolean = false): Promise<ExternalFetchResult> {
		if (!this.isEnabled()) {
			return this.emptyResult();
		}

		// Manual refresh bypasses the TTL and any cooldown, but still shares an in-flight fetch.
		if (forceFresh) {
			return this.startFetch();
		}

		const now = Date.now();

		if (this.cache) {
			if (now >= this.cache.expiresAt && !this.hasInflight() && !this.inCooldown(now)) {
				// Stale-while-revalidate: return the stale result and refresh in the background.
				this.refreshInBackground();
			}
			return this.cachedResult();
		}

		if (this.inCooldown(now)) {
			return { ...this.emptyResult(), error: this.lastError };
		}

		return this.startFetch();
	}

	async markDone(todo: ExternalTodo): Promise<boolean> {
		let success: boolean;
		try {
			success = await this.markDoneInternal(todo);
		} catch (error) {
			this.logger.error('Error marking todo done:', error);
			return false;
		}

		if (!success) {
			return false;
		}

		this.mutationGen++;
		this.overrides.set(todo.externalId, { gen: this.mutationGen });

		// Patch the cached copy so the next fetchTodos reflects the change without a network call.
		// New objects are created so consumers comparing by identity see the change.
		if (this.cache) {
			const todos = this.cache.result.todos.map(t =>
				t.externalId === todo.externalId ? { ...t, completed: true } : t
			);
			this.cache = {
				...this.cache,
				result: { ...this.cache.result, todos },
			};
		}

		return true;
	}

	// Called by subclasses when their configuration changes (e.g. a new API key).
	// Does not touch an in-flight fetch; its result is discarded via configGen instead.
	protected resetState(): void {
		this.configGen++;
		this.cache = undefined;
		this.overrides.clear();
		this.cooldownUntil = 0;
		this.consecutiveFailures = 0;
		this.authBlocked = false;
		this.lastError = undefined;

		// Fetch under the new configuration so an open editor updates without a manual refresh
		if (this.isEnabled()) {
			this.refreshInBackground();
		}
	}

	// The last good todos, plus the error from the most recent failed refresh if any.
	// lastError is cleared on the next successful fetch.
	private cachedResult(): ExternalFetchResult {
		if (this.lastError) {
			return { ...this.cache.result, error: this.lastError };
		}
		return this.cache.result;
	}

	private emptyResult(): ExternalFetchResult {
		return {
			source: this.sourceId,
			todos: [],
			timestamp: Date.now(),
		};
	}

	private inCooldown(now: number): boolean {
		return this.authBlocked || now < this.cooldownUntil;
	}

	// An in-flight fetch from a previous config is ignored, so a new one may start alongside it.
	private hasInflight(): boolean {
		return !!this.inflight && this.inflight.configGen === this.configGen;
	}

	private startFetch(): Promise<ExternalFetchResult> {
		if (this.hasInflight()) {
			return this.inflight.promise;
		}

		const startGen = this.mutationGen;
		const configGen = this.configGen;
		const promise = this.runFetch(startGen, configGen);
		const entry: InflightFetch = { promise, startGen, configGen };
		this.inflight = entry;
		void promise.finally(() => {
			if (this.inflight === entry) {
				this.inflight = undefined;
			}
		});
		return promise;
	}

	// Never rejects. Errors are classified and reported via the result's error field.
	private async runFetch(startGen: number, configGen: number): Promise<ExternalFetchResult> {
		let result: ExternalFetchResult;
		try {
			result = await this.fetchTodosInternal();
		} catch (error) {
			return this.onFetchError(error, configGen);
		}

		// The new configuration's own fetch supplies the real data
		if (configGen !== this.configGen) {
			this.logger.info('Discarding fetch result from a previous configuration');
			return this.emptyResult();
		}

		// Overrides from mutations that completed after this fetch started may not be reflected
		// in the result. Older ones are already reflected and can be dropped.
		for (const [externalId, override] of this.overrides) {
			if (override.gen <= startGen) {
				this.overrides.delete(externalId);
			}
		}
		if (this.overrides.size > 0) {
			result = {
				...result,
				todos: result.todos.map(t =>
					this.overrides.has(t.externalId) && !t.completed ? { ...t, completed: true } : t
				),
			};
		}

		this.cache = { result, expiresAt: Date.now() + CACHE_TTL_MS };
		this.consecutiveFailures = 0;
		this.lastError = undefined;
		return result;
	}

	private onFetchError(error: unknown, configGen: number): ExternalFetchResult {
		const message = error instanceof Error ? error.message : String(error);
		this.logger.error('Error fetching todos:', error);

		// A failure under a previous configuration must not put the current one into cooldown.
		if (configGen === this.configGen) {
			const now = Date.now();
			const kind = error instanceof ExternalSourceError ? error.kind : 'other';
			if (kind === 'auth') {
				this.authBlocked = true;
			} else if (kind === 'rate_limit') {
				const retryAfterMs = (error as ExternalSourceError).retryAfterMs;
				this.cooldownUntil = now + (retryAfterMs ?? RATE_LIMIT_DEFAULT_MS);
			} else {
				this.consecutiveFailures++;
				const backoff = FAILURE_BACKOFF_BASE_MS * Math.pow(2, this.consecutiveFailures - 1);
				this.cooldownUntil = now + Math.min(backoff, FAILURE_BACKOFF_MAX_MS);
			}
			this.lastError = message;
		}

		// The last good todos are kept so a transient failure does not empty the list.
		return {
			source: this.sourceId,
			todos: this.cache?.result.todos ?? [],
			error: message,
			timestamp: this.cache?.result.timestamp ?? Date.now(),
		};
	}

	private refreshInBackground(): void {
		const configGen = this.configGen;
		this.startFetch()
			.then(result => {
				if (!result.error && configGen === this.configGen) {
					this.refreshCallback?.(result);
				}
			})
			.catch(error => {
				this.logger.error('Background refresh failed:', error);
			});
	}
}
