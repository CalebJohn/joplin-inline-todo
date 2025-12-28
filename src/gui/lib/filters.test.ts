import calcFiltered from './filters';
import { Todo, Filter, Filters, Checked, ActiveFiltered } from '../../types';
import { DateTime } from 'luxon';
import { createTodo, createFilter } from '../../__test-utils__/factories';
import { mockNow, dateFixtures, getFilteredKeys } from '../../__test-utils__/helpers';

describe('filters', () => {
	beforeAll(() => {
		jest.spyOn(DateTime, 'now').mockReturnValue(mockNow);
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	describe('date filtering', () => {
		const { past, present, future, endOf } = dateFixtures;

		const todos = [
			createTodo({ key: 'today', date: present.today }),
			createTodo({ key: 'yesterday', date: past.yesterday }),
			createTodo({ key: 'tomorrow', date: future.tomorrow }),
			createTodo({ key: 'day-after', date: future.dayAfterTomorrow }),
			createTodo({ key: 'six-days', date: future.inSixDays }),
			createTodo({ key: 'eight-days', date: future.inEightDays }),
			createTodo({ key: 'ten-days', date: future.inTenDays }),
			createTodo({ key: 'fifteen-days', date: future.inFifteenDays }),
			createTodo({ key: 'twenty-days', date: future.inTwentyDays }),
			createTodo({ key: 'forty-days', date: future.inFortyDays }),
			createTodo({ key: 'no-date', date: '' }),
			createTodo({ key: 'after-week', date: endOf.afterWeek }),
			createTodo({ key: 'after-month', date: endOf.afterMonth }),
			createTodo({ key: 'after-year', date: endOf.afterYear }),
		];

		test('with "All" filter returns all todos', () => {
			const keys = getFilteredKeys(todos, { date: 'All' });
			expect(keys).toHaveLength(todos.length);
		});

		test('with "None" filter returns empty array', () => {
			const keys = getFilteredKeys(todos, { date: 'None' });
			expect(keys).toHaveLength(0);
		});

		test('with "Overdue" filter', () => {
			const keys = getFilteredKeys(todos, { date: 'Overdue' });
			expect(keys).toContain('yesterday');
			expect(keys).not.toContain('today');
			expect(keys).not.toContain('tomorrow');
			expect(keys).not.toContain('no-date');
		});

		test('with "Today" filter', () => {
			const keys = getFilteredKeys(todos, { date: 'Today' });
			expect(keys).toContain('yesterday');
			expect(keys).toContain('today');
			expect(keys).not.toContain('tomorrow');
			expect(keys).not.toContain('no-date');
		});

		test('with "Tomorrow" filter', () => {
			const keys = getFilteredKeys(todos, { date: 'Tomorrow' });
			expect(keys).toContain('yesterday');
			expect(keys).toContain('today');
			expect(keys).toContain('tomorrow');
			expect(keys).not.toContain('day-after');
		});

		test.each([
			['End of Week', 'after-week'],
			['End of Month', 'after-month'],
			['End of Year', 'after-year'],
		] as const)('includes todos before %s, excludes after', (dateFilter, excludedKey) => {
			const keys = getFilteredKeys(todos, { date: dateFilter });
			expect(keys).toContain('today');
			expect(keys).not.toContain(excludedKey);
		});

		test.each([
			['1 week', 'six-days', 'eight-days'],
			['2 weeks', 'ten-days', 'fifteen-days'],
			['1 month', 'twenty-days', 'forty-days'],
		] as const)('filters with "%s" includes todos within range, excludes beyond', (dateFilter, includedKey, excludedKey) => {
			const keys = getFilteredKeys(todos, { date: dateFilter });
			expect(keys).toContain('today');
			expect(keys).toContain(includedKey);
			expect(keys).not.toContain(excludedKey);
		});

		test('excludes todos without dates (when using date filter)', () => {
			const keys = getFilteredKeys(todos, { date: 'Today' });
			expect(keys).not.toContain('no-date');
		});
	});

	describe('tag filtering', () => {
		test('returns all todos when no tag filters', () => {
			const todos = [
				createTodo({ tags: ['urgent'] }),
				createTodo({ tags: ['important'] }),
				createTodo({ tags: [] }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({ tags: [] }),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos).toHaveLength(3);
		});

		test('filters by single tag', () => {
			const todos = [
				createTodo({ key: 'urgent-task', tags: ['urgent'] }),
				createTodo({ key: 'important-task', tags: ['important'] }),
				createTodo({ key: 'no-tags', tags: [] }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({ tags: ['urgent'] }),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos).toHaveLength(1);
			expect(result.active.todos[0].key).toBe('urgent-task');
		});

		test('filters by multiple tags (OR logic)', () => {
			const todos = [
				createTodo({ key: 'urgent-task', tags: ['urgent'] }),
				createTodo({ key: 'important-task', tags: ['important'] }),
				createTodo({ key: 'both-tags', tags: ['urgent', 'important'] }),
				createTodo({ key: 'no-tags', tags: [] }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({ tags: ['urgent', 'important'] }),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos).toHaveLength(3);
			const keys = result.active.todos.map(t => t.key);
			expect(keys).toContain('urgent-task');
			expect(keys).toContain('important-task');
			expect(keys).toContain('both-tags');
		});

		test('matches todos with any of the filtered tags', () => {
			const todos = [
				createTodo({ key: 'has-tag1', tags: ['tag1', 'other'] }),
				createTodo({ key: 'has-tag2', tags: ['tag2'] }),
				createTodo({ key: 'has-tag3', tags: ['tag3', 'tag1'] }),
				createTodo({ key: 'no-match', tags: ['different'] }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({ tags: ['tag1', 'tag2'] }),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos).toHaveLength(3);
			const keys = result.active.todos.map(t => t.key);
			expect(keys).toContain('has-tag1');
			expect(keys).toContain('has-tag2');
			expect(keys).toContain('has-tag3');
			expect(keys).not.toContain('no-match');
		});
	});

	describe('string field filtering', () => {
		describe('category filtering', () => {
			test('returns all todos when no category filter', () => {
				const todos = [
					createTodo({ category: 'work' }),
					createTodo({ category: 'personal' }),
					createTodo({ category: 'urgent' }),
				];
				const filters: Filters = {
					saved: [],
					active: createFilter({ category: [] }),
					activeHistory: [],
					checked: {},
				};

				const result = calcFiltered(todos, filters);
				expect(result.active.todos).toHaveLength(3);
			});

			test('filters by single category', () => {
				const todos = [
					createTodo({ key: 'work-task', category: 'work' }),
					createTodo({ key: 'personal-task', category: 'personal' }),
				];
				const filters: Filters = {
					saved: [],
					active: createFilter({ category: ['work'] }),
					activeHistory: [],
					checked: {},
				};

				const result = calcFiltered(todos, filters);
				expect(result.active.todos).toHaveLength(1);
				expect(result.active.todos[0].key).toBe('work-task');
			});

			test('filters by multiple categories', () => {
				const todos = [
					createTodo({ key: 'work-task', category: 'work' }),
					createTodo({ key: 'personal-task', category: 'personal' }),
					createTodo({ key: 'urgent-task', category: 'urgent' }),
				];
				const filters: Filters = {
					saved: [],
					active: createFilter({ category: ['work', 'personal'] }),
					activeHistory: [],
					checked: {},
				};

				const result = calcFiltered(todos, filters);
				expect(result.active.todos).toHaveLength(2);
				const keys = result.active.todos.map(t => t.key);
				expect(keys).toContain('work-task');
				expect(keys).toContain('personal-task');
			});
		});

		test.each([
			['note', 'note-id-1', 'note-id-2', 'task1'],
			['parent_id', 'parent-1', 'parent-2', 'task1'],
		] as const)('filters by %s field', (field, matchValue, otherValue, expectedKey) => {
			const todos = [
				createTodo({ key: expectedKey, [field]: matchValue }),
				createTodo({ key: 'other', [field]: otherValue }),
			];
			const keys = getFilteredKeys(todos, { [field]: [matchValue] });
			expect(keys).toHaveLength(1);
			expect(keys[0]).toBe(expectedKey);
		});
	});

	describe('completion filtering', () => {
		test('filters out all completed todos when filter is "None"', () => {
			const todos = [
				createTodo({ key: 'incomplete', completed: false }),
				createTodo({ key: 'complete', completed: true }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({ completed: 'None' }),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos).toHaveLength(1);
			expect(result.active.todos[0].key).toBe('incomplete');
		});

		test('shows all completed todos when filter is "All Time"', () => {
			const todos = [
				createTodo({ key: 'incomplete', completed: false }),
				createTodo({ key: 'complete', completed: true }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({ completed: 'All Time' }),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos).toHaveLength(2);
		});

		describe('completion date filtering', () => {
			test('shows todos completed today when filter is "Today"', () => {
				const { today } = dateFixtures.present;
				const { yesterday } = dateFixtures.past;

				const checked: Checked = {
					'completed-today': today,
					'completed-yesterday': yesterday,
				};

				const todos = [
					createTodo({ key: 'incomplete', completed: false }),
					createTodo({ key: 'completed-today', completed: true }),
					createTodo({ key: 'completed-yesterday', completed: true }),
				];
				const filters: Filters = {
					saved: [],
					active: createFilter({ completed: 'Today' }),
					activeHistory: [],
					checked,
				};

				const result = calcFiltered(todos, filters);
				const completedTodos = result.active.todos.filter(t => t.completed);
				expect(completedTodos).toHaveLength(1);
				expect(completedTodos[0].key).toBe('completed-today');
			});

			test('shows todos completed this week when filter is "This Week"', () => {
				const { today } = dateFixtures.present;
				const { lastWeek } = dateFixtures.past;
				const thisWeek = mockNow.minus({ days: 3 }).toISODate(); // Earlier in the week

				const checked: Checked = {
					'completed-today': today,
					'completed-this-week': thisWeek,
					'completed-last-week': lastWeek,
				};

				const todos = [
					createTodo({ key: 'completed-today', completed: true }),
					createTodo({ key: 'completed-this-week', completed: true }),
					createTodo({ key: 'completed-last-week', completed: true }),
				];
				const filters: Filters = {
					saved: [],
					active: createFilter({ completed: 'This Week' }),
					activeHistory: [],
					checked,
				};

				const result = calcFiltered(todos, filters);
				const completedTodos = result.active.todos.filter(t => t.completed);
				expect(completedTodos).toHaveLength(2);
				const keys = completedTodos.map(t => t.key);
				expect(keys).toContain('completed-today');
				expect(keys).toContain('completed-this-week');
			});

			test('shows todos completed this month when filter is "This Month"', () => {
				const { today } = dateFixtures.present;
				const { tenDaysAgo, lastMonth } = dateFixtures.past;

				const checked: Checked = {
					'completed-today': today,
					'completed-this-month': tenDaysAgo,
					'completed-last-month': lastMonth,
				};

				const todos = [
					createTodo({ key: 'completed-today', completed: true }),
					createTodo({ key: 'completed-this-month', completed: true }),
					createTodo({ key: 'completed-last-month', completed: true }),
				];
				const filters: Filters = {
					saved: [],
					active: createFilter({ completed: 'This Month' }),
					activeHistory: [],
					checked,
				};

				const result = calcFiltered(todos, filters);
				const completedTodos = result.active.todos.filter(t => t.completed);
				expect(completedTodos).toHaveLength(2);
				const keys = completedTodos.map(t => t.key);
				expect(keys).toContain('completed-today');
				expect(keys).toContain('completed-this-month');
			});

			test('shows todos completed this year when filter is "This Year"', () => {
				const { today } = dateFixtures.present;
				const { threeMonthsAgo, lastYear } = dateFixtures.past;

				const checked: Checked = {
					'completed-today': today,
					'completed-this-year': threeMonthsAgo,
					'completed-last-year': lastYear,
				};

				const todos = [
					createTodo({ key: 'completed-today', completed: true }),
					createTodo({ key: 'completed-this-year', completed: true }),
					createTodo({ key: 'completed-last-year', completed: true }),
				];
				const filters: Filters = {
					saved: [],
					active: createFilter({ completed: 'This Year' }),
					activeHistory: [],
					checked,
				};

				const result = calcFiltered(todos, filters);
				const completedTodos = result.active.todos.filter(t => t.completed);
				expect(completedTodos).toHaveLength(2);
				const keys = completedTodos.map(t => t.key);
				expect(keys).toContain('completed-today');
				expect(keys).toContain('completed-this-year');
			});

			test('does not show completed todos without checked date', () => {
				const { today } = dateFixtures.present;

				const checked: Checked = {
					'completed-with-date': today,
				};

				const todos = [
					createTodo({ key: 'completed-with-date', completed: true }),
					createTodo({ key: 'completed-no-date', completed: true }),
				];
				const filters: Filters = {
					saved: [],
					active: createFilter({ completed: 'Today' }),
					activeHistory: [],
					checked,
				};

				const result = calcFiltered(todos, filters);
				const completedTodos = result.active.todos.filter(t => t.completed);
				expect(completedTodos).toHaveLength(1);
				expect(completedTodos[0].key).toBe('completed-with-date');
			});
		});
	});

	describe('sorting', () => {
		test('sorts todos with dates before todos without dates', () => {
			const todos = [
				createTodo({ key: 'no-date', date: '' }),
				createTodo({ key: 'with-date', date: '2024-01-15' }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter(),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos[0].key).toBe('with-date');
			expect(result.active.todos[1].key).toBe('no-date');
		});

		test('sorts todos by date ascending', () => {
			const todos = [
				createTodo({ key: 'later', date: '2024-01-20' }),
				createTodo({ key: 'earlier', date: '2024-01-10' }),
				createTodo({ key: 'middle', date: '2024-01-15' }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter(),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos[0].key).toBe('earlier');
			expect(result.active.todos[1].key).toBe('middle');
			expect(result.active.todos[2].key).toBe('later');
		});

		test('sorts by category when dates are equal', () => {
			const date = '2024-01-15';
			const todos = [
				createTodo({ key: 'work', date, category: 'work' }),
				createTodo({ key: 'home', date, category: 'home' }),
				createTodo({ key: 'urgent', date, category: 'urgent' }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter(),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos[0].key).toBe('home');
			expect(result.active.todos[1].key).toBe('urgent');
			expect(result.active.todos[2].key).toBe('work');
		});

		test('sorts by parent_title when dates and categories are equal', () => {
			const date = '2024-01-15';
			const category = 'work';
			const todos = [
				createTodo({ key: 'zebra', date, category, parent_title: 'Zebra Notebook' }),
				createTodo({ key: 'alpha', date, category, parent_title: 'Alpha Notebook' }),
				createTodo({ key: 'beta', date, category, parent_title: 'Beta Notebook' }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter(),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos[0].key).toBe('alpha');
			expect(result.active.todos[1].key).toBe('beta');
			expect(result.active.todos[2].key).toBe('zebra');
		});

		test('handles numeric sorting in category names', () => {
			const date = '2024-01-15';
			const todos = [
				createTodo({ key: 'cat10', date, category: 'category10' }),
				createTodo({ key: 'cat2', date, category: 'category2' }),
				createTodo({ key: 'cat1', date, category: 'category1' }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter(),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos[0].key).toBe('cat1');
			expect(result.active.todos[1].key).toBe('cat2');
			expect(result.active.todos[2].key).toBe('cat10');
		});
	});

	describe('combined filtering', () => {
		test('applies multiple filters together', () => {
			const { today } = dateFixtures.present;
			const { inTenDays } = dateFixtures.future;

			const todos = [
				createTodo({
					key: 'match-all',
					category: 'work',
					tags: ['urgent'],
					date: today,
					completed: false,
				}),
				createTodo({
					key: 'wrong-category',
					category: 'personal',
					tags: ['urgent'],
					date: today,
					completed: false,
				}),
				createTodo({
					key: 'wrong-tag',
					category: 'work',
					tags: ['low-priority'],
					date: today,
					completed: false,
				}),
				createTodo({
					key: 'wrong-date',
					category: 'work',
					tags: ['urgent'],
					date: inTenDays,
					completed: false,
				}),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({
					category: ['work'],
					tags: ['urgent'],
					date: 'Today',
				}),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos).toHaveLength(1);
			expect(result.active.todos[0].key).toBe('match-all');
		});

		test('filters are applied in correct order', () => {
			const { today } = dateFixtures.present;
			const checked: Checked = {};

			const todos = [
				createTodo({
					key: 'should-match',
					category: 'work',
					note_title: 'Important Note',
					parent_title: 'Work Notebook',
					tags: ['urgent'],
					date: today,
					completed: false,
				}),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({
					category: ['work'],
					tags: ['urgent'],
					date: 'Today',
					completed: 'None',
				}),
				activeHistory: [],
				checked,
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos).toHaveLength(1);
			expect(result.active.todos[0].key).toBe('should-match');
		});
	});

	describe('date overrides', () => {
		test('applies dateOverride filter', () => {
			const { today } = dateFixtures.present;
			const { tomorrow } = dateFixtures.future;

			const todos = [
				createTodo({ key: 'today', date: today, category: 'work' }),
				createTodo({ key: 'tomorrow', date: tomorrow, category: 'personal' }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({
					category: ['work'],
					dateOverride: 'Tomorrow',
				}),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			const keys = result.active.todos.map(t => t.key);
			expect(keys).toContain('today');
			expect(keys).toContain('tomorrow');
		});

		test('dateOverride adds additional todos to filtered results', () => {
			const { today } = dateFixtures.present;
			const nextWeek = mockNow.plus({ days: 7 }).toISODate();

			const todos = [
				createTodo({ key: 'work-today', date: today, category: 'work' }),
				createTodo({ key: 'personal-nextweek', date: nextWeek, category: 'personal' }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({
					category: ['work'],
					dateOverride: '1 week',
				}),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos).toHaveLength(2);
			const keys = result.active.todos.map(t => t.key);
			expect(keys).toContain('work-today');
			expect(keys).toContain('personal-nextweek');
		});

		test('removes duplicates from overrides and main filter', () => {
			const { today } = dateFixtures.present;

			const todos = [
				createTodo({ key: 'task1', date: today, category: 'work' }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({
					category: ['work'],
					date: 'Today',
					dateOverride: 'Today',
				}),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos).toHaveLength(1);
		});
	});

	describe('counts', () => {
		test('calculates openCount correctly', () => {
			const todos = [
				createTodo({ key: 'open1', completed: false }),
				createTodo({ key: 'open2', completed: false }),
				createTodo({ key: 'completed', completed: true }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({ completed: 'All Time' }),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.openCount).toBe(2);
		});

		test('calculates totalCount correctly', () => {
			const todos = [
				createTodo({ key: 'task1', completed: false }),
				createTodo({ key: 'task2', completed: false }),
				createTodo({ key: 'task3', completed: true }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({ completed: 'All Time' }),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.totalCount).toBe(3);
		});

		test('openCount excludes completed and checked items', () => {
			const { today } = dateFixtures.present;
			const checked: Checked = {
				'checked-task': today,
			};

			const todos = [
				createTodo({ key: 'open', completed: false }),
				createTodo({ key: 'completed', completed: true }),
				createTodo({ key: 'checked-task', completed: false }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({ completed: 'All Time' }),
				activeHistory: [],
				checked,
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.openCount).toBe(1);
		});
	});

	describe('saved filters', () => {
		test('calculates counts for saved filters', () => {
			const todos = [
				createTodo({ key: 'work1', category: 'work', completed: false }),
				createTodo({ key: 'work2', category: 'work', completed: false }),
				createTodo({ key: 'personal', category: 'personal', completed: false }),
			];
			const filters: Filters = {
				saved: [
					createFilter({ filterName: 'Work Tasks', category: ['work'] }),
					createFilter({ filterName: 'Personal Tasks', category: ['personal'] }),
				],
				active: createFilter(),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.saved).toHaveLength(2);
			expect(result.saved[0].filterName).toBe('Work Tasks');
			expect(result.saved[0].openCount).toBe(2);
			expect(result.saved[1].filterName).toBe('Personal Tasks');
			expect(result.saved[1].openCount).toBe(1);
		});

		test('saved filters respect completion filter', () => {
			const { today } = dateFixtures.present;
			const checked: Checked = {
				'work-completed': today,
			};

			const todos = [
				createTodo({ key: 'work-open', category: 'work', completed: false }),
				createTodo({ key: 'work-completed', category: 'work', completed: true }),
			];
			const filters: Filters = {
				saved: [
					createFilter({
						filterName: 'Work All',
						category: ['work'],
						completed: 'All Time',
					}),
					createFilter({
						filterName: 'Work Open',
						category: ['work'],
						completed: 'None',
					}),
				],
				active: createFilter(),
				activeHistory: [],
				checked,
			};

			const result = calcFiltered(todos, filters);
			expect(result.saved[0].filterName).toBe('Work All');
			expect(result.saved[0].openCount).toBe(1);
			expect(result.saved[1].filterName).toBe('Work Open');
			expect(result.saved[1].openCount).toBe(1);
		});
	});

	describe('edge cases', () => {
		test('handles empty todo array', () => {
			const filters: Filters = {
				saved: [],
				active: createFilter(),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered([], filters);
			expect(result.active.todos).toHaveLength(0);
			expect(result.active.openCount).toBe(0);
			expect(result.active.totalCount).toBe(0);
		});

		test('handles todos with missing keys', () => {
			const todos = [
				createTodo({ key: undefined }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter(),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos).toHaveLength(1);
		});

		test('handles invalid date strings gracefully', () => {
			const todos = [
				createTodo({ key: 'invalid-date', date: 'not-a-date' }),
				createTodo({ key: 'valid-date', date: '2024-01-15' }),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter({ date: 'Today' }),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			// Invalid dates are excluded, valid past date is included in "Today" filter
			expect(result.active.todos).toHaveLength(1);
			expect(result.active.todos[0].key).toBe('valid-date');
		});

		test('handles empty filter object', () => {
			const todos = [createTodo()];
			const filters: Filters = {
				saved: [],
				active: createFilter(),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos).toHaveLength(1);
		});

		test('handles todos with all empty fields', () => {
			const todos = [
				createTodo({
					category: '',
					date: '',
					tags: [],
				}),
			];
			const filters: Filters = {
				saved: [],
				active: createFilter(),
				activeHistory: [],
				checked: {},
			};

			const result = calcFiltered(todos, filters);
			expect(result.active.todos).toHaveLength(1);
		});
	});

	describe('boundary conditions', () => {
		describe('end of day (midnight) boundaries', () => {
			test('includes todo at exact end of day for "Today" filter', () => {
				// Test that todos at 23:59:59 on the current day are included
				const endOfToday = mockNow.endOf('day');
				const todos = [
					createTodo({ key: 'end-of-day', date: endOfToday.toISODate() }),
					createTodo({ key: 'start-of-tomorrow', date: endOfToday.plus({ seconds: 1 }).toISODate() }),
				];
				const keys = getFilteredKeys(todos, { date: 'Today' });
				expect(keys).toContain('end-of-day');
				expect(keys).not.toContain('start-of-tomorrow');
			});

			test('handles todos at exact start of day (midnight)', () => {
				// Test that todos at 00:00:00 are handled correctly
				const startOfToday = mockNow.startOf('day');
				const todos = [
					createTodo({ key: 'midnight-today', date: startOfToday.toISODate() }),
				];
				const keys = getFilteredKeys(todos, { date: 'Today' });
				expect(keys).toContain('midnight-today');
			});
		});

		describe('end of week boundaries', () => {
			test('includes todo at exact end of week', () => {
				// Test that todos on the last moment of the week are included in "End of Week" filter
				const endOfWeek = mockNow.endOf('week', { useLocaleWeeks: true });
				const todos = [
					createTodo({ key: 'end-of-week', date: endOfWeek.toISODate() }),
					createTodo({ key: 'after-week', date: endOfWeek.plus({ days: 1 }).toISODate() }),
				];
				const keys = getFilteredKeys(todos, { date: 'End of Week' });
				expect(keys).toContain('end-of-week');
				expect(keys).not.toContain('after-week');
			});

			test('handles todos at exact start of week', () => {
				const startOfWeek = mockNow.startOf('week', { useLocaleWeeks: true });
				const todos = [
					createTodo({ key: 'week-start', date: startOfWeek.toISODate() }),
				];
				const keys = getFilteredKeys(todos, { date: 'End of Week' });
				expect(keys).toContain('week-start');
			});
		});

		describe('end of month boundaries', () => {
			test('includes todo at exact end of month', () => {
				// Test that todos on the last day of the month are included in "End of Month" filter
				const endOfMonth = mockNow.endOf('month');
				const todos = [
					createTodo({ key: 'end-of-month', date: endOfMonth.toISODate() }),
					createTodo({ key: 'next-month', date: endOfMonth.plus({ days: 1 }).toISODate() }),
				];
				const keys = getFilteredKeys(todos, { date: 'End of Month' });
				expect(keys).toContain('end-of-month');
				expect(keys).not.toContain('next-month');
			});

			test('handles todos at exact start of month', () => {
				const startOfMonth = mockNow.startOf('month');
				const todos = [
					createTodo({ key: 'month-start', date: startOfMonth.toISODate() }),
				];
				const keys = getFilteredKeys(todos, { date: 'End of Month' });
				expect(keys).toContain('month-start');
			});
		});

		describe('end of year boundaries', () => {
			test('includes todo at exact end of year', () => {
				// Test that todos on December 31st are included in "End of Year" filter
				const endOfYear = mockNow.endOf('year');
				const todos = [
					createTodo({ key: 'end-of-year', date: endOfYear.toISODate() }),
					createTodo({ key: 'next-year', date: endOfYear.plus({ days: 1 }).toISODate() }),
				];
				const keys = getFilteredKeys(todos, { date: 'End of Year' });
				expect(keys).toContain('end-of-year');
				expect(keys).not.toContain('next-year');
			});

			test('handles todos at exact start of year', () => {
				const startOfYear = mockNow.startOf('year');
				const todos = [
					createTodo({ key: 'year-start', date: startOfYear.toISODate() }),
				];
				const keys = getFilteredKeys(todos, { date: 'End of Year' });
				expect(keys).toContain('year-start');
			});
		});

		describe('completion date boundaries', () => {
			test('includes completed todo at exact end of today', () => {
				// Test that completed todos at 23:59:59 today are included
				const endOfToday = mockNow.endOf('day');
				const checked: Checked = {
					'end-of-day': endOfToday.toISODate(),
				};
				const todos = [
					createTodo({ key: 'end-of-day', completed: true }),
				];
				const filters: Filters = {
					saved: [],
					active: createFilter({ completed: 'Today' }),
					activeHistory: [],
					checked,
				};
				const result = calcFiltered(todos, filters);
				const completedTodos = result.active.todos.filter(t => t.completed);
				expect(completedTodos).toHaveLength(1);
			});

			test('excludes completed todo at start of next period', () => {
				// Test that completed todos at 00:00:00 tomorrow are excluded from "Today" filter
				const startOfTomorrow = mockNow.plus({ days: 1 }).startOf('day');
				const checked: Checked = {
					'tomorrow-start': startOfTomorrow.toISODate(),
				};
				const todos = [
					createTodo({ key: 'tomorrow-start', completed: true }),
				];
				const filters: Filters = {
					saved: [],
					active: createFilter({ completed: 'Today' }),
					activeHistory: [],
					checked,
				};
				const result = calcFiltered(todos, filters);
				const completedTodos = result.active.todos.filter(t => t.completed);
				expect(completedTodos).toHaveLength(0);
			});
		});
	});

	describe('invalid and malformed data', () => {
		describe('null and undefined values', () => {
			test('handles null category', () => {
				const todos = [
					createTodo({ key: 'null-category', category: null as any }),
					createTodo({ key: 'normal', category: 'work' }),
				];
				const keys = getFilteredKeys(todos, { category: ['work'] });
				expect(keys).toContain('normal');
				expect(keys).not.toContain('null-category');
			});

			test('handles undefined category', () => {
				const todos = [
					createTodo({ key: 'undefined-category', category: undefined as any }),
					createTodo({ key: 'normal', category: 'work' }),
				];
				const keys = getFilteredKeys(todos, { category: ['work'] });
				expect(keys).toContain('normal');
				expect(keys).not.toContain('undefined-category');
			});

			test('handles null date', () => {
				const todos = [
					createTodo({ key: 'null-date', date: null as any }),
					createTodo({ key: 'normal', date: '2024-01-15' }),
				];
				const keys = getFilteredKeys(todos, { date: 'Today' });
				// Null dates should be excluded from date filters
				expect(keys).not.toContain('null-date');
			});

			test('handles undefined date', () => {
				const todos = [
					createTodo({ key: 'undefined-date', date: undefined as any }),
					createTodo({ key: 'normal', date: '2024-01-15' }),
				];
				const keys = getFilteredKeys(todos, { date: 'Today' });
				// Undefined dates should be excluded from date filters
				expect(keys).not.toContain('undefined-date');
			});

			test('handles null tags array', () => {
				const todos = [
					createTodo({ key: 'null-tags', tags: null as any }),
					createTodo({ key: 'normal', tags: ['urgent'] }),
				];
				const keys = getFilteredKeys(todos, { tags: ['urgent'] });
				expect(keys).toContain('normal');
				expect(keys).not.toContain('null-tags');
			});

			test('handles undefined tags', () => {
				const todos = [
					createTodo({ key: 'undefined-tags', tags: undefined as any }),
					createTodo({ key: 'normal', tags: ['urgent'] }),
				];
				const keys = getFilteredKeys(todos, { tags: ['urgent'] });
				expect(keys).toContain('normal');
				expect(keys).not.toContain('undefined-tags');
			});
		});

		describe('special characters in fields', () => {
			test('handles special characters in category names', () => {
				const specialCategories = [
					'@work',
					'#urgent',
					'high-priority!',
					'50% done',
					'café ☕',
					'testing/debug',
					'<script>alert("xss")</script>',
					'category with\nnewline',
					'category\twith\ttabs',
				];

				specialCategories.forEach((category, index) => {
					const todos = [
						createTodo({ key: `special-${index}`, category }),
					];
					const keys = getFilteredKeys(todos, { category: [category] });
					expect(keys).toContain(`special-${index}`);
				});
			});

			test('handles special characters in tags', () => {
				const specialTags = [
					'@mention',
					'#hashtag',
					'emoji-🚀',
					'quote"tag',
					"single'quote",
					'slash/tag',
					'percent%20',
				];

				specialTags.forEach((tag, index) => {
					const todos = [
						createTodo({ key: `tag-${index}`, tags: [tag] }),
					];
					const keys = getFilteredKeys(todos, { tags: [tag] });
					expect(keys).toContain(`tag-${index}`);
				});
			});

			test('handles Unicode and emoji in various fields', () => {
				const todos = [
					createTodo({
						key: 'unicode-test',
						category: '工作',
						tags: ['紧急', '重要'],
						note_title: '会议笔记 📝',
						parent_title: 'Тетрадь',
					}),
				];
				const keys = getFilteredKeys(todos, {
					category: ['工作'],
					tags: ['紧急'],
				});
				expect(keys).toContain('unicode-test');
			});
		});

		describe('empty arrays vs undefined', () => {
			test('empty tags array behaves differently from undefined', () => {
				const todos = [
					createTodo({ key: 'empty-tags', tags: [] }),
					createTodo({ key: 'undefined-tags', tags: undefined as any }),
					createTodo({ key: 'has-tags', tags: ['urgent'] }),
				];

				// With no tag filter, all should be included
				const allKeys = getFilteredKeys(todos, {});
				expect(allKeys).toHaveLength(3);

				// With tag filter, only matching tags should be included
				const filteredKeys = getFilteredKeys(todos, { tags: ['urgent'] });
				expect(filteredKeys).toContain('has-tags');
				expect(filteredKeys).not.toContain('empty-tags');
				expect(filteredKeys).not.toContain('undefined-tags');
			});

			test('empty filter arrays vs undefined filter arrays', () => {
				const todos = [
					createTodo({ key: 'work', category: 'work' }),
					createTodo({ key: 'personal', category: 'personal' }),
				];

				// Empty array filter should return all todos
				const emptyFilterKeys = getFilteredKeys(todos, { category: [] });
				expect(emptyFilterKeys).toHaveLength(2);

				// Undefined should also return all todos (same as empty array)
				const undefinedFilterKeys = getFilteredKeys(todos, { category: undefined as any });
				expect(undefinedFilterKeys).toHaveLength(2);
			});
		});

		describe('malformed date strings', () => {
			test('handles various invalid date formats', () => {
				const invalidDates = [
					'not-a-date',
					'2024-13-01', // Invalid month
					'2024-01-32', // Invalid day
					'2024/01/15', // Wrong separator
					'01-15-2024', // Wrong order
					'2024-1-1',   // Missing leading zeros
					'',           // Empty string
					' ',          // Whitespace
					'null',       // String "null"
					'undefined',  // String "undefined"
				];

				invalidDates.forEach((invalidDate, index) => {
					const todos = [
						createTodo({ key: `invalid-${index}`, date: invalidDate }),
						createTodo({ key: `valid-${index}`, date: '2024-01-15' }),
					];
					const keys = getFilteredKeys(todos, { date: 'Today' });
					expect(keys).not.toContain(`invalid-${index}`);
					expect(keys).toContain(`valid-${index}`);
				});
			});

			test('handles partial ISO dates (accepted by Luxon)', () => {
				// Luxon accepts partial ISO dates like '2024-01' (January 2024) or '2024' (year 2024)
				const partialDates = [
					'2024-01',    // January 2024 (interpreted as 2024-01-01)
					'2024',       // Year 2024 (interpreted as 2024-01-01)
				];

				partialDates.forEach((partialDate, index) => {
					const todos = [
						createTodo({ key: `partial-${index}`, date: partialDate }),
					];
					const keys = getFilteredKeys(todos, { date: 'All' });
					// Partial dates are valid and should be included
					expect(keys).toContain(`partial-${index}`);
				});
			});

			test('handles extremely long date strings', () => {
				const longDate = '2024-01-15'.repeat(100);
				const todos = [
					createTodo({ key: 'long-date', date: longDate }),
					createTodo({ key: 'valid', date: '2024-01-15' }),
				];
				const keys = getFilteredKeys(todos, { date: 'Today' });
				expect(keys).not.toContain('long-date');
				expect(keys).toContain('valid');
			});
		});

		describe('extreme values', () => {
			test('handles very long category names', () => {
				const longCategory = 'a'.repeat(10000);
				const todos = [
					createTodo({ key: 'long-cat', category: longCategory }),
				];
				const keys = getFilteredKeys(todos, { category: [longCategory] });
				expect(keys).toContain('long-cat');
			});

			test('handles very long tag names', () => {
				const longTag = 'tag-' + 'x'.repeat(10000);
				const todos = [
					createTodo({ key: 'long-tag', tags: [longTag] }),
				];
				const keys = getFilteredKeys(todos, { tags: [longTag] });
				expect(keys).toContain('long-tag');
			});

			test('handles very large arrays of tags', () => {
				const manyTags = Array.from({ length: 1000 }, (_, i) => `tag${i}`);
				const todos = [
					createTodo({ key: 'many-tags', tags: manyTags }),
				];
				const keys = getFilteredKeys(todos, { tags: ['tag500'] });
				expect(keys).toContain('many-tags');
			});

			test('handles very large filter arrays', () => {
				const manyCategories = Array.from({ length: 1000 }, (_, i) => `category${i}`);
				const todos = [
					createTodo({ key: 'match', category: 'category500' }),
					createTodo({ key: 'no-match', category: 'other' }),
				];
				const keys = getFilteredKeys(todos, { category: manyCategories });
				expect(keys).toContain('match');
				expect(keys).not.toContain('no-match');
			});
		});
	});
});
