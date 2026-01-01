import { Note, Settings, Todo, Filter, Summary, SummaryMap } from '../types';
import { regexes } from '../settings_tables';

/**
 * Factory function to create a mock Note object
 */
export const createNote = (overrides?: Partial<Note>): Note => ({
	id: 'note-1',
	title: 'Test Note',
	body: '- [ ] Test task @work',
	parent_id: 'folder-1',
	is_conflict: false,
	...overrides
});

/**
 * Factory function to create a mock Settings object
 */
export const createSettings = (overrides?: Partial<Settings>): Settings => ({
	summary_id: undefined,
	todo_type: regexes.list,
	summary_type: 'plain',
	sort_by: 'notebook',
	scan_period_c: 10,
	scan_period_s: 1,
	show_complete_todo: false,
	force_sync: true,
	auto_refresh_summary: true,
	custom_editor: false,
	...overrides
});

/**
 * Factory function to create a mock Todo object
 */
export const createTodo = (overrides?: Partial<Todo>): Todo => ({
	note: 'note-id',
	note_title: 'Note Title',
	parent_id: 'parent-id',
	parent_title: 'Parent Title',
	msg: 'Test task',
	category: 'work',
	date: '',
	tags: [],
	completed: false,
	description: '',
	scrollTo: { text: 'test', element: 'ul' },
	key: 'test-key',
	...overrides
});

/**
 * Factory function to create a mock Filter object
 */
export const createFilter = (overrides?: Partial<Filter>): Filter => ({
	filterName: 'Test Filter',
	note: [],
	parent_id: [],
	msg: [],
	category: [],
	date: 'All',
	dateOverride: 'None',
	tags: [],
	completed: 'None',
	...overrides
});

/**
 * Factory function to create a mock Summary object
 */
export const createSummary = (overrides?: Partial<Summary>): Summary => ({
	meta: {
		lastRefresh: new Date()
	},
	map: {},
	...overrides
});

/**
 * Factory function to create a SummaryMap with predefined todos
 */
export const createSummaryMap = (todos: Todo[]): SummaryMap => {
	const map: SummaryMap = {};
	for (const todo of todos) {
		if (!map[todo.note]) {
			map[todo.note] = [];
		}
		map[todo.note].push(todo);
	}
	return map;
};
