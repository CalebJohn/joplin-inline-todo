import { localDate, localDateTime, formatDate, dateColor } from './dateUtils';
import { DateTime } from 'luxon';
import { Todo } from '../../types';

// Helper to create a minimal Todo for dateColor tests
function makeTodo(overrides: Partial<Todo> = {}): Todo {
	return {
		note: '', note_title: '', parent_id: '', parent_title: '',
		msg: '', category: '', date: '', tags: [], completed: false,
		description: '', scrollTo: { text: '', element: 'ul' },
		...overrides,
	};
}

describe('localDate', () => {
	it('parses ISO date 2024-01-15 as local date', () => {
		const d = localDate('2024-01-15');
		expect(d.getFullYear()).toBe(2024);
		expect(d.getMonth()).toBe(0); // January
		expect(d.getDate()).toBe(15);
	});

	it('parses 02/20/2026', () => {
		const d = localDate('02/20/2026');
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(1); // February
		expect(d.getDate()).toBe(20);
	});

	it('parses 2024/01/15', () => {
		const d = localDate('2024/01/15');
		expect(d.getFullYear()).toBe(2024);
		expect(d.getMonth()).toBe(0);
		expect(d.getDate()).toBe(15);
	});

	it('parses 01-15-2024', () => {
		const d = localDate('01-15-2024');
		expect(d.getFullYear()).toBe(2024);
		expect(d.getMonth()).toBe(0);
		expect(d.getDate()).toBe(15);
	});

	it('parses 2024-1-1 (no leading zeros)', () => {
		const d = localDate('2024-1-1');
		expect(d.getFullYear()).toBe(2024);
		expect(d.getMonth()).toBe(0);
		expect(d.getDate()).toBe(1);
	});

	it('parses ISO string with time 2024-06-15T00:00:00.000Z', () => {
		const d = localDate('2024-06-15T00:00:00.000Z');
		expect(d.getFullYear()).toBe(2024);
		expect(d.getMonth()).toBe(5); // June
		expect(d.getDate()).toBe(15);
	});

	it('parses date string "March 5, 2025"', () => {
		const d = localDate('March 5, 2025');
		expect(d.getFullYear()).toBe(2025);
		expect(d.getMonth()).toBe(2);
		expect(d.getDate()).toBe(5);
	});

	it('parses 12/31/2025 (end of year)', () => {
		const d = localDate('12/31/2025');
		expect(d.getFullYear()).toBe(2025);
		expect(d.getMonth()).toBe(11);
		expect(d.getDate()).toBe(31);
	});
});

describe('localDateTime', () => {
	it('returns a luxon DateTime matching the local date', () => {
		const dt = localDateTime('2024-03-10');
		expect(dt.year).toBe(2024);
		expect(dt.month).toBe(3);
		expect(dt.day).toBe(10);
	});
});

describe('formatDate', () => {
	const realDate = Date;

	function mockDate(isoStr: string) {
		const fixed = new realDate(isoStr);
		jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
			if (args.length === 0) return fixed;
			// @ts-ignore
			return new realDate(...args);
		});
	}

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('returns "Today" for today\'s date', () => {
		mockDate('2024-06-15T12:00:00');
		expect(formatDate('2024-06-15')).toBe('Today');
	});

	it('returns "Yesterday" for yesterday', () => {
		mockDate('2024-06-15T12:00:00');
		expect(formatDate('2024-06-14')).toBe('Yesterday');
	});

	it('returns "Tomorrow" for tomorrow', () => {
		mockDate('2024-06-15T12:00:00');
		expect(formatDate('2024-06-16')).toBe('Tomorrow');
	});

	it('returns "X days ago" for past dates', () => {
		mockDate('2024-06-15T12:00:00');
		expect(formatDate('2024-06-12')).toBe('3 days ago');
	});

	it('returns "X days" for near future dates (2-10 days)', () => {
		mockDate('2024-06-15T12:00:00');
		expect(formatDate('2024-06-20')).toBe('5 days');
	});

	it('returns formatted date for far future dates (>10 days)', () => {
		mockDate('2024-06-15T12:00:00');
		const result = formatDate('2024-07-15');
		// Should be a locale-formatted date without year (same year)
		expect(result).toBeTruthy();
		expect(result).not.toMatch(/days/);
	});

	it('includes year for dates in a different year', () => {
		mockDate('2024-06-15T12:00:00');
		const result = formatDate('2025-06-15');
		expect(result).toMatch(/2025/);
	});
});

describe('dateColor', () => {
	const realDate = Date;

	function mockDate(isoStr: string) {
		const fixed = new realDate(isoStr);
		jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
			if (args.length === 0) return fixed;
			// @ts-ignore
			return new realDate(...args);
		});
	}

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('returns "font-medium" for completed todos', () => {
		expect(dateColor(makeTodo({ completed: true, date: '2024-01-01' }))).toBe('font-medium');
	});

	it('returns warn color for today', () => {
		mockDate('2024-06-15T12:00:00');
		expect(dateColor(makeTodo({ date: '2024-06-15' }))).toBe('font-medium text-warn');
	});

	it('returns destructive color for overdue', () => {
		mockDate('2024-06-15T12:00:00');
		expect(dateColor(makeTodo({ date: '2024-06-10' }))).toBe('font-medium text-destructive');
	});

	it('returns foreground color for future dates', () => {
		mockDate('2024-06-15T12:00:00');
		expect(dateColor(makeTodo({ date: '2024-06-20' }))).toBe('text-foreground');
	});
});
