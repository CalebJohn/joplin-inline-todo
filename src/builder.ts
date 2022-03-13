import joplin from 'api';
import { Note, Settings, Todo, Summary, ItemChangeEvent, ItemChangeEventType } from './types';
import { update_summary } from './summary';

export class SummaryBuilder {
	_summary: Summary = {};
	// Maps folder ids to folder name
	// Record<id, name>
	_folders: Record<string, string> = {};
	// Don't overwrite the summary note unless all notes have been checked
	_initialized: boolean = false;
	// The plugin settings
	_settings: Settings;
	// cursor the the /events endpoint (used to track changed notes)
	_cursor: number = 0;

	constructor (s: Settings) {
		this._settings = s;
		this.fast_forward_events();
	}

	// Set the _cursor to be the current event
	async fast_forward_events() {
		const event = await joplin.data.get(['events']);
		this._cursor = parseInt(event.cursor);
	}

	async search_in_note(note: Note, refresh: boolean=true) {
		let matches = [];
		// This introduces a small risk of a race condition
		// (If this is waiting, the note.body could become stale, but this function would
		// continue anyways and update the summary with stale data)
		// I don't think this will be an issue in practice, and if it does crop up
		// there won't be any data loss
		let folder = await this.get_parent_title(note.parent_id);
		let match;
		while ((match = this._settings.todo_type.regex.exec(note.body)) !== null) {
			matches.push({
				note: note.id,
				note_title: note.title,
				parent_id: note.parent_id,
				parent_title: folder,
				msg: match[3],
				assignee: match[1],
				date: match[2],
			});
		}

		if (matches.length > 0 || this._summary[note.id]?.length > 0) {
			this._summary[note.id] = matches;
			if (refresh && this._initialized) {
				await update_summary(this._summary, this._settings);
			}
		}
	}

	// Update the summary looking at changed notes only (from the /events endpoint)
	async search_in_changed() {
		let events = [];
		let page = 0;
		let e;
		// Collect all recent events
		do {
			page += 1;
			e = await joplin.data.get(['events'], { fields: ['id', 'item_id', 'item_type', 'type'], cursor: this._cursor, page: page });
			events = events.concat(e.items);
		} while (e.has_more);

		// Rebuild the summary based on the events
		for (let event of events) {
			if (event.type === ItemChangeEventType.Delete) {
				delete this._summary[event.item_type];
			} else {
				const r = await joplin.data.get(['notes', event.item_id], { fields: ['id', 'body', 'title', 'parent_id'] });
				await this.search_in_note(r, false);
			}
		}

		// Refresh the summary note if there was events
		if (events.length > 0) {
			await update_summary(this._summary, this._settings);
			// Update the cursort **AFTER** the summary was written
			// otherwise we'll continually rescan the summary
			await this.fast_forward_events();
		}
	}

	// This function scans all notes, but it's rate limited to it from crushing Joplin
	async search_in_all() {
		// Because we're checking all, the current queued events will become stale, but events 
		// that happen during the scanning might not be stale, so we set a checkpoint here
		this.fast_forward_events();
		this._summary = {};
		let todos = {};
		let page = 0;
		let r;
		do {
			page += 1;
			// I don't know how the basic search is implemented, it could be that it runs a regex
			// query on each note under the hood. If that is the case and this behaviour crushed
			// some slow clients, I should consider reverting this back to searching all notes
			// (with the rate limiter)
			r = await joplin.data.get(['search'], { query: this._settings.todo_type.query,  fields: ['id', 'body', 'title', 'parent_id'], page: page });
			if (r.items) {
				for (let note of r.items) {
					await this.search_in_note(note, false);
				}
			}
			// This is a rate limiter that prevents us from pinning the CPU
			if (r.has_more && (page % this._settings.scan_period_c) == 0) {
				// sleep
				await new Promise(res => setTimeout(res, this._settings.scan_period_s * 1000));
			}
		} while(r.has_more);

		this._initialized = true;
		await update_summary(this._summary, this._settings);
	}

	// Reads a parent title from cache, or uses the joplin api to get a title based on id
	async get_parent_title(id: string): Promise<string> {
		if (!(id in this._folders)) {
			let f = await joplin.data.get(['folders', id], { fields: ['title'] });
			this._folders[id] = f.title;
		}

		return this._folders[id];
	}

	get summary(): Summary {
		return this._summary;
	}

	get settings(): Settings {
		return this._settings;
	}
	set settings(s: Settings) {
		this._settings = s;
	}
}
