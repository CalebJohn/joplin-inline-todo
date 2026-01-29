import { regexes, summaries, regexTitles, summaryTitles } from './settings_tables';

describe('regexes', () => {
	describe('list regex (Metalist Style)', () => {
		const listRegex = regexes.list;

		describe('regex pattern matching', () => {
			test('matches basic uncompleted todo with category', () => {
				const text = '- [ ] Do something @work';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				expect(matches[0][1]).toBe('- [ ] Do something @work');
				expect(listRegex.msg(matches[0])).toBe('Do something');
				expect(listRegex.category(matches[0])).toBe('work');
				expect(listRegex.date(matches[0])).toBe('');
				expect(listRegex.tags(matches[0])).toEqual([]);
				expect(listRegex.completed(matches[0])).toBe(false);
				expect(listRegex.description(matches[0])).toBe('');
			});

			test('matches uncompleted todo with date', () => {
				const text = '- [ ] Do something //2024-01-15';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				expect(matches[0][1]).toBe('- [ ] Do something //2024-01-15');
				expect(listRegex.msg(matches[0])).toBe('Do something');
				expect(listRegex.category(matches[0])).toBe('');
				expect(listRegex.date(matches[0])).toBe('2024-01-15');
				expect(listRegex.tags(matches[0])).toEqual([]);
				expect(listRegex.completed(matches[0])).toBe(false);
			});

			test('matches uncompleted todo with tags', () => {
				const text = '- [ ] Do something +urgent +important';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				expect(matches[0][1]).toBe('- [ ] Do something +urgent +important');
				expect(listRegex.msg(matches[0])).toBe('Do something');
				expect(listRegex.category(matches[0])).toBe('');
				expect(listRegex.date(matches[0])).toBe('');
				expect(listRegex.tags(matches[0])).toEqual(['urgent', 'important']);
				expect(listRegex.completed(matches[0])).toBe(false);
			});

			test('matches completed todo', () => {
				const text = '- [x] Done task @work';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				expect(matches[0][1]).toBe('- [x] Done task @work');
				expect(listRegex.msg(matches[0])).toBe('Done task');
				expect(listRegex.category(matches[0])).toBe('work');
				expect(listRegex.completed(matches[0])).toBe(true);
			});

			test('matches todo with all metadata', () => {
				const text = '- [ ] Complex task @work //2024-01-15 +urgent +important';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				expect(matches[0][1]).toBe('- [ ] Complex task @work //2024-01-15 +urgent +important');
				expect(listRegex.msg(matches[0])).toBe('Complex task');
				expect(listRegex.category(matches[0])).toBe('work');
				expect(listRegex.date(matches[0])).toBe('2024-01-15');
				expect(listRegex.tags(matches[0])).toEqual(['urgent', 'important']);
				expect(listRegex.completed(matches[0])).toBe(false);
			});

			test('matches completed todo with uppercase X', () => {
				const text = '- [X] Done task @work';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				expect(listRegex.msg(matches[0])).toBe('Done task');
				expect(listRegex.category(matches[0])).toBe('work');
				expect(listRegex.completed(matches[0])).toBe(true);
			});

			test('matches indented todo', () => {
				const text = '  - [ ] Indented task @work';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				expect(matches[0][1]).toBe('  - [ ] Indented task @work');
				expect(listRegex.msg(matches[0])).toBe('Indented task');
				expect(listRegex.category(matches[0])).toBe('work');
				expect(listRegex.completed(matches[0])).toBe(false);
			});

			test('matches todo with description (indented lines)', () => {
				const text = `- [ ] Task with description @work
    Additional info line 1
    Additional info line 2`;
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				expect(listRegex.msg(matches[0])).toBe('Task with description');
				expect(listRegex.category(matches[0])).toBe('work');
				expect(listRegex.description(matches[0])).toContain('Additional info line 1');
				expect(listRegex.description(matches[0])).toContain('Additional info line 2');
			});

			test('does not match todo without category, date, or tags', () => {
				const text = '- [ ] Simple task';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(0);
			});

			test('does not match non-checkbox list items', () => {
				const text = '- Regular list item @work';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(0);
			});

			test('matches multiple todos in text', () => {
				const text = `- [ ] First task @work
- [ ] Second task @home
- [x] Completed task @work`;
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(3);
			});
		});

			test('extracts first category when multiple present', () => {
				const text = '- [ ] Do something @work @home';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				expect(listRegex.category(matches[0])).toBe('work');
			});

			test('extracts various date formats', () => {
				const text = '- [ ] Do something //tomorrow';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				expect(listRegex.date(matches[0])).toBe('tomorrow');
			});

			test('extracts single tag', () => {
				const text = '- [ ] Do something +urgent';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				expect(listRegex.tags(matches[0])).toEqual(['urgent']);
			});

			test('extracts multiple tags including all occurrences', () => {
				const text = '- [ ] Do something +urgent +important +work';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				expect(listRegex.tags(matches[0])).toEqual(['urgent', 'important', 'work']);
			});

			test('identifies indented completed todo', () => {
				const text = '  - [x] Done task @work';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				expect(listRegex.completed(matches[0])).toBe(true);
			});

			test('scrollToText returns correct scroll object', () => {
				const text = '- [ ] Task text @work';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				const result = listRegex.scrollToText(matches[0]);
				expect(result).toEqual({
					text: '[ ] Task text @work',
					element: 'ul'
				});
			});

			test('scrollToText handles indented todos', () => {
				const text = '  - [ ] Indented task @work';
				const matches = Array.from(text.matchAll(listRegex.regex));
				expect(matches).toHaveLength(1);
				const result = listRegex.scrollToText(matches[0]);
				expect(result).toEqual({
					text: '[ ] Indented task @work',
					element: 'ul'
				});
			});
	});

	describe('link regex (Link Style)', () => {
		const linkRegex = regexes.link;

		describe('regex pattern matching', () => {
			test('matches TODO link', () => {
				const text = '[TODO](work) Do something important';
				const matches = Array.from(text.matchAll(linkRegex.regex));
				expect(matches).toHaveLength(1);
				expect(matches[0][1]).toBe('TODO');
				expect(matches[0][2]).toBe('work');
				expect(matches[0][3]).toBe(' Do something important');
				expect(linkRegex.category(matches[0])).toBe('TODO');
				expect(linkRegex.date(matches[0])).toBe('work');
				expect(linkRegex.msg(matches[0])).toBe(' Do something important');
				expect(linkRegex.tags(matches[0])).toEqual([]);
				expect(linkRegex.description(matches[0])).toBe('');
				expect(linkRegex.completed(matches[0])).toBe(false);
			});

			test('matches DONE link', () => {
				const text = '[DONE](work) Completed task';
				const matches = Array.from(text.matchAll(linkRegex.regex));
				expect(matches).toHaveLength(1);
				expect(matches[0][1]).toBe('DONE');
				expect(linkRegex.category(matches[0])).toBe('DONE');
				expect(linkRegex.date(matches[0])).toBe('work');
				expect(linkRegex.msg(matches[0])).toBe(' Completed task');
				expect(linkRegex.completed(matches[0])).toBe(true);
			});

			test('matches case-insensitive', () => {
				const text = '[todo](work) Lowercase todo';
				const matches = Array.from(text.matchAll(linkRegex.regex));
				expect(matches).toHaveLength(1);
				expect(linkRegex.category(matches[0])).toBe('todo');
				expect(linkRegex.completed(matches[0])).toBe(false);
			});

			test('matches with date in parentheses', () => {
				const text = '[TODO](2024-01-15) Task with date';
				const matches = Array.from(text.matchAll(linkRegex.regex));
				expect(matches).toHaveLength(1);
				expect(matches[0][2]).toBe('2024-01-15');
				expect(linkRegex.date(matches[0])).toBe('2024-01-15');
				expect(linkRegex.msg(matches[0])).toBe(' Task with date');
			});

			test('does not match incomplete pattern', () => {
				const text = '[TODO] Missing parentheses';
				const matches = Array.from(text.matchAll(linkRegex.regex));
				expect(matches).toHaveLength(0);
			});

			test('scrollToText returns empty object', () => {
				const text = '[TODO](work) Task text';
				const matches = Array.from(text.matchAll(linkRegex.regex));
				expect(matches).toHaveLength(1);
				expect(linkRegex.scrollToText(matches[0])).toEqual({});
			});
		});
	});

	describe('plain regex (List Style)', () => {
		const plainRegex = regexes.plain;

		describe('regex pattern matching', () => {
			test('matches simple uncompleted checkbox', () => {
				const text = '- [ ] Simple task';
				const matches = Array.from(text.matchAll(plainRegex.regex));
				expect(matches).toHaveLength(1);
				expect(matches[0][1]).toBe('- [ ] Simple task');
				expect(plainRegex.msg(matches[0])).toBe('Simple task');
				expect(plainRegex.category(matches[0])).toBe('Unassigned');
				expect(plainRegex.date(matches[0])).toBe('');
				expect(plainRegex.tags(matches[0])).toEqual([]);
				expect(plainRegex.completed(matches[0])).toBe(false);
				expect(plainRegex.description(matches[0])).toBe('');
			});

			test('matches simple completed checkbox', () => {
				const text = '- [x] Completed task';
				const matches = Array.from(text.matchAll(plainRegex.regex));
				expect(matches).toHaveLength(1);
				expect(plainRegex.msg(matches[0])).toBe('Completed task');
				expect(plainRegex.category(matches[0])).toBe('Unassigned');
				expect(plainRegex.completed(matches[0])).toBe(true);
			});

			test('matches completed checkbox with uppercase X', () => {
				const text = '- [X] Completed task';
				const matches = Array.from(text.matchAll(plainRegex.regex));
				expect(matches).toHaveLength(1);
				expect(plainRegex.msg(matches[0])).toBe('Completed task');
				expect(plainRegex.completed(matches[0])).toBe(true);
			});

			test('matches indented checkbox', () => {
				const text = '  - [ ] Indented task';
				const matches = Array.from(text.matchAll(plainRegex.regex));
				expect(matches).toHaveLength(1);
				expect(plainRegex.msg(matches[0])).toBe('Indented task');
				expect(plainRegex.completed(matches[0])).toBe(false);
			});

			test('matches checkbox with description (indented list items)', () => {
				const text = `- [ ] Task with description
    - Sub-item 1
    * Sub-item 2
    + Sub-item 3`;
				const matches = Array.from(text.matchAll(plainRegex.regex));
				expect(matches).toHaveLength(1);
				expect(matches[0][5]).toContain('Sub-item 1');
				expect(matches[0][5]).toContain('Sub-item 2');
				expect(plainRegex.msg(matches[0])).toBe('Task with description');
				expect(plainRegex.description(matches[0])).toContain('Sub-item 1');
				expect(plainRegex.description(matches[0])).toContain('Sub-item 2');
			});

			test('does not match description with nested checkboxes', () => {
				const text = `- [ ] Parent task
    - [ ] This should not be in description`;
				const matches = Array.from(text.matchAll(plainRegex.regex));
				expect(matches).toHaveLength(2);
			});

			test('matches multiple tasks', () => {
				const text = `- [ ] First task
- [x] Second task
- [ ] Third task`;
				const matches = Array.from(text.matchAll(plainRegex.regex));
				expect(matches).toHaveLength(3);
			});

			test('category extracts from metadata when present', () => {
				const text = '- [ ] Task @work';
				const matches = Array.from(text.matchAll(plainRegex.regex));
				expect(matches).toHaveLength(1);
				expect(plainRegex.category(matches[0])).toBe('work');
				expect(plainRegex.msg(matches[0])).toBe('Task');
			});

			test('date extracts from metadata when present', () => {
				const text = '- [ ] Task //2024-01-15';
				const matches = Array.from(text.matchAll(plainRegex.regex));
				expect(matches).toHaveLength(1);
				expect(plainRegex.date(matches[0])).toBe('2024-01-15');
				expect(plainRegex.msg(matches[0])).toBe('Task');
			});

			test('tags extracts from metadata when present', () => {
				const text = '- [ ] Task +urgent +important';
				const matches = Array.from(text.matchAll(plainRegex.regex));
				expect(matches).toHaveLength(1);
				expect(plainRegex.tags(matches[0])).toEqual(['urgent', 'important']);
				expect(plainRegex.msg(matches[0])).toBe('Task');
			});

			test('scrollToText removes leading "- " from text', () => {
				const text = '- [ ] Task text';
				const matches = Array.from(text.matchAll(plainRegex.regex));
				expect(matches).toHaveLength(1);
				const result = plainRegex.scrollToText(matches[0]);
				expect(result).toEqual({
					text: '[ ] Task text',
					element: 'ul'
				});
			});
		});
	});

	describe('regex metadata', () => {
		test('all regexes have required properties', () => {
			Object.entries(regexes).forEach(([key, regex]) => {
				expect(regex).toHaveProperty('title');
				expect(regex).toHaveProperty('regex');
				expect(regex).toHaveProperty('query');
				expect(regex).toHaveProperty('category');
				expect(regex).toHaveProperty('date');
				expect(regex).toHaveProperty('tags');
				expect(regex).toHaveProperty('msg');
				expect(regex).toHaveProperty('description');
				expect(regex).toHaveProperty('toggle');
				expect(regex).toHaveProperty('completed_query');
				expect(regex).toHaveProperty('completed');
				expect(regex).toHaveProperty('scrollToText');
			});
		});

		test('all regexes have toggle with open and closed', () => {
			Object.entries(regexes).forEach(([key, regex]) => {
				expect(regex.toggle).toHaveProperty('open');
				expect(regex.toggle).toHaveProperty('closed');
				expect(typeof regex.toggle.open).toBe('string');
				expect(typeof regex.toggle.closed).toBe('string');
			});
		});
	});
});

describe('summaries', () => {
	test('all summaries have required properties', () => {
		Object.entries(summaries).forEach(([key, summary]) => {
			expect(summary).toHaveProperty('title');
			expect(summary).toHaveProperty('func');
			expect(summary).toHaveProperty('format');
			expect(typeof summary.title).toBe('string');
			expect(typeof summary.func).toBe('function');
			expect(typeof summary.format).toBe('function');
		});
	});
});

