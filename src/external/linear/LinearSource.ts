import { BaseExternalSource } from '../BaseExternalSource';
import { ExternalSourceConfig } from '../types';
import { ExternalTodo, ExternalFetchResult, Settings } from '../../types';
import { LinearClient, LinearIssue } from './LinearClient';

export class LinearSource extends BaseExternalSource {
	readonly sourceId = 'linear';
	readonly displayName = 'Linear';

	private client?: LinearClient;
	private doneStateCache: Map<string, string> = new Map();

	constructor(settings: Settings) {
		super(settings);
		this.initLogger();
		this.initClient();
	}

	private initClient(): void {
		if (this._settings.linearApiKey) {
			this.client = new LinearClient(this._settings.linearApiKey);
		} else {
			this.client = undefined;
		}
	}

	isEnabled(): boolean {
		return !!this._settings.linearApiKey;
	}

	getConfig(): ExternalSourceConfig {
		return {
			enabled: this.isEnabled(),
		};
	}

	updateSettings(settings: Settings): void {
		const apiKeyChanged = this._settings.linearApiKey !== settings.linearApiKey;
		super.updateSettings(settings);

		if (apiKeyChanged) {
			this.initClient();
			this.doneStateCache.clear();
		}
	}

	protected async fetchTodosInternal(): Promise<ExternalFetchResult> {
		if (!this.client) {
			return {
				source: this.sourceId,
				todos: [],
				error: 'Linear API key not configured',
				timestamp: new Date(),
			};
		}

		try {
			const issues = await this.client.fetchAssignedIssues();
			const todos: ExternalTodo[] = issues.map(issue => this.issueToTodo(issue));

			return {
				source: this.sourceId,
				todos,
				timestamp: new Date(),
			};
		} catch (error) {
			this.logger?.error('Failed to fetch Linear issues:', error);
			return {
				source: this.sourceId,
				todos: [],
				error: error instanceof Error ? error.message : 'Unknown error fetching Linear issues',
				timestamp: new Date(),
			};
		}
	}

	private issueToTodo(issue: LinearIssue): ExternalTodo {
		// Map Linear state types to completion status
		const completed = issue.state.type === 'completed' || issue.state.type === 'canceled';

		return {
			// Standard Todo fields
			note: `linear:${issue.identifier}`,
			note_title: issue.identifier,
			parent_id: `linear:${issue.team.id}`,
			parent_title: issue.team.name,
			msg: issue.title,
			category: issue.state.name,
			date: issue.dueDate || '',
			tags: issue.labels.nodes.map(l => l.name),
			completed,
			description: issue.description || '',
			scrollTo: { text: '', element: 'ul' as const },
			key: `linear:${issue.id}`,

			// External-specific fields
			source: 'linear',
			externalId: issue.id,
			externalUrl: issue.url,
			externalState: issue.state.name,
		};
	}

	protected async markDoneInternal(todo: ExternalTodo): Promise<boolean> {
		if (!this.client) {
			this.logger?.error('Cannot mark done: Linear client not initialized');
			return false;
		}

		// Extract team ID from parent_id (format: "linear:{teamId}")
		const teamId = todo.parent_id.replace('linear:', '');

		// Get or cache the "Done" state for this team
		let doneStateId = this.doneStateCache.get(teamId);
		if (!doneStateId) {
			try {
				doneStateId = await this.client.getDoneStateForTeam(teamId);
				if (doneStateId) {
					this.doneStateCache.set(teamId, doneStateId);
				}
			} catch (error) {
				this.logger?.error('Failed to get Done state for team:', teamId, error);
				return false;
			}
		}

		if (!doneStateId) {
			this.logger?.error('Could not find Done state for team:', teamId);
			return false;
		}

		try {
			return await this.client.updateIssueState(todo.externalId, doneStateId);
		} catch (error) {
			this.logger?.error('Failed to update issue state:', error);
			return false;
		}
	}
}
