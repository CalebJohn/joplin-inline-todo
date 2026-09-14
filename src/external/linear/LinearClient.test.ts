import { LinearClient, LinearIssue } from './LinearClient';
import { ExternalSourceError } from '../types';

jest.mock('@joplin/utils/Logger', () => ({
	__esModule: true,
	default: {
		create: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
	},
}));

// Minimal stand-in for a fetch Response so the tests do not depend on the runtime's Response class
function mockResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
	const lower: Record<string, string> = {};
	for (const [k, v] of Object.entries(headers)) {
		lower[k.toLowerCase()] = v;
	}
	return {
		ok: status >= 200 && status < 300,
		status,
		headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
		json: async () => body,
		text: async () => JSON.stringify(body),
	};
}

const makeIssue = (id: string): LinearIssue => ({
	id,
	identifier: `ENG-${id}`,
	title: `Issue ${id}`,
	url: `https://linear.app/team/issue/ENG-${id}`,
	priority: 0,
	state: { id: 'state-1', name: 'Todo', type: 'unstarted' },
	team: { id: 'team-1', name: 'Engineering' },
	labels: { nodes: [] },
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z',
});

const issuesPage = (issues: LinearIssue[], hasNextPage: boolean, endCursor: string | null) => ({
	data: {
		viewer: {
			id: 'me',
			name: 'Me',
			assignedIssues: {
				pageInfo: { hasNextPage, endCursor },
				nodes: issues,
			},
		},
	},
});

// Parses the JSON body of the nth fetch call
const requestBody = (fetchMock: jest.Mock, n: number) => JSON.parse(fetchMock.mock.calls[n][1].body);

describe('LinearClient', () => {
	let fetchMock: jest.Mock;
	let client: LinearClient;

	beforeEach(() => {
		fetchMock = jest.fn();
		(global as any).fetch = fetchMock;
		client = new LinearClient('lin_api_test');
	});

	afterEach(() => {
		delete (global as any).fetch;
	});

	test('sends the API key and query to the Linear endpoint', async () => {
		fetchMock.mockResolvedValueOnce(mockResponse(issuesPage([], false, null)));

		await client.fetchAssignedIssues();

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://api.linear.app/graphql');
		expect(init.method).toBe('POST');
		expect(init.headers.Authorization).toBe('lin_api_test');
		expect(requestBody(fetchMock, 0).variables).toEqual({ after: null });
	});

	test('getDoneStateForTeam declares $teamId as ID! and returns the completed state', async () => {
		fetchMock.mockResolvedValueOnce(mockResponse({
			data: {
				workflowStates: {
					nodes: [
						{ id: 'state-done', name: 'Done', type: 'completed' },
					],
				},
			},
		}));

		const stateId = await client.getDoneStateForTeam('team-1');

		expect(stateId).toBe('state-done');
		const body = requestBody(fetchMock, 0);
		expect(body.query).toContain('$teamId: ID!');
		expect(body.query).not.toContain('$teamId: String!');
		expect(body.variables).toEqual({ teamId: 'team-1' });
	});

	test('getDoneStateForTeam returns null when no completed state exists', async () => {
		fetchMock.mockResolvedValueOnce(mockResponse({ data: { workflowStates: { nodes: [] } } }));
		expect(await client.getDoneStateForTeam('team-1')).toBeNull();
	});

	test('401 throws an auth error', async () => {
		fetchMock.mockResolvedValueOnce(mockResponse({}, 401));

		const promise = client.fetchAssignedIssues();
		await expect(promise).rejects.toBeInstanceOf(ExternalSourceError);
		await expect(promise).rejects.toMatchObject({
			kind: 'auth',
			message: 'Invalid Linear API key. Please check your settings.',
		});
	});

	test('429 throws a rate_limit error with retryAfterMs from the Retry-After header', async () => {
		fetchMock.mockResolvedValueOnce(mockResponse({}, 429, { 'Retry-After': '7' }));

		await expect(client.fetchAssignedIssues()).rejects.toMatchObject({
			kind: 'rate_limit',
			retryAfterMs: 7000,
			message: 'Rate limited by Linear API. Please wait a moment.',
		});
	});

	test('429 without Retry-After leaves retryAfterMs undefined', async () => {
		fetchMock.mockResolvedValueOnce(mockResponse({}, 429));

		await expect(client.fetchAssignedIssues()).rejects.toMatchObject({
			kind: 'rate_limit',
			retryAfterMs: undefined,
		});
	});

	test('other HTTP statuses throw an other error with the status and body', async () => {
		fetchMock.mockResolvedValueOnce(mockResponse({ oops: true }, 500));

		await expect(client.fetchAssignedIssues()).rejects.toMatchObject({
			kind: 'other',
			message: 'Linear API error: 500 {"oops":true}',
		});
	});

	test('a fetch failure throws a network error', async () => {
		fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

		await expect(client.fetchAssignedIssues()).rejects.toMatchObject({
			kind: 'network',
			message: 'Could not reach the Linear API: Failed to fetch',
		});
	});

	test('a GraphQL errors array throws an other error', async () => {
		fetchMock.mockResolvedValueOnce(mockResponse({
			errors: [{ message: 'Variable "$teamId" of type "String!" used in position expecting type "ID".' }],
		}));

		await expect(client.getDoneStateForTeam('team-1')).rejects.toMatchObject({
			kind: 'other',
			message: 'Linear GraphQL error: Variable "$teamId" of type "String!" used in position expecting type "ID".',
		});
	});

	test('pagination follows endCursor and stops when hasNextPage is false', async () => {
		fetchMock
			.mockResolvedValueOnce(mockResponse(issuesPage([makeIssue('1'), makeIssue('2')], true, 'cursor-1')))
			.mockResolvedValueOnce(mockResponse(issuesPage([makeIssue('3')], true, 'cursor-2')))
			.mockResolvedValueOnce(mockResponse(issuesPage([makeIssue('4')], false, 'cursor-3')));

		const issues = await client.fetchAssignedIssues();

		expect(issues.map(i => i.id)).toEqual(['1', '2', '3', '4']);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(requestBody(fetchMock, 0).variables).toEqual({ after: null });
		expect(requestBody(fetchMock, 1).variables).toEqual({ after: 'cursor-1' });
		expect(requestBody(fetchMock, 2).variables).toEqual({ after: 'cursor-2' });
	});

	test('updateIssueState returns the mutation success flag', async () => {
		fetchMock.mockResolvedValueOnce(mockResponse({ data: { issueUpdate: { success: true } } }));

		expect(await client.updateIssueState('issue-1', 'state-done')).toBe(true);
		expect(requestBody(fetchMock, 0).variables).toEqual({ issueId: 'issue-1', stateId: 'state-done' });
	});
});
