
export interface Note {
	id: string;
	body: string;
	title: string;
	parent_id: string;
	is_conflict: boolean;
}

export interface Todo {
	note: string;
	note_title: string;
	parent_id: string;
	parent_title: string;
	msg: string;
	assignee: string;
	date: string;
	tags: string[];
	completed: boolean;
}

interface Toggle {
	open: string;
	closed: string;
}

interface RegexEntry {
	title: string;
	regex: RegExp;
	query: string;
	msg: (s: string[]) => string;
	assignee: (s: string[]) => string;
	date: (s: string[]) => string;
	tags: (s: string[]) => string[];
	toggle: Toggle;
	completed_query: string;
	completed_regex: RegExp;
}

export interface Settings {
	summary_id?: string;
	scan_period_s: number;
	scan_period_c: number;
	todo_type: RegexEntry;
	summary_type: string;
	force_sync: boolean;
	show_complete_todo: boolean;
	add_ical_block: boolean;
	auto_refresh_summary: boolean;
}

export interface TitleEntry {
	title: string;
}

// Record<string, Todo[]>;
export type Summary = Record<string, Todo[]>;

