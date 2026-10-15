import { DateTime } from "luxon";
import { Todo } from "../../types"

// A todo date is a civil date (a calendar day), not an instant.
// The builtin `new Date(str)` parses some formats as UTC (e.g. "2024-01-15")
// and others as local time (e.g. "2026/10/14", "March 5, 2025"), so reading
// components back off the result is ambiguous and timezone dependent.
//
// Instead we parse *and* read the components in the same zone, so no implicit
// conversion can shift the day. Parsing in UTC is arbitrary but consistent.
const DATE_FORMATS = [
	'yyyy-MM-dd',
	'yyyy-M-d',
	'yyyy/M/d',
	'M/d/yyyy',
	'M-d-yyyy',
	'M/d/yy',
	'MMMM d, yyyy',
	'MMM d, yyyy',
];

// Parse the date written in the string into a DateTime whose parse zone and
// read zone are both UTC. Returns null when the string is not a valid date.
function parseCivil(todo_date: string): DateTime | null {
	const s = (todo_date ?? '').trim();
	if (!s) { return null; }

	// ISO is the common case and also accepts partial dates ("2024-01", "2024")
	const iso = DateTime.fromISO(s, { zone: 'utc' });
	if (iso.isValid) { return iso; }

	for (const format of DATE_FORMATS) {
		const parsed = DateTime.fromFormat(s, format, { zone: 'utc', locale: 'en' });
		if (parsed.isValid) { return parsed; }
	}

	return null;
}

// Return a luxon DateTime at local midnight on the civil date written in the
// string. Invalid dates return an invalid DateTime (check `.isValid`).
export function localDateTime(todo_date: string): DateTime {
	const civil = parseCivil(todo_date);
	if (!civil) { return DateTime.invalid('Unparseable todo date: ' + todo_date); }
	return DateTime.fromObject({ year: civil.year, month: civil.month, day: civil.day });
}

export function localDate(todo_date: string): Date {
	const date = localDateTime(todo_date);
	return date.isValid ? date.toJSDate() : new Date(NaN);
}

export function formatDate(todo_date: string) {
	const now: Date = new Date();
	const date: Date = localDate(todo_date);
	const diffms: number = now.valueOf() - date.valueOf();
	const diffDays = Math.floor(diffms / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		return 'Today';
	} else if (diffDays === 1) {
		return 'Yesterday';
	} else if (diffDays === -1) {
		return 'Tomorrow';
	} else if (diffDays > 1) {
		return `${diffDays} days ago`;
	} else if (diffDays < -1 && diffDays > -11) {
		return `${-diffDays} days`;
	}

	const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };

	if (now.getFullYear() === date.getFullYear()) {
		options.year = undefined;
	}

	return date.toLocaleDateString(undefined, options);
}

export function dateColor(todo: Todo) {
	if (todo.completed) { return 'font-medium'; }

	const now: Date = new Date();
	const date: Date = localDate(todo.date);
	const diffms: number = now.valueOf() - date.valueOf();
	const diffDays = Math.floor(diffms / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		return 'font-medium text-warn';
	} else if (diffDays > 0) {
		return 'font-medium text-destructive';
	} else if (diffDays < 0) {
		return 'text-foreground';
		// return 'text-correct';
	}

	return 'text-destructive';
}
