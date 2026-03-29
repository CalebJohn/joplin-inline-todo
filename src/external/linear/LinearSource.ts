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
		if (this._settings.externalSources?.linear?.apiKey) {
			this.client = new LinearClient(this._settings.externalSources?.linear?.apiKey);
		} else {
			this.client = undefined;
		}
	}

	isEnabled(): boolean {
		return !!this._settings.externalSources?.linear?.apiKey;
	}

	getConfig(): ExternalSourceConfig {
		return {
			enabled: this.isEnabled(),
		};
	}

	updateSettings(settings: Settings): void {
		const apiKeyChanged = this._settings.externalSources?.linear?.apiKey !== settings.externalSources?.linear?.apiKey;
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
			icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 100 100"><path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3542-.0443L12.6587 18.074Z"/></svg>',
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
