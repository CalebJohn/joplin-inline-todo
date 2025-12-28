import { update_summary } from './summary';
import { createSettings, createSummary, createSummaryMap, createTodo } from './__test-utils__/factories';
import { mockJoplinAPI } from './__test-utils__/mocks';

// Mock the Joplin API
jest.mock('api');

describe('summary', () => {
	let joplinAPI: ReturnType<typeof mockJoplinAPI>;

	beforeEach(() => {
		jest.clearAllMocks();
		joplinAPI = require('api').default;
	});

	describe('update_summary', () => {
		test('updates summary note with formatted todos', async () => {
			const todos = [
				createTodo({ category: 'work', msg: 'Task 1' }),
			];

			const summaryMap = createSummaryMap(todos);
			const summary = createSummary({ map: summaryMap });
			const settings = createSettings({ summary_type: 'plain' });

			joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'other-note' });
			joplinAPI.data.put.mockResolvedValue({});

			await update_summary(summary, settings, 'summary-id', '<!-- inline-todo-plugin -->');

			expect(joplinAPI.data.put).toHaveBeenCalledWith(
				['notes', 'summary-id'],
				null,
				expect.objectContaining({
					body: expect.stringContaining('Task 1')
				})
			);
		});

		test('uses editor.setText when summary note is currently selected', async () => {
			const todos = [createTodo({ msg: 'Task' })];
			const summaryMap = createSummaryMap(todos);
			const summary = createSummary({ map: summaryMap });
			const settings = createSettings();

			joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'summary-id' });
			joplinAPI.commands.execute.mockResolvedValue({});
			joplinAPI.data.put.mockResolvedValue({});

			await update_summary(summary, settings, 'summary-id', '<!-- inline-todo-plugin -->');

			expect(joplinAPI.commands.execute).toHaveBeenCalledWith(
				'editor.setText',
				expect.any(String)
			);
		});

		describe('error handling', () => {
			let consoleErrorSpy: jest.SpyInstance;
			let consoleWarnSpy: jest.SpyInstance;

			beforeEach(() => {
				consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
				consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
			});

			afterEach(() => {
				consoleErrorSpy.mockRestore();
				consoleWarnSpy.mockRestore();
			});

			test('falls back to API when editor.setText fails', async () => {
				const todos = [createTodo({ msg: 'Task' })];
				const summaryMap = createSummaryMap(todos);
				const summary = createSummary({ map: summaryMap });
				const settings = createSettings({ force_sync: false }); // Disable sync to avoid error on synchronize call

				joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'summary-id' });
				joplinAPI.commands.execute.mockRejectedValue(new Error('setText failed'));
				joplinAPI.data.put.mockResolvedValue({});

				await update_summary(summary, settings, 'summary-id', '<!-- inline-todo-plugin -->');

				// Should still call the API even if editor.setText fails
				expect(joplinAPI.data.put).toHaveBeenCalled();
			});

			test('handles API errors gracefully', async () => {
				const todos = [createTodo({ msg: 'Task' })];
				const summaryMap = createSummaryMap(todos);
				const summary = createSummary({ map: summaryMap });
				const settings = createSettings({ force_sync: false }); // Disable sync to avoid synchronize call

				joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'other-note' });
				joplinAPI.data.put.mockRejectedValue(new Error('API error'));

				// Should not throw
				await expect(
					update_summary(summary, settings, 'summary-id', '<!-- inline-todo-plugin -->')
				).resolves.not.toThrow();
			});
		});

		test('triggers sync when force_sync is enabled', async () => {
			const todos = [createTodo({ msg: 'Task' })];
			const summaryMap = createSummaryMap(todos);
			const summary = createSummary({ map: summaryMap });
			const settings = createSettings({ force_sync: true });

			joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'other-note' });
			joplinAPI.data.put.mockResolvedValue({});
			joplinAPI.commands.execute.mockResolvedValue({});

			await update_summary(summary, settings, 'summary-id', '<!-- inline-todo-plugin -->');

			expect(joplinAPI.commands.execute).toHaveBeenCalledWith('synchronize');
		});

		test('does not trigger sync when force_sync is disabled', async () => {
			const todos = [createTodo({ msg: 'Task' })];
			const summaryMap = createSummaryMap(todos);
			const summary = createSummary({ map: summaryMap });
			const settings = createSettings({ force_sync: false });

			joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'other-note' });
			joplinAPI.data.put.mockResolvedValue({});

			await update_summary(summary, settings, 'summary-id', '<!-- inline-todo-plugin -->');

			expect(joplinAPI.commands.execute).not.toHaveBeenCalledWith('synchronize');
		});

		test('does not update note if content is unchanged', async () => {
			const summaryMap = {};
			const summary = createSummary({ map: summaryMap });
			const settings = createSettings();

			// The exact body that would be generated for an empty summary
			const oldBody = '# All done!\n\n\n<!-- inline-todo-plugin -->';

			joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'other-note' });

			await update_summary(summary, settings, 'summary-id', oldBody);

			// Should not call put if content hasn't changed
			expect(joplinAPI.data.put).not.toHaveBeenCalled();
		});

		test('filters todos by notebook when specified in comment', async () => {
			const todos = [
				createTodo({ parent_title: 'Work', msg: 'Work task' }),
				createTodo({ parent_title: 'Personal', msg: 'Personal task' }),
			];

			const summaryMap = createSummaryMap(todos);
			const summary = createSummary({ map: summaryMap });
			const settings = createSettings({ summary_type: 'plain' });

			const oldBody = '<!-- inline-todo-plugin "Work" -->';

			joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'other-note' });
			joplinAPI.data.put.mockResolvedValue({});

			await update_summary(summary, settings, 'summary-id', oldBody);

			const calledBody = joplinAPI.data.put.mock.calls[0][2].body;

			// Should contain work task but not personal task
			expect(calledBody).toContain('Work task');
			expect(calledBody).not.toContain('Personal task');
		});

		test('uses correct formatter based on summary_type', async () => {
			const todos = [createTodo({ msg: 'Task' })];
			const summaryMap = createSummaryMap(todos);
			const summary = createSummary({ map: summaryMap });

			joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'other-note' });
			joplinAPI.data.put.mockResolvedValue({});

			// Test table format
			const tableSettings = createSettings({ summary_type: 'table' });
			await update_summary(summary, tableSettings, 'summary-id', '<!-- inline-todo-plugin -->');

			const tableBody = joplinAPI.data.put.mock.calls[0][2].body;
			expect(tableBody).toContain('| Task |'); // Table format

			jest.clearAllMocks();

			// Test diary format
			const diarySettings = createSettings({ summary_type: 'diary' });
			await update_summary(summary, diarySettings, 'summary-id', '<!-- inline-todo-plugin -->');

			const diaryBody = joplinAPI.data.put.mock.calls[0][2].body;
			expect(diaryBody).toContain('[Task]'); // Diary format uses task as link
		});
	});
});
