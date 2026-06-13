import { ExternalSource, ExternalSourceConfig } from './types';
import { ExternalTodo, ExternalFetchResult, Settings } from '../types';
import Logger from "@joplin/utils/Logger";

const DEFAULT_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export abstract class BaseExternalSource implements ExternalSource {
	protected logger: ReturnType<typeof Logger.create>;
	protected cachedResult?: ExternalFetchResult;
	protected cacheExpiry?: Date;
	protected cacheDurationMs: number;
	protected _settings: Settings;
	private refreshInProgress: boolean = false;
	private refreshCallback?: (result: ExternalFetchResult) => void;

	abstract readonly sourceId: string;
	abstract readonly displayName: string;

	constructor(settings: Settings, cacheDurationMs: number = DEFAULT_CACHE_DURATION_MS) {
		this.cacheDurationMs = cacheDurationMs;
		this._settings = settings;
	}

	protected initLogger(): void {
		this.logger = Logger.create(`inline-todo: ${this.sourceId}`);
	}

	abstract isEnabled(): boolean;
	protected abstract fetchTodosInternal(): Promise<ExternalFetchResult>;
	protected abstract markDoneInternal(todo: ExternalTodo): Promise<boolean>;
	abstract getConfig(): ExternalSourceConfig;

	updateSettings(settings: Settings): void {
		this._settings = settings;
		this.clearCache();
	}

	async fetchTodos(): Promise<ExternalFetchResult> {
		if (!this.isEnabled()) {
			return {
				source: this.sourceId,
				todos: [],
				timestamp: new Date(),
			};
		}

		const cacheValid = this.cachedResult && this.cacheExpiry && new Date() < this.cacheExpiry;

		// Return cached result if still valid
		if (cacheValid) {
			this.logger?.info('Returning cached result');
			return this.cachedResult;
		}

		// Cache expired but we have stale data — return it and refresh in the background.
		// The refreshCallback (wired by ExternalSourceManager) notifies the UI when fresh data arrives.
		if (this.cachedResult && !this.refreshInProgress) {
			this.logger?.info('Returning stale cache, refreshing in background');
			this.refreshInBackground();
			return this.cachedResult;
		}

		// No cached data at all — must fetch synchronously
		return this.fetchAndCache();
	}

	setRefreshCallback(callback: (result: ExternalFetchResult) => void): void {
		this.refreshCallback = callback;
	}

	private refreshInBackground(): void {
		this.refreshInProgress = true;
		this.fetchAndCache()
			.then(result => {
				// Only notify on a successful refresh — errors leave the stale cache in place
				if (!result.error && this.refreshCallback) {
					this.refreshCallback(result);
				}
			})
			.finally(() => {
				this.refreshInProgress = false;
			});
	}

	private async fetchAndCache(): Promise<ExternalFetchResult> {
		try {
			const result = await this.fetchTodosInternal();

			if (!result.error) {
				this.cachedResult = result;
				this.cacheExpiry = new Date(Date.now() + this.cacheDurationMs);
			}

			return result;
		} catch (error) {
			this.logger?.error('Error fetching todos:', error);
			return {
				source: this.sourceId,
				todos: [],
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date(),
			};
		}
	}

	async markDone(todo: ExternalTodo): Promise<boolean> {
		try {
			const success = await this.markDoneInternal(todo);

			// Invalidate cache on successful update
			if (success) {
				this.clearCache();
			}

			return success;
		} catch (error) {
			this.logger?.error('Error marking todo done:', error);
			return false;
		}
	}

	clearCache(): void {
		this.cachedResult = undefined;
		this.cacheExpiry = undefined;
	}
}
