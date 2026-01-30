import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: LinearClient');

const ASSIGNED_ISSUES_QUERY = `
query AssignedIssues($after: String) {
  viewer {
    id
    name
    assignedIssues(
      first: 100
      after: $after
      orderBy: updatedAt
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        identifier
        title
        description
        url
        dueDate
        priority
        state {
          id
          name
          type
        }
        team {
          id
          name
        }
        labels {
          nodes {
            id
            name
          }
        }
        createdAt
        updatedAt
      }
    }
  }
}
`;

const GET_DONE_STATE_QUERY = `
query GetDoneState($teamId: String!) {
  workflowStates(filter: { team: { id: { eq: $teamId } }, type: { eq: "completed" } }) {
    nodes {
      id
      name
      type
    }
  }
}
`;

const UPDATE_ISSUE_STATE_MUTATION = `
mutation UpdateIssueState($issueId: String!, $stateId: String!) {
  issueUpdate(id: $issueId, input: { stateId: $stateId }) {
    success
    issue {
      id
      state {
        id
        name
        type
      }
    }
  }
}
`;

export interface LinearIssue {
	id: string;
	identifier: string;
	title: string;
	description?: string;
	url: string;
	dueDate?: string;
	priority: number;
	state: {
		id: string;
		name: string;
		type: string; // 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled'
	};
	team: {
		id: string;
		name: string;
	};
	labels: {
		nodes: Array<{ id: string; name: string }>;
	};
	createdAt: string;
	updatedAt: string;
}

export class LinearClient {
	private apiKey: string;
	private baseUrl = 'https://api.linear.app/graphql';

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	private async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
		const response = await fetch(this.baseUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': this.apiKey,
			},
			body: JSON.stringify({ query, variables }),
		});

		if (!response.ok) {
			if (response.status === 401) {
				throw new Error('Invalid Linear API key. Please check your settings.');
			}
			if (response.status === 429) {
				throw new Error('Rate limited by Linear API. Please wait a moment.');
			}
			const text = await response.text();
			throw new Error(`Linear API error: ${response.status} ${text}`);
		}

		const json = await response.json();

		if (json.errors?.length > 0) {
			throw new Error(`Linear GraphQL error: ${json.errors[0].message}`);
		}

		return json.data;
	}

	async fetchAssignedIssues(): Promise<LinearIssue[]> {
		const allIssues: LinearIssue[] = [];
		let hasNextPage = true;
		let cursor: string | null = null;

		while (hasNextPage) {
			const data = await this.query<{
				viewer: {
					assignedIssues: {
						pageInfo: { hasNextPage: boolean; endCursor: string };
						nodes: LinearIssue[];
					};
				};
			}>(ASSIGNED_ISSUES_QUERY, { after: cursor });

			allIssues.push(...data.viewer.assignedIssues.nodes);
			hasNextPage = data.viewer.assignedIssues.pageInfo.hasNextPage;
			cursor = data.viewer.assignedIssues.pageInfo.endCursor;

			// Safety limit to prevent infinite loops
			if (allIssues.length > 1000) {
				logger.warn('Reached 1000 issue limit, stopping pagination');
				break;
			}
		}

		return allIssues;
	}

	async getDoneStateForTeam(teamId: string): Promise<string | null> {
		const data = await this.query<{
			workflowStates: {
				nodes: Array<{ id: string; name: string; type: string }>;
			};
		}>(GET_DONE_STATE_QUERY, { teamId });

		// Return the first "completed" type state (usually "Done")
		const doneState = data.workflowStates.nodes.find(s => s.type === 'completed');
		return doneState?.id || null;
	}

	async updateIssueState(issueId: string, stateId: string): Promise<boolean> {
		const data = await this.query<{
			issueUpdate: { success: boolean };
		}>(UPDATE_ISSUE_STATE_MUTATION, { issueId, stateId });

		return data.issueUpdate.success;
	}
}
