import { BaseExternalSource } from '../BaseExternalSource';
import { ExternalSourceError } from '../types';
import { ExternalTodo, ExternalFetchResult, Settings } from '../../types';
import { LinearClient, LinearIssue } from './LinearClient';

export class LinearSource extends BaseExternalSource {
	private client?: LinearClient;
	private doneStateCache: Map<string, string> = new Map();

	constructor(settings: Settings) {
		super('linear', settings);
		this.initClient();
	}

	private initClient(): void {
		const apiKey = this._settings.externalSources?.linear?.apiKey;
		this.client = apiKey ? new LinearClient(apiKey) : undefined;
	}

	isEnabled(): boolean {
		return !!this._settings.externalSources?.linear?.apiKey;
	}

	updateSettings(settings: Settings): void {
		const apiKeyChanged = this._settings.externalSources?.linear?.apiKey !== settings.externalSources?.linear?.apiKey;
		super.updateSettings(settings);

		if (apiKeyChanged) {
			this.initClient();
			this.doneStateCache.clear();
			this.resetState();
		}
	}

	protected async fetchTodosInternal(): Promise<ExternalFetchResult> {
		if (!this.client) {
			throw new ExternalSourceError('Linear API key not configured', 'auth');
		}

		const issues = await this.client.fetchAssignedIssues();

		return {
			source: this.sourceId,
			todos: issues.map(issue => this.issueToTodo(issue)),
			timestamp: Date.now(),
		};
	}

	private issueToTodo(issue: LinearIssue): ExternalTodo {
		const completed = issue.state.type === 'completed' || issue.state.type === 'canceled';

		return {
			note: `linear:${issue.identifier}`,
			note_title: issue.identifier,
			parent_id: `linear:${issue.team.id}`,
			parent_title: issue.team.name,
			msg: issue.title,
			category: issue.state.name,
			date: issue.dueDate || '',
			tags: issue.labels.nodes.map(l => l.name),
			note_tags: [],
			completed,
			description: issue.description || '',
			scrollTo: { text: '', element: 'ul' as const },
			key: `linear:${issue.id}`,

			source: this.sourceId,
			externalId: issue.id,
			externalUrl: issue.url,
		};
	}

	protected async markDoneInternal(todo: ExternalTodo): Promise<boolean> {
		if (!this.client) {
			this.logger.error('Cannot mark done: Linear client not initialized');
			return false;
		}

		// parent_id has the form "linear:{teamId}"
		const teamId = todo.parent_id.replace('linear:', '');

		let doneStateId = this.doneStateCache.get(teamId);
		if (!doneStateId) {
			doneStateId = await this.client.getDoneStateForTeam(teamId);
			if (doneStateId) {
				this.doneStateCache.set(teamId, doneStateId);
			}
		}

		if (!doneStateId) {
			this.logger.error('Could not find Done state for team:', teamId);
			return false;
		}

		return await this.client.updateIssueState(todo.externalId, doneStateId);
	}
}
