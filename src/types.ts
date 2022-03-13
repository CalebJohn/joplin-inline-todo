
export interface Note {
	id: string;
	body: string;
	title: string;
	parent_id: string;
}

export interface Todo {
	note: string;
	note_title: string;
	parent_id: string;
	parent_title: string;
	msg: string;
	assignee: string;
	date?: string;
}

interface RegexEntry {
	title: string;
	regex: RegExp;
	query: string;
}

export interface Settings {
	summary_id?: string;
	scan_period_s: number;
	scan_period_c: number;
	todo_type: RegexEntry;
	summary_type: string;
}

export interface TitleEntry {
	title: string;
}

// Record<string, Todo[]>;
export type Summary = Record<string, Todo[]>;


// Copied from api/JoplinWorkspace.d
export enum ItemChangeEventType {
    Create = 1,
    Update = 2,
    Delete = 3
}
// Copied from api/JoplinWorkspace.d
export interface ItemChangeEvent {
    id: string;
    event: ItemChangeEventType;
}
