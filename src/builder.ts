import joplin from 'api';
import { Note, Settings, Todo, Summary, SummaryMap } from './types';

export class SummaryBuilder {
	_summary: SummaryMap = {};
	// Maps folder ids to folder name
	// Record<id, name>
	_folders: Record<string, string> = {};
	// Don't overwrite the summary note unless all notes have been checked
	_initialized: boolean = false;
	_lastRefresh: Date = new Date();
	// The plugin settings
	_settings: Settings;

	constructor (s: Settings) {
		this._settings = s;
	}

	async search_in_note(note: Note): Promise<boolean> {
		// Conflict notes are duplicates usually
		if (note.is_conflict) { return; }
		let matches = [];
		// This introduces a small risk of a race condition
		// (If this is waiting, the note.body could become stale, but this function would
		// continue anyways and update the summary with stale data)
		// I don't think this will be an issue in practice, and if it does crop up
		// there won't be any data loss
		let folder = await this.get_parent_title(note.parent_id);
		let match;
		const todo_type = this._settings.todo_type;
		// Reset regex state to ensure clean scan even if previous execution was interrupted
		todo_type.regex.lastIndex = 0;
		while ((match = todo_type.regex.exec(note.body)) !== null) {
			matches.push({
				note: note.id,
				note_title: note.title,
				parent_id: note.parent_id,
				parent_title: folder,
				msg: todo_type.msg(match),
				category: todo_type.category(match),
				date: todo_type.date(match),
				tags: todo_type.tags(match),
				completed: todo_type.completed(match),
				description: todo_type.description(match),
				scrollTo: todo_type.scrollToText(match),
			});
		}

		if (matches.length > 0) {
			this._summary[note.id] = matches;
		}
	}

	async search_with_query(query: string) {
		let page = 0;
		let r;
		do {
			page += 1;
			r = await joplin.data.get(['search'], { query: query,  fields: ['id', 'body', 'title', 'parent_id', 'is_conflict'], page: page })
					.catch((error) => {
						console.error(error);
						console.warn("Joplin api error while searching for: " + query + " at page: " + page);
						return { items: [], has_more: false };
					});
			if (r.items) {
				for (let note of r.items) {
					await this.search_in_note(note);
				}
			}
			// This is a rate limiter that prevents us from pinning the CPU
			if (r.has_more && (page % this._settings.scan_period_c) == 0) {
				// sleep
				await new Promise(res => setTimeout(res, this._settings.scan_period_s * 1000));
			}
		} while(r.has_more);
	}

	// This function scans all notes, but it's rate limited to it from crushing Joplin
	async search_in_all() {
		this._summary = {};
		await this.search_with_query(this._settings.todo_type.query);

		// search only if show_complete_todo option is true
		if (this._settings.show_complete_todo)
		{
			// search completed todo again not to missing the note containing only completed todos
			await this.search_with_query(this._settings.todo_type.completed_query);
		}
		this._initialized = true;
		this._lastRefresh = new Date();
	}

	// Reads a parent title from cache, or uses the joplin api to get a title based on id
	async get_parent_title(id: string): Promise<string> {
		if (!(id in this._folders)) {
			let unknown_folder = "Unknown Folder";
			let f = await joplin.data.get(['folders', id], { fields: ['title'] })
					.catch((error) => {
						console.error(error);
						console.warn("Could not find folder title for id: " + id);
						return { title: unknown_folder };
					});
			this._folders[id] = f.title;
		}

		return this._folders[id];
	}

	get summary(): Summary {
		return { meta: { lastRefresh: this._lastRefresh }, map: this._summary };
	}

	get settings(): Settings {
		return this._settings;
	}
	set settings(s: Settings) {
		this._settings = s;
	}
}
