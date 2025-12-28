import { DateTime } from 'luxon';
import { Todo, Filter, Filters } from '../types';
import { createFilter } from './factories';
import calcFiltered from '../gui/lib/filters';

/**
 * Mock "now" time for date-based tests
 */
export const mockNow = DateTime.fromISO('2024-06-15T12:00:00Z', { zone: 'utc' });

/**
 * Date fixtures for testing various date filtering scenarios
 */
export const dateFixtures = {
	past: {
		yesterday: mockNow.minus({ days: 1 }).toISODate(),
		lastWeek: mockNow.minus({ days: 7 }).toISODate(),
		tenDaysAgo: mockNow.minus({ days: 10 }).toISODate(),
		lastMonth: mockNow.minus({ days: 40 }).toISODate(),
		threeMonthsAgo: mockNow.minus({ months: 3 }).toISODate(),
		lastYear: mockNow.minus({ years: 1 }).toISODate(),
	},
	present: {
		today: mockNow.toISODate(),
	},
	future: {
		tomorrow: mockNow.plus({ days: 1 }).toISODate(),
		dayAfterTomorrow: mockNow.plus({ days: 2 }).toISODate(),
		inThreeDays: mockNow.plus({ days: 3 }).toISODate(),
		inSixDays: mockNow.plus({ days: 6 }).toISODate(),
		inEightDays: mockNow.plus({ days: 8 }).toISODate(),
		inTenDays: mockNow.plus({ days: 10 }).toISODate(),
		inFifteenDays: mockNow.plus({ days: 15 }).toISODate(),
		inTwentyDays: mockNow.plus({ days: 20 }).toISODate(),
		inFortyDays: mockNow.plus({ days: 40 }).toISODate(),
	},
	endOf: {
		week: mockNow.endOf('week', { useLocaleWeeks: true }),
		afterWeek: mockNow.endOf('week', { useLocaleWeeks: true }).plus({ days: 1 }).toISODate(),
		month: mockNow.endOf('month', { useLocaleWeeks: true }),
		afterMonth: mockNow.endOf('month', { useLocaleWeeks: true }).plus({ days: 1 }).toISODate(),
		year: mockNow.endOf('year', { useLocaleWeeks: true }),
		afterYear: mockNow.endOf('year', { useLocaleWeeks: true }).plus({ days: 1 }).toISODate(),
	},
};

/**
 * Helper function to run calcFiltered and extract todo keys from the result
 * Useful for simplified test assertions
 */
export const getFilteredKeys = (todos: Todo[], filterOverrides: Partial<Filter> = {}) => {
	const filters: Filters = {
		saved: [],
		active: createFilter(filterOverrides),
		activeHistory: [],
		checked: {},
	};
	const result = calcFiltered(todos, filters);
	return result.active.todos.map(t => t.key);
};
