import { tableBody, formatTodo } from './table';
import { createTodo, createSettings, createSummaryMap } from '../__test-utils__/factories';

describe('table formatter', () => {
	describe('formatTodo', () => {
		test('formats TODO as table row with all fields', () => {
			const todo = createTodo({
				msg: 'Buy groceries',
				category: 'personal',
				date: '2024-01-15',
				tags: ['urgent', 'important'],
				parent_title: 'Home',
				note_title: 'Shopping List',
				note: 'note-123',
			});

			const settings = createSettings();
			const result = formatTodo(todo, settings);

			expect(result).toContain('| Buy groceries |');
			expect(result).toContain('| personal |');
			expect(result).toContain('| 2024-01-15 |');
			expect(result).toContain('| urgent important |');
			expect(result).toContain('| Home |');
			expect(result).toContain('[Shopping List](:/note-123)');
		});

		test('includes completed column when show_complete_todo is true', () => {
			const todo = createTodo({
				msg: 'Task',
				completed: true,
			});

			const settings = createSettings({ show_complete_todo: true });
			const result = formatTodo(todo, settings);

			expect(result).toContain('| Y |'); // Completed indicator
		});

		test('includes empty completed column when show_complete_todo is true and not completed', () => {
			const todo = createTodo({
				msg: 'Task',
				completed: false,
			});

			const settings = createSettings({ show_complete_todo: true });
			const result = formatTodo(todo, settings);

			expect(result).toContain('|  |'); // Empty completed column
		});

		test('excludes completed column when show_complete_todo is false', () => {
			const todo = createTodo({
				msg: 'Task',
				completed: true,
			});

			const settings = createSettings({ show_complete_todo: false });
			const result = formatTodo(todo, settings);

			// Should not have a Y indicator when completed column is disabled
			expect(result).not.toContain('| Y |');
		});
	});

	describe('tableBody', () => {
		test('produces valid markdown table structure', async () => {
			const todos = [
				createTodo({ msg: 'Task 1' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await tableBody(summaryMap, settings);

			// Should have header row
			expect(result).toContain('| Task | category | Due | Tags | Notebook | Note |');
			// Should have separator row
			expect(result).toContain('| ---- | -------- | --- | ---- | -------- | ---- |');
			// Should have data row
			expect(result).toContain('| Task 1 |');
		});

		test('includes completed column header when show_complete_todo is true', async () => {
			const todos = [createTodo({ msg: 'Task' })];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings({ show_complete_todo: true });
			const result = await tableBody(summaryMap, settings);

			expect(result).toContain('| Task | category | Due | Tags | Notebook | Note | Completed |');
			expect(result).toContain('| ---- | -------- | --- | ---- | -------- | ---- | --------- |');
		});

		test('sorts by category then notebook by default', async () => {
			const todos = [
				createTodo({ category: 'zebra', parent_title: 'Z Notebook', msg: 'Task Z' }),
				createTodo({ category: 'alpha', parent_title: 'A Notebook', msg: 'Task A' }),
				createTodo({ category: 'beta', parent_title: 'B Notebook', msg: 'Task B' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings({ sort_by: 'notebook' });
			const result = await tableBody(summaryMap, settings);

			// Tasks should appear in alphabetical order by category
			const indexA = result.indexOf('Task A');
			const indexB = result.indexOf('Task B');
			const indexZ = result.indexOf('Task Z');

			expect(indexA).toBeLessThan(indexB);
			expect(indexB).toBeLessThan(indexZ);
		});

		test('sorts by date when sort_by is "date"', async () => {
			const todos = [
				createTodo({ msg: 'Later task', date: '2024-01-20' }),
				createTodo({ msg: 'Earlier task', date: '2024-01-10' }),
				createTodo({ msg: 'Middle task', date: '2024-01-15' }),
				createTodo({ msg: 'No date task', date: '' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings({ sort_by: 'date' });
			const result = await tableBody(summaryMap, settings);

			// Tasks should appear in date order (earliest first)
			const indexEarlier = result.indexOf('Earlier task');
			const indexMiddle = result.indexOf('Middle task');
			const indexLater = result.indexOf('Later task');
			const indexNoDate = result.indexOf('No date task');

			expect(indexEarlier).toBeLessThan(indexMiddle);
			expect(indexMiddle).toBeLessThan(indexLater);
			// Tasks without dates should appear last
			expect(indexLater).toBeLessThan(indexNoDate);
		});

		test('shows completed tasks at bottom when show_complete_todo is true', async () => {
			const todos = [
				createTodo({ msg: 'Open task 1', completed: false }),
				createTodo({ msg: 'Completed task', completed: true }),
				createTodo({ msg: 'Open task 2', completed: false }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings({ show_complete_todo: true });
			const result = await tableBody(summaryMap, settings);

			// Completed task should appear after all open tasks
			const indexOpen1 = result.indexOf('Open task 1');
			const indexOpen2 = result.indexOf('Open task 2');
			const indexCompleted = result.indexOf('Completed task');

			expect(indexOpen1).toBeLessThan(indexCompleted);
			expect(indexOpen2).toBeLessThan(indexCompleted);
			expect(result).toContain('Completed task');
		});

		test('hides completed tasks when show_complete_todo is false', async () => {
			const todos = [
				createTodo({ msg: 'Open task', completed: false }),
				createTodo({ msg: 'Completed task', completed: true }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings({ show_complete_todo: false });
			const result = await tableBody(summaryMap, settings);

			expect(result).toContain('Open task');
			expect(result).not.toContain('Completed task');
		});

		test('handles empty summary map', async () => {
			const summaryMap = {};
			const settings = createSettings();
			const result = await tableBody(summaryMap, settings);

			// Should still have table headers but no data rows
			expect(result).toContain('| Task | category | Due | Tags | Notebook | Note |');
			expect(result).toContain('| ---- | -------- | --- | ---- | -------- | ---- |');
		});

		test('handles multiple tags correctly', async () => {
			const todos = [
				createTodo({ msg: 'Task', tags: ['tag1', 'tag2', 'tag3'] }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await tableBody(summaryMap, settings);

			expect(result).toContain('tag1 tag2 tag3');
		});

		test('handles missing fields gracefully', async () => {
			const todos = [
				createTodo({
					msg: 'Minimal task',
					category: '',
					date: '',
					tags: [],
				}),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await tableBody(summaryMap, settings);

			expect(result).toContain('| Minimal task |');
			// Should have empty columns for missing data
			expect(result).toMatch(/\|\s+\|/); // Empty cells
		});

		test('handles todos from multiple notes', async () => {
			const todo1 = createTodo({ note: 'note-1', msg: 'Task 1' });
			const todo2 = createTodo({ note: 'note-2', msg: 'Task 2' });
			const todo3 = createTodo({ note: 'note-3', msg: 'Task 3' });

			const summaryMap = {
				'note-1': [todo1],
				'note-2': [todo2],
				'note-3': [todo3],
			};

			const settings = createSettings();
			const result = await tableBody(summaryMap, settings);

			expect(result).toContain('Task 1');
			expect(result).toContain('Task 2');
			expect(result).toContain('Task 3');
		});

		test('sorts date strings correctly regardless of format', async () => {
			const todos = [
				createTodo({ msg: 'Dec task', date: '2024-12-01' }),
				createTodo({ msg: 'Jan task', date: '2024-01-01' }),
				createTodo({ msg: 'Jun task', date: '2024-06-15' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings({ sort_by: 'date' });
			const result = await tableBody(summaryMap, settings);

			const indexJan = result.indexOf('Jan task');
			const indexJun = result.indexOf('Jun task');
			const indexDec = result.indexOf('Dec task');

			expect(indexJan).toBeLessThan(indexJun);
			expect(indexJun).toBeLessThan(indexDec);
		});
	});
});
