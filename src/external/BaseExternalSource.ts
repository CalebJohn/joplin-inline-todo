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

		// Check cache validity
		if (this.cachedResult && this.cacheExpiry && new Date() < this.cacheExpiry) {
			this.logger?.info('Returning cached result');
			return this.cachedResult;
		}

		try {
			const result = await this.fetchTodosInternal();

			// Cache successful results
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
