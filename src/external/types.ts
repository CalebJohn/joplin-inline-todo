import { ExternalTodo, ExternalFetchResult, Settings } from '../types';

export interface ExternalSourceConfig {
	enabled: boolean;
	error?: string;
}

export interface ExternalSource {
	readonly sourceId: string;
	readonly displayName: string;

	isEnabled(): boolean;
	fetchTodos(): Promise<ExternalFetchResult>;
	markDone(todo: ExternalTodo): Promise<boolean>;
	getConfig(): ExternalSourceConfig;
	updateSettings(settings: Settings): void;
	clearCache(): void;
	setRefreshCallback(callback: (result: ExternalFetchResult) => void): void;
}
