import { ExternalSource } from './types';
import { ExternalTodo, ExternalSourcesState, Settings, isExternalTodo } from '../types';
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: ExternalSourceManager');

export class ExternalSourceManager {
	private sources: Map<string, ExternalSource> = new Map();
	private _settings: Settings;

	constructor(settings: Settings) {
		this._settings = settings;
	}

	registerSource(source: ExternalSource): void {
		this.sources.set(source.sourceId, source);
	}

	updateSettings(settings: Settings): void {
		this._settings = settings;

		for (const source of this.sources.values()) {
			source.updateSettings(settings);
		}
	}

	getEnabledSources(): ExternalSource[] {
		return Array.from(this.sources.values()).filter(s => s.isEnabled());
	}

	async fetchAllTodos(): Promise<ExternalSourcesState> {
		const enabledSources = this.getEnabledSources();

		if (enabledSources.length === 0) {
			return {};
		}

		const results = await Promise.all(
			enabledSources.map(source => source.fetchTodos())
		);

		const state: ExternalSourcesState = {};
		for (const result of results) {
			state[result.source] = result;
		}

		return state;
	}

	async fetchTodosFromSource(sourceId: string): Promise<ExternalSourcesState> {
		const source = this.sources.get(sourceId);
		if (!source || !source.isEnabled()) {
			return {};
		}

		const result = await source.fetchTodos();
		return { [sourceId]: result };
	}

	async markDone(todo: ExternalTodo): Promise<boolean> {
		const source = this.sources.get(todo.source);
		if (!source) {
			logger.error('Unknown source for todo:', todo.source);
			return false;
		}

		return source.markDone(todo);
	}

	clearAllCaches(): void {
		for (const source of this.sources.values()) {
			source.clearCache();
		}
	}

	getSourceConfigs(): Record<string, ReturnType<ExternalSource['getConfig']>> {
		const configs: Record<string, ReturnType<ExternalSource['getConfig']>> = {};
		for (const [id, source] of this.sources) {
			configs[id] = source.getConfig();
		}
		return configs;
	}
}
