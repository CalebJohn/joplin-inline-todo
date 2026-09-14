import { ExternalSource } from './types';
import { ExternalTodo, ExternalSourcesState, Settings } from '../types';
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: ExternalSourceManager');

export class ExternalSourceManager {
	private sources: Map<string, ExternalSource> = new Map();
	private refreshCallback?: (state: ExternalSourcesState) => void;

	registerSource(source: ExternalSource): void {
		this.sources.set(source.sourceId, source);
		// A background refresh reports only the source that refreshed; the UI merges it.
		source.setRefreshCallback((result) => {
			this.refreshCallback?.({ [result.source]: result });
		});
	}

	setRefreshCallback(callback: (state: ExternalSourcesState) => void): void {
		this.refreshCallback = callback;
	}

	updateSettings(settings: Settings): void {
		for (const source of this.sources.values()) {
			source.updateSettings(settings);
		}
	}

	getEnabledSources(): ExternalSource[] {
		return Array.from(this.sources.values()).filter(s => s.isEnabled());
	}

	async fetchAllTodos(forceFresh: boolean = false): Promise<ExternalSourcesState> {
		const enabledSources = this.getEnabledSources();

		if (enabledSources.length === 0) {
			return {};
		}

		const results = await Promise.all(
			enabledSources.map(source => source.fetchTodos(forceFresh))
		);

		const state: ExternalSourcesState = {};
		for (const result of results) {
			state[result.source] = result;
		}

		return state;
	}

	async markDone(todo: ExternalTodo): Promise<boolean> {
		const source = this.sources.get(todo.source);
		if (!source) {
			logger.error('Unknown source for todo:', todo.source);
			return false;
		}

		return source.markDone(todo);
	}
}
