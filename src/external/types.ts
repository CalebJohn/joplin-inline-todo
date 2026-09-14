import { ExternalTodo, ExternalFetchResult, Settings } from '../types';

export type ExternalErrorKind = 'auth' | 'rate_limit' | 'network' | 'other';

// Thrown by source clients so BaseExternalSource can decide how long to back off.
export class ExternalSourceError extends Error {
	constructor(message: string, readonly kind: ExternalErrorKind, readonly retryAfterMs?: number) {
		super(message);
		this.name = 'ExternalSourceError';
	}
}

export interface ExternalSource {
	readonly sourceId: string;

	isEnabled(): boolean;
	fetchTodos(forceFresh?: boolean): Promise<ExternalFetchResult>;
	markDone(todo: ExternalTodo): Promise<boolean>;
	updateSettings(settings: Settings): void;
	setRefreshCallback(callback: (result: ExternalFetchResult) => void): void;
}
