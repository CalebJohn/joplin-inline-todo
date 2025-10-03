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
	description: string;
	scrollTo: object; // joplin ScrollToTextValue
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

// Record<string, Todo[]>;
export type Summary = Record<string, Todo[]>;

// IPC and webview types copied from 
// https://github.com/joplin/plugin-yesyoukan/blob/master/src/utils/types.ts
export type IpcMessageType =
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
