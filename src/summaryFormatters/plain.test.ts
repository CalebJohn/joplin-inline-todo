import { plainBody, formatTodo } from './plain';
import { createTodo, createSettings, createSummaryMap } from '../__test-utils__/factories';

describe('plain formatter', () => {
	describe('formatTodo', () => {
		test('formats TODO with all fields', () => {
			const todo = createTodo({
				note_title: 'My Note',
				note: 'note-123',
				msg: 'Buy groceries',
				category: 'personal',
				date: '2024-01-15',
				tags: ['urgent', 'important'],
			});

			const settings = createSettings();
			const result = formatTodo(todo, settings);

			expect(result).toContain('[My Note]');
			expect(result).toContain('(:/note-123)');
			expect(result).toContain('2024-01-15');
			expect(result).toContain('Buy groceries');
			expect(result).toContain('@personal');
			expect(result).toContain('+urgent');
			expect(result).toContain('+important');
		});

		test('formats TODO without date', () => {
			const todo = createTodo({
				msg: 'Do something',
				date: '',
			});

			const settings = createSettings();
			const result = formatTodo(todo, settings);

			expect(result).toContain('Do something');
			expect(result).not.toContain('@');
		});
	});

	describe('plainBody', () => {
		test('groups by category then notebook', async () => {
			const todos = [
				createTodo({ category: 'work', parent_title: 'Project A', msg: 'Task 1' }),
				createTodo({ category: 'work', parent_title: 'Project B', msg: 'Task 2' }),
				createTodo({ category: 'personal', parent_title: 'Home', msg: 'Task 3' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await plainBody(summaryMap, settings);

			// Should have category headers
			expect(result).toContain('# WORK');
			expect(result).toContain('# PERSONAL');

			// Should have notebook subheaders
			expect(result).toContain('## Project A');
			expect(result).toContain('## Project B');
			expect(result).toContain('## Home');
		});

		test('handles unassigned category (empty string)', async () => {
			const todos = [
				createTodo({ category: '', parent_title: 'Notes', msg: 'Unassigned task' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await plainBody(summaryMap, settings);

			// Should have notebook header even without category
			expect(result).toContain('## Notes');
			expect(result).toContain('Unassigned task');
		});

		test('creates DUE section for todos with dates', async () => {
			const todos = [
				createTodo({ msg: 'Due task 1', date: '2024-01-15', category: 'work' }),
				createTodo({ msg: 'Due task 2', date: '2024-01-10', category: 'personal' }),
				createTodo({ msg: 'Not due', date: '', category: 'work' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await plainBody(summaryMap, settings);

			// Should have DUE section at the top
			expect(result).toMatch(/# DUE[\s\S]*# WORK/);
			expect(result).toContain('Due task 1');
			expect(result).toContain('Due task 2');
		});

		test('sorts due tasks by date', async () => {
			const todos = [
				createTodo({ msg: 'Later task', date: '2024-01-20', category: 'work' }),
				createTodo({ msg: 'Earlier task', date: '2024-01-10', category: 'work' }),
				createTodo({ msg: 'Middle task', date: '2024-01-15', category: 'work' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await plainBody(summaryMap, settings);

			// Earlier task should appear before later task
			const earlierIndex = result.indexOf('Earlier task');
			const middleIndex = result.indexOf('Middle task');
			const laterIndex = result.indexOf('Later task');

			expect(earlierIndex).toBeLessThan(middleIndex);
			expect(middleIndex).toBeLessThan(laterIndex);
		});

		test('shows completed section when show_complete_todo is true', async () => {
			const todos = [
				createTodo({ msg: 'Open task', completed: false }),
				createTodo({ msg: 'Completed task', completed: true }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings({ show_complete_todo: true });
			const result = await plainBody(summaryMap, settings);

			expect(result).toContain('# COMPLETED');
			expect(result).toContain('Completed task');
		});

		test('hides completed section when show_complete_todo is false', async () => {
			const todos = [
				createTodo({ msg: 'Open task', completed: false }),
				createTodo({ msg: 'Completed task', completed: true }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings({ show_complete_todo: false });
			const result = await plainBody(summaryMap, settings);

			expect(result).not.toContain('# COMPLETED');
			expect(result).not.toContain('Completed task');
		});

		test('shows "All done!" when no todos', async () => {
			const summaryMap = {};
			const settings = createSettings();
			const result = await plainBody(summaryMap, settings);

			expect(result).toContain('# All done!');
		});

		test('sorts categories alphabetically', async () => {
			const todos = [
				createTodo({ category: 'zebra', parent_title: 'Notes', msg: 'Task Z' }),
				createTodo({ category: 'apple', parent_title: 'Notes', msg: 'Task A' }),
				createTodo({ category: 'middle', parent_title: 'Notes', msg: 'Task M' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await plainBody(summaryMap, settings);

			// Categories should appear in alphabetical order
			const appleIndex = result.indexOf('# APPLE');
			const middleIndex = result.indexOf('# MIDDLE');
			const zebraIndex = result.indexOf('# ZEBRA');

			expect(appleIndex).toBeLessThan(middleIndex);
			expect(middleIndex).toBeLessThan(zebraIndex);
		});

		test('sorts notebooks alphabetically within each category', async () => {
			const todos = [
				createTodo({ category: 'work', parent_title: 'Zebra Project', msg: 'Task 1' }),
				createTodo({ category: 'work', parent_title: 'Alpha Project', msg: 'Task 2' }),
				createTodo({ category: 'work', parent_title: 'Beta Project', msg: 'Task 3' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await plainBody(summaryMap, settings);

			// Notebooks should appear in alphabetical order
			const alphaIndex = result.indexOf('## Alpha Project');
			const betaIndex = result.indexOf('## Beta Project');
			const zebraIndex = result.indexOf('## Zebra Project');

			expect(alphaIndex).toBeLessThan(betaIndex);
			expect(betaIndex).toBeLessThan(zebraIndex);
		});

		test('handles multiple todos in same category and notebook', async () => {
			const todos = [
				createTodo({ category: 'work', parent_title: 'Project', msg: 'Task 1', note: 'note-1' }),
				createTodo({ category: 'work', parent_title: 'Project', msg: 'Task 2', note: 'note-1' }),
				createTodo({ category: 'work', parent_title: 'Project', msg: 'Task 3', note: 'note-1' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await plainBody(summaryMap, settings);

			expect(result).toContain('Task 1');
			expect(result).toContain('Task 2');
			expect(result).toContain('Task 3');

			// Should only have one category and notebook header
			const workMatches = result.match(/# WORK/g);
			const projectMatches = result.match(/## Project/g);
			expect(workMatches?.length).toBe(1);
			expect(projectMatches?.length).toBe(1);
		});

		test('handles todos from different notes in same notebook', async () => {
			const todo1 = createTodo({
				note: 'note-1',
				note_title: 'Note 1',
				parent_title: 'Project',
				msg: 'Task from note 1'
			});
			const todo2 = createTodo({
				note: 'note-2',
				note_title: 'Note 2',
				parent_title: 'Project',
				msg: 'Task from note 2'
			});

			const summaryMap = {
				'note-1': [todo1],
				'note-2': [todo2],
			};

			const settings = createSettings();
			const result = await plainBody(summaryMap, settings);

			expect(result).toContain('Task from note 1');
			expect(result).toContain('Task from note 2');
			expect(result).toContain('[Note 1]');
			expect(result).toContain('[Note 2]');
		});

		test('handles empty category with proper capitalization', async () => {
			const todos = [
				createTodo({ category: '', parent_title: 'Notes', msg: 'Task' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await plainBody(summaryMap, settings);

			// Empty category shouldn't create a category header
			expect(result).not.toContain('# \n');
			expect(result).toContain('## Notes');
		});
	});
});
