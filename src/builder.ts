import joplin from 'api';
import { Note, Settings, Todo, Summary } from './types';

export class SummaryBuilder {
	_summary: Summary = {};
	// Maps folder ids to folder name
	// Record<id, name>
	_folders: Record<string, string> = {};
	// Don't overwrite the summary note unless all notes have been checked
	_initialized: boolean = false;
	// The plugin settings
	_settings: Settings;

	constructor (s: Settings) {
		this._settings = s;
	}

	async search_in_note(note: Note): Promise<boolean> {
		// Conflict notes are duplicates usually
		if (note.is_conflict) { return; }
		let matches = [];
		console.log("search in note " + note.title);
		console.log(note);
		// This introduces a small risk of a race condition
		// (If this is waiting, the note.body could become stale, but this function would
		// continue anyways and update the summary with stale data)
		// I don't think this will be an issue in practice, and if it does crop up
		// there won't be any data loss
		let folder = await this.get_parent_title(note.parent_id);
		console.log(note.title + " is in folder " + folder);
		let match;
		const todo_type = this._settings.todo_type;
		while ((match = todo_type.regex.exec(note.body)) !== null) {
			matches.push({
				note: note.id,
				note_title: note.title,
				parent_id: note.parent_id,
				parent_title: folder,
				msg: todo_type.msg(match),
				assignee: todo_type.assignee(match),
				date: todo_type.date(match),
				tags: todo_type.tags(match),
				completed: todo_type.completed_regex.test(match)
			});
		}

		if (matches.length > 0 || this._summary[note.id]?.length > 0) {
			// Check if the matches actually changed
			const dirty = JSON.stringify(this._summary[note.id]) != JSON.stringify(matches);

			this._summary[note.id] = matches;

			return dirty;
		}

		return false;
	}

	async search_with_query(query: string) {
		let page = 0;
		let r;
		do {
			page += 1;
			// I don't know how the basic search is implemented, it could be that it runs a regex
			// query on each note under the hood. If that is the case and this behaviour crushed
			// some slow clients, I should consider reverting this back to searching all notes
			// (with the rate limiter)
			r = await joplin.data.get(['search'], { query: query,  fields: ['id', 'body', 'title', 'parent_id', 'is_conflict'], page: page });
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
	}

	// Reads a parent title from cache, or uses the joplin api to get a title based on id
	async get_parent_title(id: string): Promise<string> {
		if (!(id in this._folders)) {
			console.log("Looking for name of folder with id: " + id);
			// it looks like the following joplin.data call doesn't always resolve, to test, we
			// will use a race
			let unknown_folder = "Unknown Folder";
			let api_call = Promise.race([
				joplin.data.get(['folders', id], { fields: ['title'] }),
				new Promise((resolve, reject) => setTimeout(resolve, 1000, unknown_folder)),
			]);

			let f = await api_call;

			if (f.title === unknown_folder) {
				console.warn("Could not find folder title for id: " + id);
			}

			this._folders[id] = f.title;
			console.log("Found name of folder with id: " + id + " to be: " + f.title);
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
