import { Note } from '../types';

/**
 * Creates a mock Joplin API object
 */
export const mockJoplinAPI = () => ({
	data: {
		get: jest.fn(),
		put: jest.fn(),
		post: jest.fn(),
		delete: jest.fn(),
		userDataGet: jest.fn(),
		userDataSet: jest.fn(),
	},
	settings: {
		value: jest.fn(),
		globalValue: jest.fn(),
	},
	workspace: {
		selectedNote: jest.fn(),
	},
	commands: {
		execute: jest.fn(),
	},
});

/**
 * Creates a mock Note object with minimal required fields
 */
export const createMockNote = (
	id: string,
	body: string,
	title = 'Test Note',
	parent_id = 'folder-1'
): Note => ({
	id,
	title,
	body,
	parent_id,
	is_conflict: false,
});

/**
 * Creates a mock search response from Joplin API
 */
export const createMockSearchResponse = (notes: Note[], hasMore = false) => ({
	items: notes,
	has_more: hasMore,
});

/**
 * Creates a mock folder object
 */
export const createMockFolder = (id: string, title: string) => ({
	id,
	title,
	parent_id: '',
});

/**
 * Mock for Date.now() that returns a fixed timestamp
 */
export const mockDateNow = (timestamp: number) => {
	const spy = jest.spyOn(Date, 'now');
	spy.mockReturnValue(timestamp);
	return spy;
};

/**
 * Mock for setTimeout to enable testing rate limiting
 */
export const mockSetTimeout = () => {
	jest.useFakeTimers();
	return {
		advanceTimersByTime: (ms: number) => jest.advanceTimersByTime(ms),
		runAllTimers: () => jest.runAllTimers(),
		restore: () => jest.useRealTimers(),
	};
};
