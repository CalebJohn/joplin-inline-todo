export interface Note {
	id: string;
	body: string;
	title: string;
	parent_id: string;
	is_conflict: boolean;
}

// ScrollToTextValue not exported by Joplin
interface ScrollToTextValue {
	text: string;
	element: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'strong' | 'ul';
	// I don't use scrollStrategy so leaving it out for simplicity
	// scrollStrategy?: ScrollStrategy;
}

export interface Todo {
	note: string;
	note_title: string;
	parent_id: string;
	parent_title: string;
	msg: string;
	category: string;
	date: string;
	tags: string[];
	completed: boolean;
	description: string;
	scrollTo: ScrollToTextValue;
	key?: string;
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
	category: (s: string[]) => string;
	date: (s: string[]) => string;
	tags: (s: string[]) => string[];
	description: (s: string[]) => string;
	completed: (s: string[]) => boolean;
	toggle: Toggle;
	completed_query: string;
	scrollToText: (s: string[]) => object; // joplin ScrollToTextValue
}

export interface Settings {
	summary_id?: string;
	scan_period_s: number;
	scan_period_c: number;
	todo_type: RegexEntry;
	summary_type: string;
	sort_by: string;
	force_sync: boolean;
	show_complete_todo: boolean;
	auto_refresh_summary: boolean;
	custom_editor: boolean;
}

export interface TitleEntry {
	title: string;
}

interface SummaryMeta {
	lastRefresh: Date;
}

export type SummaryMap = Record<string, Todo[]>;

export interface Summary {
	meta: SummaryMeta;
	map: SummaryMap;
}

export type DateFilter = string;
export type CompletedFilter = string;

export interface Filter {
	filterName: string;
	note: string[];
	parent_id: string[];
	msg: string[]; // message contains
	category: string[];
	date: DateFilter;
	dateOverride: DateFilter; // Should be replaced by generic overrides eventually
	tags: string[];
	completed: CompletedFilter;
}

// { key: date string }
export type Checked = Record<string, string>;

export interface Filters {
	saved: Filter[];
	active: Filter;
	activeHistory: Filter[];
	checked: Checked;
}

export interface ActiveFiltered {
	openCount: number;
	totalCount: number;
	todos: Todo[];
}

export interface SavedItem {
	filterName: string;
	openCount: number;
}

export interface Filtered {
	saved: SavedItem[];
	active: ActiveFiltered;
}

export interface UniqueFields {
	note: string[];
	parent_id: string[];
	category: string[];
	tags: string[];
}

// IPC and webview types copied from 
// https://github.com/joplin/plugin-yesyoukan/blob/master/src/utils/types.ts
export type IpcMessageType =
	'getFilters' |
	'setFilters' |
	'getSettings' |
	'getSummary' |
	'updateSummary' |
	'markDone' |
	'jumpTo' |
	'shouldUseDarkColors';

export interface IpcMessage {
	type: IpcMessageType;
	value?: any;
}

export interface OnMessageMessage {
	message: IpcMessage;
}

type WebviewApiOnMessageHandler = (message:OnMessageMessage) => void;

export interface WebviewApi {
	postMessage<T>(message:IpcMessage): Promise<T>;
	onMessage(handler:WebviewApiOnMessageHandler);
	menuPopupFromTemplate(template:any[]);
}
