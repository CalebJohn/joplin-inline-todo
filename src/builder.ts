import joplin from 'api';
import { Note, Settings, Todo, Summary } from './types';
import { update_summary } from './summary';

export class SummaryBuilder {
	_summary: Summary = {};
	// Maps folder ids to folder name
	// Record<id, name>
	_folders: Record<string, string> = {};
	// Don't overwrite the summary note unless all notes have been checked
	_initialized: boolean = false;

	async search_in_note(note: Note, settings: Settings, refresh: boolean=true) {
		let matches = [];
		// This introduces a small risk of a race condition
		// (If this is waiting, the note.body could become stale, but this function would
		// continue anyways and update the summary with stale data)
		// I don't think this will be an issue in practice, and if it does crop up
		// there won't be any data loss
		let folder = await this.get_parent_title(note.parent_id);
		let match;
		while ((match = settings.todo_regex.exec(note.body)) !== null) {
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
				await update_summary(this._summary, settings);
			}
		}
	}
	
	async search_in_notes(notes: Note[], settings: Settings) {
		for (let note of notes) {
			await this.search_in_note(note, settings, false);
		}
	}

	// This function scans all notes, but it's rate limited to it from crushing Joplin
	async check_all(settings: Settings) {
		let todos = {};
		let page = 0;
		let r;
		do {
			page += 1;
			r = await joplin.data.get(['notes'], { fields: ['id', 'body', 'title', 'parent_id'], page: page });
			if (r.items) {
				await this.search_in_notes(r.items, settings);
			}
			if (r.has_more && (page % settings.scan_period_c) == 0) {
				// sleep
				await new Promise(res => setTimeout(res, settings.scan_period_s * 1000));
			}
		} while(r.has_more);

		this._initialized = true;
		await update_summary(this._summary, settings);
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
}
