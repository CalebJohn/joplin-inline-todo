import { ActiveFiltered, Checked, CompletedFilter, DateFilter, Filter, Filtered, Filters, Todo } from "../../types";
import { DateTime, Duration } from "luxon";
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: filters.ts');

function durationFromFilter(s: DateFilter): Duration {
	if (s === 'Overdue') {
		return { days: -1 };
	}
	if (s === 'Today') {
		return { days: 0 };
	}
	else if (s === 'Tomorrow') {
		return { days: 1 };
	}
	else if (s.startsWith('End of')) {
		const now = DateTime.now();
		const endOf = now.endOf(s.slice(7).toLowerCase(), { useLocaleWeeks: true });
		const days = endOf.diff(now, 'days').days;

		return { days };
	}
	else if (s.includes('month') || s.includes('week')) {
		const plural = s.endsWith('s') ? s : s + 's';
		const [value, unit] = plural.split(' ');

		return { [unit.toLowerCase()]: Number(value) };
	}
	else {
		logger.error('Unknown date filter selection: ' + s);
	}
}

function filterSingleDate(todo: Todo, duration: Duration, now: DateTime): boolean {
	if (!todo.date) { return false; }
	const dueDate = DateTime.fromISO(todo.date);

	// Check if the date is valid
	if (!dueDate.isValid) { return false; }

	const end = now.plus(duration);
	return dueDate < end;
}

function applyOverrides(todos: Todo[], overrides: DateFilter): Todo[] {
	// Until we support other overrides, this will just pass through
	return filterDate(todos, overrides);
}

function filterDate(todos: Todo[], filter: DateFilter): Todo[] {
	if (!filter) { return todos; }
	if (filter === 'All') { return todos; }
	if (filter === 'None') { return []; }
	const now = DateTime.now();
	const duration = Duration.fromObject(durationFromFilter(filter));
	return todos.filter((t) => filterSingleDate(t, duration, now));
}

function matchAny(filter: Set<string>, tags: string[]): boolean {
	return tags.some(t => filter.has(t));
}

function filterTags(todos: Todo[], filters: string[]): Todo[] {
	if (filters.length === 0) { return todos; }
	if (filters.length === 1) {
		const filter = filters[0];
		return todos.filter(t => t.tags && t.tags.indexOf(filter) >= 0);
	}

	const filterSet = new Set(filters);

	return todos.filter(t => t.tags && matchAny(filterSet, t.tags));
}

function filterStrings(todos: Todo[], filterObject: Filter, field: string): Todo[] {
	const filters: string[] = filterObject[field]

	if (!filters || filters.length === 0) { return todos; }
	if (filters.length === 1) {
		const filter = filters[0];
		return todos.filter(t => t[field] === filter);
	}

	return todos.filter(t => filters.indexOf(t[field]) !== -1);
}

function completionShortcut(todo: Todo, filter: CompletedFilter, checked: Checked, now: DateTime): boolean {
	if (filter === "None") { return false; }
	if (filter === "All Time") { return true; };
	// If this item isn't in the checked list, then it wasn't checked by this plugin,
	// and can't be shown
	if (!checked.hasOwnProperty(todo.key)) { return false; }

	const checkDate = DateTime.fromISO(checked[todo.key]);

	if (filter === "Today") {
		return now.toISODate() === checked[todo.key];
	} else if (filter === "This Week") {
		return now.hasSame(checkDate, 'week', { useLocaleWeeks: true });
	} else if (filter === "This Month") {
		return now.hasSame(checkDate, 'month', { useLocaleWeeks: true });
	} else if (filter === "This Year") {
		return now.hasSame(checkDate, 'year', { useLocaleWeeks: true });
	}

	return false;
}

function filterCompleted(todos: Todo[], filter: CompletedFilter, checked: Checked): Todo[] {
	const now = DateTime.now();

	return todos.filter(t => !t.completed || completionShortcut(t, filter, checked, now));
}

function calcSingleFilter(summary: Todo[], filter: Filter, checked: Checked): ActiveFiltered {
	const totalCount = summary.length;
	let todos = filterCompleted(summary, filter.completed, checked);

	let overrides: Todo[] = [];

	overrides = applyOverrides(todos, filter.dateOverride);

	todos = filterStrings(todos, filter, "category");
	todos = filterTags(todos, filter.tags);
	todos = filterStrings(todos, filter, "note_title");
	todos = filterStrings(todos, filter, "parent_title");
	todos = filterStrings(todos, filter, "note");
	todos = filterStrings(todos, filter, "parent_id");
	todos = filterDate(todos, filter.date);


	todos = overrides.concat(todos);
	todos = [...new Set(todos)];

	const openCount = todos.filter(t => (!t.completed && !checked.hasOwnProperty(t.key))).length;
	return { openCount, totalCount, todos };
}

function sortTodos(active: ActiveFiltered): ActiveFiltered {
	const todos = [...active.todos];
	todos.sort((a, b) => {
		if (!!a.date && !b.date) {
			return -1;
		}
		if (!a.date && !!b.date) {
			return 1;
		}
		if (!!a.date && !!b.date && (a.date !== b.date)) {
			return Date.parse(a.date) - Date.parse(b.date);
		}

		if (a.category !== b.category) {
			return a.category.localeCompare(b.category, undefined, { sensitivity: 'accent', numeric: true });
		}

		return a.parent_title.localeCompare(b.parent_title, undefined, { sensitivity: 'accent', numeric: true });
	})

	return {...active, todos: todos};
}

export default function calcFiltered(summary: Todo[], filters: Filters): Filtered {
	const saved = filters.saved.map((sf) => ({
		filterName: sf.filterName,
		openCount: calcSingleFilter(summary, sf, filters.checked).openCount
	}));
	const active = sortTodos(calcSingleFilter(summary, filters.active, filters.checked));

	return { saved, active };
}
