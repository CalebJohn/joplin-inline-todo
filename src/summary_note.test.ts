import { filterSummaryCategories, insertNewSummary, isSummary } from './summary_note';
import { createSummary, createSummaryMap, createTodo, createNote } from './__test-utils__/factories';

describe('summary_note', () => {
	describe('isSummary', () => {
		test('identifies note with inline-todo-plugin comment', () => {
			const note = createNote({
				body: '# My Summary\n\n<!-- inline-todo-plugin -->\n\nSome content'
			});

			expect(isSummary(note)).toBe(true);
		});

		test('identifies note with inline-todo-plugin comment and filter', () => {
			const note = createNote({
				body: '# My Summary\n\n<!-- inline-todo-plugin "Work" "Personal" -->\n\nSome content'
			});

			expect(isSummary(note)).toBe(true);
		});

		test('returns false for note without comment', () => {
			const note = createNote({
				body: 'Just a regular note with no special comment'
			});

			expect(isSummary(note)).toBe(false);
		});

		test('returns false for null note', () => {
			expect(isSummary(null as any)).toBe(false);
		});

		test('returns false for undefined note', () => {
			expect(isSummary(undefined as any)).toBe(false);
		});
	});

	describe('insertNewSummary', () => {
		test('inserts new summary content before comment', () => {
			const oldBody = 'old content\n<!-- inline-todo-plugin -->\nafter comment';
			const summaryBody = '# New Summary\n\nNew content\n';

			const result = insertNewSummary(oldBody, summaryBody);

			expect(result).toContain('# New Summary');
			expect(result).toContain('<!-- inline-todo-plugin -->');
			expect(result).toContain('after comment');
			expect(result).not.toContain('old content');
		});

		test('preserves notebook filter in comment', () => {
			const oldBody = 'old content\n<!-- inline-todo-plugin "Work" "Personal" -->\nafter';
			const summaryBody = 'new content\n';

			const result = insertNewSummary(oldBody, summaryBody);

			expect(result).toContain('<!-- inline-todo-plugin "Work" "Personal" -->');
		});

		test('preserves content after comment', () => {
			const oldBody = 'summary\n<!-- inline-todo-plugin -->\n\n# Notes\n\nSome personal notes here';
			const summaryBody = 'new summary\n';

			const result = insertNewSummary(oldBody, summaryBody);

			expect(result).toContain('# Notes');
			expect(result).toContain('Some personal notes here');
		});

		test('handles empty summary body', () => {
			const oldBody = 'old\n<!-- inline-todo-plugin -->\nafter';
			const summaryBody = '';

			const result = insertNewSummary(oldBody, summaryBody);

			expect(result).toContain('<!-- inline-todo-plugin -->');
			expect(result).toContain('after');
		});
	});

	describe('filterSummaryCategories', () => {
		test('returns all todos when no filter specified', () => {
			const todos = [
				createTodo({ parent_title: 'Work', msg: 'Work task' }),
				createTodo({ parent_title: 'Personal', msg: 'Personal task' }),
			];

			const summaryMap = createSummaryMap(todos);
			const summary = createSummary({ map: summaryMap });
			const body = '<!-- inline-todo-plugin -->';

			const result = filterSummaryCategories(body, summary);

			expect(Object.keys(result).length).toBe(1);
			expect(result[todos[0].note].length).toBe(2);
		});

		test('filters todos to specified single notebook', () => {
			const workTodo = createTodo({ note: 'note-1', parent_title: 'Work', msg: 'Work task' });
			const personalTodo = createTodo({ note: 'note-2', parent_title: 'Personal', msg: 'Personal task' });

			const summaryMap = {
				'note-1': [workTodo],
				'note-2': [personalTodo],
			};

			const summary = createSummary({ map: summaryMap });
			const body = '<!-- inline-todo-plugin "Work" -->';

			const result = filterSummaryCategories(body, summary);

			expect(result['note-1']).toHaveLength(1);
			expect(result['note-1'][0].msg).toBe('Work task');
			expect(result['note-2']).toBeUndefined();
		});

		test('filters todos to multiple specified notebooks', () => {
			const workTodo = createTodo({ note: 'note-1', parent_title: 'Work', msg: 'Work task' });
			const personalTodo = createTodo({ note: 'note-2', parent_title: 'Personal', msg: 'Personal task' });
			const hobbyTodo = createTodo({ note: 'note-3', parent_title: 'Hobby', msg: 'Hobby task' });

			const summaryMap = {
				'note-1': [workTodo],
				'note-2': [personalTodo],
				'note-3': [hobbyTodo],
			};

			const summary = createSummary({ map: summaryMap });
			const body = '<!-- inline-todo-plugin "Work" "Personal" -->';

			const result = filterSummaryCategories(body, summary);

			expect(result['note-1']).toHaveLength(1);
			expect(result['note-2']).toHaveLength(1);
			expect(result['note-3']).toBeUndefined();
		});

		test('handles notebook names with spaces', () => {
			const todo1 = createTodo({ note: 'note-1', parent_title: 'My Work Projects', msg: 'Task 1' });
			const todo2 = createTodo({ note: 'note-2', parent_title: 'Personal Life', msg: 'Task 2' });

			const summaryMap = {
				'note-1': [todo1],
				'note-2': [todo2],
			};

			const summary = createSummary({ map: summaryMap });
			const body = '<!-- inline-todo-plugin "My Work Projects" -->';

			const result = filterSummaryCategories(body, summary);

			expect(result['note-1']).toHaveLength(1);
			expect(result['note-1'][0].msg).toBe('Task 1');
			expect(result['note-2']).toBeUndefined();
		});

		test('handles multiple notebook names with spaces', () => {
			const todo1 = createTodo({ note: 'note-1', parent_title: 'Work Projects', msg: 'Task 1' });
			const todo2 = createTodo({ note: 'note-2', parent_title: 'Personal Life', msg: 'Task 2' });
			const todo3 = createTodo({ note: 'note-3', parent_title: 'Hobby', msg: 'Task 3' });

			const summaryMap = {
				'note-1': [todo1],
				'note-2': [todo2],
				'note-3': [todo3],
			};

			const summary = createSummary({ map: summaryMap });
			const body = '<!-- inline-todo-plugin "Work Projects" "Personal Life" -->';

			const result = filterSummaryCategories(body, summary);

			expect(result['note-1']).toHaveLength(1);
			expect(result['note-2']).toHaveLength(1);
			expect(result['note-3']).toBeUndefined();
		});

		test('handles non-existent notebook names gracefully', () => {
			const todos = [
				createTodo({ note: 'note-1', parent_title: 'Work', msg: 'Work task' }),
			];

			const summaryMap = createSummaryMap(todos);
			const summary = createSummary({ map: summaryMap });
			const body = '<!-- inline-todo-plugin "NonExistent" -->';

			const result = filterSummaryCategories(body, summary);

			expect(Object.keys(result).length).toBe(0);
		});

		test('filters multiple todos from same note', () => {
			const todos = [
				createTodo({ note: 'note-1', parent_title: 'Work', msg: 'Task 1' }),
				createTodo({ note: 'note-1', parent_title: 'Work', msg: 'Task 2' }),
				createTodo({ note: 'note-1', parent_title: 'Personal', msg: 'Task 3' }),
			];

			const summaryMap = { 'note-1': todos };
			const summary = createSummary({ map: summaryMap });
			const body = '<!-- inline-todo-plugin "Work" -->';

			const result = filterSummaryCategories(body, summary);

			expect(result['note-1']).toHaveLength(2);
			expect(result['note-1'][0].msg).toBe('Task 1');
			expect(result['note-1'][1].msg).toBe('Task 2');
		});

		test('handles empty summary map', () => {
			const summaryMap = {};
			const summary = createSummary({ map: summaryMap });
			const body = '<!-- inline-todo-plugin "Work" -->';

			const result = filterSummaryCategories(body, summary);

			expect(Object.keys(result).length).toBe(0);
		});

		test('handles malformed comment without filter', () => {
			const todos = [createTodo({ msg: 'Task' })];
			const summaryMap = createSummaryMap(todos);
			const summary = createSummary({ map: summaryMap });
			const body = '<!-- inline-todo-plugin-->';

			const result = filterSummaryCategories(body, summary);

			// Should return all todos when no filter is specified
			expect(Object.keys(result).length).toBeGreaterThan(0);
		});

		test('handles whitespace in comment', () => {
			const todos = [
				createTodo({ note: 'note-1', parent_title: 'Work', msg: 'Work task' }),
			];

			const summaryMap = createSummaryMap(todos);
			const summary = createSummary({ map: summaryMap });
			const body = '<!-- inline-todo-plugin   "Work"   -->';

			const result = filterSummaryCategories(body, summary);

			expect(result['note-1']).toHaveLength(1);
		});

		test('handles single-quoted notebook names', () => {
			// The parser uses double quotes, but let's test edge cases
			const todos = [
				createTodo({ note: 'note-1', parent_title: 'Work', msg: 'Work task' }),
			];

			const summaryMap = createSummaryMap(todos);
			const summary = createSummary({ map: summaryMap });
			const body = '<!-- inline-todo-plugin Work -->';

			const result = filterSummaryCategories(body, summary);

			expect(result['note-1']).toHaveLength(1);
		});

		test('preserves todo order when filtering', () => {
			const todos = [
				createTodo({ note: 'note-1', parent_title: 'Work', msg: 'Task 1' }),
				createTodo({ note: 'note-1', parent_title: 'Work', msg: 'Task 2' }),
				createTodo({ note: 'note-1', parent_title: 'Work', msg: 'Task 3' }),
			];

			const summaryMap = { 'note-1': todos };
			const summary = createSummary({ map: summaryMap });
			const body = '<!-- inline-todo-plugin "Work" -->';

			const result = filterSummaryCategories(body, summary);

			expect(result['note-1'][0].msg).toBe('Task 1');
			expect(result['note-1'][1].msg).toBe('Task 2');
			expect(result['note-1'][2].msg).toBe('Task 3');
		});
	});
});
