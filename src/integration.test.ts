import { SummaryBuilder } from './builder';
import { update_summary } from './summary';
import { plainBody } from './summaryFormatters/plain';
import { tableBody } from './summaryFormatters/table';
import { createSettings, createNote } from './__test-utils__/factories';
import { mockJoplinAPI, createMockSearchResponse } from './__test-utils__/mocks';
import { regexes } from './settings_tables';

// Mock the Joplin API
jest.mock('api');

describe('Integration Tests', () => {
	let joplinAPI: ReturnType<typeof mockJoplinAPI>;

	beforeEach(() => {
		jest.clearAllMocks();
		joplinAPI = require('api').default;
	});

	describe('Complete workflow: scan → format → update', () => {
		test('scans notes, formats as plain, and updates summary note', async () => {
			// Setup notes with TODOs
			const notes = [
				createNote({
					id: 'note-1',
					title: 'Work Note',
					parent_id: 'work-folder',
					body: '- [ ] Complete project @work //2024-01-15\n- [ ] Review code @work',
				}),
				createNote({
					id: 'note-2',
					title: 'Personal Note',
					parent_id: 'personal-folder',
					body: '- [ ] Buy groceries @personal +urgent',
				}),
			];

			// Mock API responses
			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(notes, false)) // search results
				.mockResolvedValueOnce({ title: 'Work' }) // folder lookup
				.mockResolvedValueOnce({ title: 'Personal' }); // folder lookup

			joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'other-note' });
			joplinAPI.data.put.mockResolvedValue({});

			// Scan all notes
			const settings = createSettings({ summary_type: 'plain' });
			const builder = new SummaryBuilder(settings);
			await builder.search_in_all();

			// Get summary and format it
			const summary = builder.summary;
			const formattedBody = await plainBody(summary.map, settings);

			// Verify formatted output
			expect(formattedBody).toContain('# DUE');
			expect(formattedBody).toContain('Complete project');
			expect(formattedBody).toContain('# WORK');
			expect(formattedBody).toContain('Review code');
			expect(formattedBody).toContain('# PERSONAL');
			expect(formattedBody).toContain('Buy groceries');

			// Update summary note
			await update_summary(summary, settings, 'summary-id', '<!-- inline-todo-plugin -->');

			// Verify the note was updated
			expect(joplinAPI.data.put).toHaveBeenCalledWith(
				['notes', 'summary-id'],
				null,
				expect.objectContaining({
					body: expect.stringContaining('Complete project')
				})
			);
		});

		test('scans notes, formats as table, and updates summary note', async () => {
			const notes = [
				createNote({
					id: 'note-1',
					body: '- [ ] Task 1 @work //2024-01-15 +urgent',
				}),
			];

			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(notes, false))
				.mockResolvedValue({ title: 'Test Folder' });

			joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'other-note' });
			joplinAPI.data.put.mockResolvedValue({});

			const settings = createSettings({ summary_type: 'table', sort_by: 'date' });
			const builder = new SummaryBuilder(settings);
			await builder.search_in_all();

			const summary = builder.summary;
			const formattedBody = await tableBody(summary.map, settings);

			// Verify table structure
			expect(formattedBody).toContain('| Task | category | Due | Tags | Notebook | Note |');
			expect(formattedBody).toContain('| ---- | -------- | --- | ---- | -------- | ---- |');
			expect(formattedBody).toContain('| Task 1 |');

			await update_summary(summary, settings, 'summary-id', '<!-- inline-todo-plugin -->');

			expect(joplinAPI.data.put).toHaveBeenCalled();
		});

		test('handles settings change and rescans with new TODO style', async () => {
			// Initial scan with metalist style
			const metalistNotes = [
				createNote({
					id: 'note-1',
					body: '- [ ] Task @work',
				}),
			];

			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(metalistNotes, false))
				.mockResolvedValue({ title: 'Folder' });

			const settings = createSettings({ todo_type: regexes.list });
			const builder = new SummaryBuilder(settings);
			await builder.search_in_all();

			expect(builder.summary.map['note-1']).toHaveLength(1);
			expect(builder.summary.map['note-1'][0].msg).toBe('Task');

			// Change to link style
			const linkNotes = [
				createNote({
					id: 'note-2',
					body: '[TODO](2024-01-15) Link style task',
				}),
			];

			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(linkNotes, false))
				.mockResolvedValue({ title: 'Folder' });

			builder.settings = createSettings({ todo_type: regexes.link });
			await builder.search_in_all();

			expect(builder.summary.map['note-2']).toHaveLength(1);
			expect(builder.summary.map['note-2'][0].msg).toContain('Link style task');
		});

		test('filters and formats summary for specific notebooks', async () => {
			const notes = [
				createNote({
					id: 'note-1',
					parent_id: 'work-folder',
					body: '- [ ] Work task @work',
				}),
				createNote({
					id: 'note-2',
					parent_id: 'personal-folder',
					body: '- [ ] Personal task @personal',
				}),
			];

			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(notes, false))
				.mockResolvedValueOnce({ title: 'Work' })
				.mockResolvedValueOnce({ title: 'Personal' });

			joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'other-note' });
			joplinAPI.data.put.mockResolvedValue({});

			const settings = createSettings();
			const builder = new SummaryBuilder(settings);
			await builder.search_in_all();

			const summary = builder.summary;

			// Update with notebook filter
			const oldBody = '<!-- inline-todo-plugin "Work" -->';
			await update_summary(summary, settings, 'summary-id', oldBody);

			const calledBody = joplinAPI.data.put.mock.calls[0][2].body;

			expect(calledBody).toContain('Work task');
			expect(calledBody).not.toContain('Personal task');
		});

		test('shows/hides completed TODOs based on settings', async () => {
			const notes = [
				createNote({
					id: 'note-1',
					body: '- [ ] Open task @work\n- [x] Completed task @work',
				}),
			];

			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(notes, false)) // open search
				.mockResolvedValueOnce({ title: 'Folder' })
				.mockResolvedValueOnce(createMockSearchResponse(notes, false)) // completed search
				.mockResolvedValue({ title: 'Folder' });

			// Test with show_complete_todo = true
			const settingsWithCompleted = createSettings({ show_complete_todo: true });
			const builder = new SummaryBuilder(settingsWithCompleted);
			await builder.search_in_all();

			const summaryWithCompleted = builder.summary;
			const bodyWithCompleted = await plainBody(summaryWithCompleted.map, settingsWithCompleted);

			expect(bodyWithCompleted).toContain('Open task');
			expect(bodyWithCompleted).toContain('# COMPLETED');
			expect(bodyWithCompleted).toContain('Completed task');

			// Test with show_complete_todo = false
			jest.clearAllMocks();

			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(notes, false))
				.mockResolvedValue({ title: 'Folder' });

			const settingsWithoutCompleted = createSettings({ show_complete_todo: false });
			const builder2 = new SummaryBuilder(settingsWithoutCompleted);
			await builder2.search_in_all();

			const summaryWithoutCompleted = builder2.summary;
			const bodyWithoutCompleted = await plainBody(summaryWithoutCompleted.map, settingsWithoutCompleted);

			expect(bodyWithoutCompleted).toContain('Open task');
			expect(bodyWithoutCompleted).not.toContain('# COMPLETED');
			expect(bodyWithoutCompleted).not.toContain('Completed task');
		});

		test('handles multiple scans maintaining consistency', async () => {
			const notes = [
				createNote({
					id: 'note-1',
					body: '- [ ] Task 1 @work',
				}),
			];

			// Mock responses for both scans (2 searches each)
			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(notes, false)) // First scan
				.mockResolvedValueOnce({ title: 'Folder' }) // Folder lookup
				.mockResolvedValueOnce(createMockSearchResponse(notes, false)) // Second scan
				.mockResolvedValue({ title: 'Folder' }); // Folder lookup (cached)

			const settings = createSettings();
			const builder = new SummaryBuilder(settings);

			// First scan
			await builder.search_in_all();
			const summary1 = builder.summary;

			// Second scan
			await builder.search_in_all();
			const summary2 = builder.summary;

			// Results should be consistent
			expect(summary1.map['note-1']).toHaveLength(1);
			expect(summary2.map['note-1']).toHaveLength(1);
			expect(summary1.map['note-1'][0].msg).toBe(summary2.map['note-1'][0].msg);
		});

		test('handles empty notes gracefully', async () => {
			const notes = [
				createNote({
					id: 'note-1',
					body: 'Just regular text with no TODOs',
				}),
			];

			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(notes, false))
				.mockResolvedValue({ title: 'Folder' });

			joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'other-note' });
			joplinAPI.data.put.mockResolvedValue({});

			const settings = createSettings();
			const builder = new SummaryBuilder(settings);
			await builder.search_in_all();

			const summary = builder.summary;
			const formattedBody = await plainBody(summary.map, settings);

			expect(formattedBody).toContain('# All done!');

			await update_summary(summary, settings, 'summary-id', '<!-- inline-todo-plugin -->');

			const calledBody = joplinAPI.data.put.mock.calls[0][2].body;
			expect(calledBody).toContain('# All done!');
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

			test('handles API errors during complete workflow', async () => {
				// First call succeeds, subsequent calls fail
				joplinAPI.data.get
					.mockResolvedValueOnce(createMockSearchResponse([
						createNote({ id: 'note-1', body: '- [ ] Task @work' })
					], false))
					.mockRejectedValue(new Error('Folder lookup failed'));

				const settings = createSettings();
				const builder = new SummaryBuilder(settings);

				// Should not throw despite folder lookup failure
				await expect(builder.search_in_all()).resolves.not.toThrow();

				// Should still have extracted the TODO (with unknown folder)
				expect(builder.summary.map['note-1']).toHaveLength(1);
				expect(builder.summary.map['note-1'][0].parent_title).toBe('Unknown Folder');
			});
		});

		test('preserves summary note content after special comment', async () => {
			const notes = [
				createNote({
					id: 'note-1',
					body: '- [ ] New task @work',
				}),
			];

			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(notes, false))
				.mockResolvedValue({ title: 'Folder' });

			joplinAPI.workspace.selectedNote.mockResolvedValue({ id: 'other-note' });
			joplinAPI.data.put.mockResolvedValue({});

			const settings = createSettings();
			const builder = new SummaryBuilder(settings);
			await builder.search_in_all();

			const summary = builder.summary;
			const oldBody = 'old summary\n<!-- inline-todo-plugin -->\n\n# My Notes\n\nPersonal content';

			await update_summary(summary, settings, 'summary-id', oldBody);

			const calledBody = joplinAPI.data.put.mock.calls[0][2].body;

			// Should preserve content after comment
			expect(calledBody).toContain('# My Notes');
			expect(calledBody).toContain('Personal content');
			// Should have new content before comment
			expect(calledBody).toContain('New task');
			expect(calledBody).not.toContain('old summary');
		});
	});
});
