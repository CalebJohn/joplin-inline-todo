import { SummaryBuilder } from './builder';
import { createNote, createSettings } from './__test-utils__/factories';
import { mockJoplinAPI, createMockSearchResponse, createMockFolder } from './__test-utils__/mocks';
import { regexes } from './settings_tables';

// Mock the Joplin API
jest.mock('api');

describe('SummaryBuilder', () => {
	let builder: SummaryBuilder;
	let joplinAPI: ReturnType<typeof mockJoplinAPI>;

	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();

		// Get the mocked API
		joplinAPI = require('api').default;

		// Create builder with default settings
		const settings = createSettings();
		builder = new SummaryBuilder(settings);
	});

	describe('search_in_note', () => {
		test('extracts TODOs from note with metalist style', async () => {
			const note = createNote({
				id: 'note-1',
				body: '- [ ] Buy groceries @personal //2024-01-15 +urgent',
			});

			joplinAPI.data.get.mockResolvedValue({ title: 'Test Folder' });

			await builder.search_in_note(note);
			const summary = builder.summary;

			expect(summary.map['note-1']).toHaveLength(1);
			expect(summary.map['note-1'][0]).toMatchObject({
				msg: 'Buy groceries',
				category: 'personal',
				date: '2024-01-15',
				tags: ['urgent'],
				completed: false,
			});
		});

		test('extracts multiple TODOs from single note', async () => {
			const note = createNote({
				id: 'note-1',
				body: `- [ ] First task @work
- [ ] Second task @personal
- [ ] Third task @work`,
			});

			joplinAPI.data.get.mockResolvedValue({ title: 'Test Folder' });

			await builder.search_in_note(note);
			const summary = builder.summary;

			expect(summary.map['note-1']).toHaveLength(3);
			expect(summary.map['note-1'][0].msg).toBe('First task');
			expect(summary.map['note-1'][1].msg).toBe('Second task');
			expect(summary.map['note-1'][2].msg).toBe('Third task');
		});

		test('skips conflict notes', async () => {
			const note = createNote({
				id: 'note-1',
				is_conflict: true,
				body: '- [ ] Task @work',
			});

			await builder.search_in_note(note);
			const summary = builder.summary;

			expect(summary.map['note-1']).toBeUndefined();
		});

		test('handles notes with no TODOs', async () => {
			const note = createNote({
				id: 'note-1',
				body: 'Just regular text with no TODOs',
			});

			joplinAPI.data.get.mockResolvedValue({ title: 'Test Folder' });

			await builder.search_in_note(note);
			const summary = builder.summary;

			expect(summary.map['note-1']).toBeUndefined();
		});

		test('extracts completed TODOs correctly', async () => {
			const note = createNote({
				id: 'note-1',
				body: '- [x] Completed task @work',
			});

			joplinAPI.data.get.mockResolvedValue({ title: 'Test Folder' });

			await builder.search_in_note(note);
			const summary = builder.summary;

			expect(summary.map['note-1']).toHaveLength(1);
			expect(summary.map['note-1'][0].completed).toBe(true);
		});

		test('extracts TODOs without category', async () => {
			const note = createNote({
				id: 'note-1',
				// Metalist style requires at least one metadata field (@, //, or +)
				body: '- [ ] Task without category +tag',
			});

			joplinAPI.data.get.mockResolvedValue({ title: 'Test Folder' });

			await builder.search_in_note(note);
			const summary = builder.summary;

			expect(summary.map['note-1']).toHaveLength(1);
			expect(summary.map['note-1'][0].category).toBe('');
			expect(summary.map['note-1'][0].msg).toBe('Task without category');
		});

		test('extracts TODOs with multiple tags', async () => {
			const note = createNote({
				id: 'note-1',
				body: '- [ ] Multi-tag task +urgent +important +review',
			});

			joplinAPI.data.get.mockResolvedValue({ title: 'Test Folder' });

			await builder.search_in_note(note);
			const summary = builder.summary;

			expect(summary.map['note-1']).toHaveLength(1);
			expect(summary.map['note-1'][0].tags).toEqual(['urgent', 'important', 'review']);
		});

		test('includes note metadata in extracted TODOs', async () => {
			const note = createNote({
				id: 'note-123',
				title: 'My Important Note',
				parent_id: 'folder-456',
				body: '- [ ] Do something @work',
			});

			joplinAPI.data.get.mockResolvedValue({ title: 'Work Folder' });

			await builder.search_in_note(note);
			const summary = builder.summary;

			expect(summary.map['note-123'][0]).toMatchObject({
				note: 'note-123',
				note_title: 'My Important Note',
				parent_id: 'folder-456',
				parent_title: 'Work Folder',
			});
		});
	});

	describe('get_parent_title', () => {
		test('caches folder names to reduce API calls', async () => {
			joplinAPI.data.get.mockResolvedValue({ title: 'Work Folder' });

			const note1 = createNote({ id: 'note-1', parent_id: 'folder-1', body: '- [ ] Task 1 @work' });
			const note2 = createNote({ id: 'note-2', parent_id: 'folder-1', body: '- [ ] Task 2 @work' });

			await builder.search_in_note(note1);
			await builder.search_in_note(note2);

			// API should only be called once for the same folder
			expect(joplinAPI.data.get).toHaveBeenCalledTimes(1);
			expect(joplinAPI.data.get).toHaveBeenCalledWith(
				['folders', 'folder-1'],
				{ fields: ['title'] }
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

			test('handles folder lookup failure gracefully', async () => {
				joplinAPI.data.get.mockRejectedValue(new Error('Folder not found'));

				const note = createNote({
					id: 'note-1',
					parent_id: 'missing-folder',
					body: '- [ ] Task @work',
				});

				await builder.search_in_note(note);
				const summary = builder.summary;

				expect(summary.map['note-1'][0].parent_title).toBe('Unknown Folder');
			});
		});

		test('retrieves different folder names for different folders', async () => {
			joplinAPI.data.get
				.mockResolvedValueOnce({ title: 'Work Folder' })
				.mockResolvedValueOnce({ title: 'Personal Folder' });

			const note1 = createNote({ id: 'note-1', parent_id: 'folder-1', body: '- [ ] Task 1 @work' });
			const note2 = createNote({ id: 'note-2', parent_id: 'folder-2', body: '- [ ] Task 2 @personal' });

			await builder.search_in_note(note1);
			await builder.search_in_note(note2);

			const summary = builder.summary;

			expect(summary.map['note-1'][0].parent_title).toBe('Work Folder');
			expect(summary.map['note-2'][0].parent_title).toBe('Personal Folder');
			expect(joplinAPI.data.get).toHaveBeenCalledTimes(2);
		});
	});

	describe('search_with_query', () => {
		test('processes single page of search results', async () => {
			const notes = [
				createNote({ id: 'note-1', body: '- [ ] Task 1 @work' }),
				createNote({ id: 'note-2', body: '- [ ] Task 2 @personal' }),
			];

			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(notes, false))
				.mockResolvedValue({ title: 'Test Folder' });

			await builder.search_with_query('/"- [ ]"');
			const summary = builder.summary;

			expect(summary.map['note-1']).toHaveLength(1);
			expect(summary.map['note-2']).toHaveLength(1);
		});

		test('processes multiple pages of search results', async () => {
			const page1 = [createNote({ id: 'note-1', body: '- [ ] Task 1 @work' })];
			const page2 = [createNote({ id: 'note-2', body: '- [ ] Task 2 @work' })];

			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(page1, true))
				.mockResolvedValueOnce({ title: 'Test Folder' })
				.mockResolvedValueOnce(createMockSearchResponse(page2, false))
				.mockResolvedValue({ title: 'Test Folder' });

			await builder.search_with_query('/"- [ ]"');
			const summary = builder.summary;

			expect(summary.map['note-1']).toHaveLength(1);
			expect(summary.map['note-2']).toHaveLength(1);
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

			test('handles search API errors gracefully', async () => {
				joplinAPI.data.get.mockRejectedValue(new Error('Search failed'));

				// Should not throw
				await expect(builder.search_with_query('/"- [ ]"')).resolves.not.toThrow();
			});
		});

		test('handles empty search results', async () => {
			joplinAPI.data.get.mockResolvedValue(createMockSearchResponse([], false));

			await builder.search_with_query('/"- [ ]"');
			const summary = builder.summary;

			expect(Object.keys(summary.map)).toHaveLength(0);
		});

		test('rate limits after scan_period_c pages', async () => {
			jest.useFakeTimers();

			const settings = createSettings({ scan_period_c: 2, scan_period_s: 1 });
			builder = new SummaryBuilder(settings);

			const notes = [createNote({ id: 'note-1', body: '- [ ] Task @work' })];

			// Mock 3 pages (will trigger rate limit after page 2)
			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(notes, true)) // page 1
				.mockResolvedValueOnce({ title: 'Test Folder' })
				.mockResolvedValueOnce(createMockSearchResponse(notes, true)) // page 2
				.mockResolvedValueOnce({ title: 'Test Folder' })
				.mockResolvedValueOnce(createMockSearchResponse(notes, false)) // page 3
				.mockResolvedValue({ title: 'Test Folder' });

			const searchPromise = builder.search_with_query('/"- [ ]"');

			// Fast-forward time to trigger rate limiting
			await jest.runAllTimersAsync();
			await searchPromise;

			jest.useRealTimers();
		});
	});

	describe('search_in_all', () => {
		test('resets summary before scan', async () => {
			// Add some initial data
			const note1 = createNote({ id: 'note-1', body: '- [ ] Initial task @work' });
			joplinAPI.data.get.mockResolvedValue({ title: 'Test Folder' });
			await builder.search_in_note(note1);

			expect(builder.summary.map['note-1']).toHaveLength(1);

			// Mock a new scan with different results
			const note2 = createNote({ id: 'note-2', body: '- [ ] New task @work' });
			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse([note2], false))
				.mockResolvedValue({ title: 'Test Folder' });

			await builder.search_in_all();
			const summary = builder.summary;

			// Old note should be gone
			expect(summary.map['note-1']).toBeUndefined();
			// New note should be present
			expect(summary.map['note-2']).toHaveLength(1);
		});

		test('searches for completed TODOs when show_complete_todo is true', async () => {
			const settings = createSettings({ show_complete_todo: true });
			builder = new SummaryBuilder(settings);

			const notes = [createNote({ id: 'note-1', body: '- [ ] Task @work' })];
			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(notes, false)) // open todos
				.mockResolvedValueOnce({ title: 'Test Folder' })
				.mockResolvedValueOnce(createMockSearchResponse([], false)) // completed todos
				.mockResolvedValue({ title: 'Test Folder' });

			await builder.search_in_all();

			// Should have called search twice: once for open, once for completed
			expect(joplinAPI.data.get).toHaveBeenCalledWith(
				['search'],
				expect.objectContaining({ query: '/"- [ ]"' })
			);
			expect(joplinAPI.data.get).toHaveBeenCalledWith(
				['search'],
				expect.objectContaining({ query: '/"- [x]"' })
			);
		});

		test('does not search for completed TODOs when show_complete_todo is false', async () => {
			const settings = createSettings({ show_complete_todo: false });
			builder = new SummaryBuilder(settings);

			const notes = [createNote({ id: 'note-1', body: '- [ ] Task @work' })];
			joplinAPI.data.get
				.mockResolvedValueOnce(createMockSearchResponse(notes, false))
				.mockResolvedValue({ title: 'Test Folder' });

			await builder.search_in_all();

			// Should only search for open todos
			expect(joplinAPI.data.get).toHaveBeenCalledWith(
				['search'],
				expect.objectContaining({ query: '/"- [ ]"' })
			);
			expect(joplinAPI.data.get).not.toHaveBeenCalledWith(
				['search'],
				expect.objectContaining({ query: '/"- [x]"' })
			);
		});

		test('updates lastRefresh timestamp', async () => {
			const beforeTime = new Date();

			joplinAPI.data.get.mockResolvedValue(createMockSearchResponse([], false));

			await builder.search_in_all();
			const summary = builder.summary;

			expect(summary.meta.lastRefresh.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
		});
	});

	describe('settings getter and setter', () => {
		test('gets current settings', () => {
			const settings = createSettings({ scan_period_c: 5 });
			builder = new SummaryBuilder(settings);

			expect(builder.settings.scan_period_c).toBe(5);
		});

		test('updates settings', () => {
			const newSettings = createSettings({ scan_period_c: 20 });
			builder.settings = newSettings;

			expect(builder.settings.scan_period_c).toBe(20);
		});
	});

	describe('TODO extraction with different styles', () => {
		test('extracts link style TODOs', async () => {
			const settings = createSettings({ todo_type: regexes.link });
			builder = new SummaryBuilder(settings);

			const note = createNote({
				id: 'note-1',
				body: '[TODO](2024-01-15) Buy groceries',
			});

			joplinAPI.data.get.mockResolvedValue({ title: 'Test Folder' });

			await builder.search_in_note(note);
			const summary = builder.summary;

			expect(summary.map['note-1']).toHaveLength(1);
			expect(summary.map['note-1'][0].msg).toBe(' Buy groceries');
			expect(summary.map['note-1'][0].date).toBe('2024-01-15');
		});

		test('extracts plain list style TODOs', async () => {
			const settings = createSettings({ todo_type: regexes.plain });
			builder = new SummaryBuilder(settings);

			const note = createNote({
				id: 'note-1',
				body: '- [ ] Simple task',
			});

			joplinAPI.data.get.mockResolvedValue({ title: 'Test Folder' });

			await builder.search_in_note(note);
			const summary = builder.summary;

			expect(summary.map['note-1']).toHaveLength(1);
			expect(summary.map['note-1'][0].msg).toBe('Simple task');
		});
	});
});
