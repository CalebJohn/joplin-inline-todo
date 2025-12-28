import { diaryBody, formatTodo } from './diary';
import { createTodo, createSettings, createSummaryMap } from '../__test-utils__/factories';

describe('diary formatter', () => {
	describe('formatTodo', () => {
		test('formats TODO with date using message as link', () => {
			const todo = createTodo({
				note_title: 'My Note',
				note: 'note-123',
				msg: 'Buy groceries',
				date: '2024-01-15',
				tags: ['urgent'],
			});

			const settings = createSettings();
			const result = formatTodo(todo, settings);

			// When message doesn't contain links, it uses the message as link text
			expect(result).toContain('[Buy groceries]');
			expect(result).not.toContain('[My Note]');
			expect(result).toContain('(:/note-123)');
			expect(result).toContain('2024-01-15');
			expect(result).toContain('+urgent');
		});

		test('formats TODO without date using message as link text', () => {
			const todo = createTodo({
				note_title: 'My Note',
				note: 'note-123',
				msg: 'Do something',
				date: '',
			});

			const settings = createSettings();
			const result = formatTodo(todo, settings);

			expect(result).toContain('[Do something]');
			expect(result).toContain('(:/note-123)');
		});

		test('uses note title when message contains links (with date)', () => {
			const todo = createTodo({
				note_title: 'My Note',
				note: 'note-123',
				msg: 'Check [this link](url) for details',
				date: '2024-01-15',
			});

			const settings = createSettings();
			const result = formatTodo(todo, settings);

			// Should use note title instead of message to avoid nested links
			expect(result).toContain('[My Note]');
			expect(result).toContain('Check [this link](url) for details');
		});

		test('uses note title when message contains links (without date)', () => {
			const todo = createTodo({
				note_title: 'My Note',
				note: 'note-123',
				msg: 'Review [documentation](url)',
				date: '',
			});

			const settings = createSettings();
			const result = formatTodo(todo, settings);

			// Should use note title instead of message to avoid nested links
			expect(result).toContain('[My Note]');
			expect(result).toContain('Review [documentation](url)');
		});

		test('formats multiple tags correctly', () => {
			const todo = createTodo({
				msg: 'Task',
				tags: ['urgent', 'important', 'review'],
			});

			const settings = createSettings();
			const result = formatTodo(todo, settings);

			expect(result).toContain('+urgent');
			expect(result).toContain('+important');
			expect(result).toContain('+review');
		});
	});

	describe('diaryBody', () => {
		test('groups by category without notebook subheaders', async () => {
			const todos = [
				createTodo({ category: 'work', parent_title: 'Project A', msg: 'Task 1' }),
				createTodo({ category: 'work', parent_title: 'Project B', msg: 'Task 2' }),
				createTodo({ category: 'personal', parent_title: 'Home', msg: 'Task 3' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await diaryBody(summaryMap, settings);

			// Should have category headers
			expect(result).toContain('# WORK');
			expect(result).toContain('# PERSONAL');

			// Should NOT have notebook subheaders (diary format doesn't show them)
			expect(result).not.toContain('## Project A');
			expect(result).not.toContain('## Project B');
			expect(result).not.toContain('## Home');
		});

		test('creates DUE section for todos with dates', async () => {
			const todos = [
				createTodo({ msg: 'Due task 1', date: '2024-01-15', category: 'work' }),
				createTodo({ msg: 'Due task 2', date: '2024-01-10', category: 'personal' }),
				createTodo({ msg: 'Not due', date: '', category: 'work' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await diaryBody(summaryMap, settings);

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
			const result = await diaryBody(summaryMap, settings);

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
			const result = await diaryBody(summaryMap, settings);

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
			const result = await diaryBody(summaryMap, settings);

			expect(result).not.toContain('# COMPLETED');
			expect(result).not.toContain('Completed task');
		});

		test('shows "All done!" when no todos', async () => {
			const summaryMap = {};
			const settings = createSettings();
			const result = await diaryBody(summaryMap, settings);

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
			const result = await diaryBody(summaryMap, settings);

			// Categories should appear in alphabetical order
			const appleIndex = result.indexOf('# APPLE');
			const middleIndex = result.indexOf('# MIDDLE');
			const zebraIndex = result.indexOf('# ZEBRA');

			expect(appleIndex).toBeLessThan(middleIndex);
			expect(middleIndex).toBeLessThan(zebraIndex);
		});

		test('handles multiple todos in same category from different notebooks', async () => {
			const todos = [
				createTodo({ category: 'work', parent_title: 'Project A', msg: 'Task 1' }),
				createTodo({ category: 'work', parent_title: 'Project B', msg: 'Task 2' }),
				createTodo({ category: 'work', parent_title: 'Project A', msg: 'Task 3' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await diaryBody(summaryMap, settings);

			expect(result).toContain('Task 1');
			expect(result).toContain('Task 2');
			expect(result).toContain('Task 3');

			// Should only have one category header
			const workMatches = result.match(/# WORK/g);
			expect(workMatches?.length).toBe(1);

			// Should NOT have notebook headers
			expect(result).not.toContain('## Project A');
			expect(result).not.toContain('## Project B');
		});

		test('handles empty category correctly', async () => {
			const todos = [
				createTodo({ category: '', parent_title: 'Notes', msg: 'Unassigned task' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await diaryBody(summaryMap, settings);

			expect(result).toContain('Unassigned task');
			// Empty category shouldn't create a category header with just #
			expect(result).not.toContain('# \n');
		});

		test('handles todos from multiple notes', async () => {
			const todo1 = createTodo({
				note: 'note-1',
				note_title: 'Note 1',
				msg: 'Task from note 1'
			});
			const todo2 = createTodo({
				note: 'note-2',
				note_title: 'Note 2',
				msg: 'Task from note 2'
			});

			const summaryMap = {
				'note-1': [todo1],
				'note-2': [todo2],
			};

			const settings = createSettings();
			const result = await diaryBody(summaryMap, settings);

			expect(result).toContain('[Task from note 1]');
			expect(result).toContain('[Task from note 2]');
		});

		test('sorts tasks within category alphabetically', async () => {
			const todos = [
				createTodo({ category: 'work', msg: 'Zebra task', note_title: 'Z Note' }),
				createTodo({ category: 'work', msg: 'Alpha task', note_title: 'A Note' }),
				createTodo({ category: 'work', msg: 'Beta task', note_title: 'B Note' }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings();
			const result = await diaryBody(summaryMap, settings);

			// After the WORK header, tasks should be sorted
			const workIndex = result.indexOf('# WORK');
			const alphaIndex = result.indexOf('Alpha task');
			const betaIndex = result.indexOf('Beta task');
			const zebraIndex = result.indexOf('Zebra task');

			expect(workIndex).toBeLessThan(alphaIndex);
			expect(alphaIndex).toBeLessThan(betaIndex);
			expect(betaIndex).toBeLessThan(zebraIndex);
		});

		test('handles mixed content with dates, categories, and completed', async () => {
			const todos = [
				createTodo({ msg: 'Due soon', date: '2024-01-15', category: 'work' }),
				createTodo({ msg: 'Work task', date: '', category: 'work' }),
				createTodo({ msg: 'Personal task', date: '', category: 'personal' }),
				createTodo({ msg: 'Done task', date: '', category: 'work', completed: true }),
			];

			const summaryMap = createSummaryMap(todos);
			const settings = createSettings({ show_complete_todo: true });
			const result = await diaryBody(summaryMap, settings);

			// Should have all sections in correct order
			expect(result).toMatch(/# DUE[\s\S]*# PERSONAL[\s\S]*# WORK[\s\S]*# COMPLETED/);
		});
	});
});
