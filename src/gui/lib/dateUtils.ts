import { DateTime } from "luxon";
import { Todo } from "../../types"

// without a timezone, dates will be interpreted as UTC.
// We do the below trickery so that the local date is handled as local
export function localDate(todo_date: string): Date {
	const date = new Date(todo_date);
	// Convert date into local time, this works because... javascript
	return new Date(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate()
	);
}

// Return a luxon DateTime from the todo.date
export function localDateTime(todo_date: string): DateTime {
	return DateTime.fromJSDate(localDate(todo_date));
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
