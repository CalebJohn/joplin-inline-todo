import joplin from 'api';
import { Note, Summary} from './types';

const summary_regex = /<!-- inline-todo-plugin(.*)-->/gm;

function summaryString(notebooks: string): string {
	const summary_string = `\n<!-- inline-todo-plugin${notebooks}-->`;

	return summary_string;
}

export async function createSummaryNote() {
	const par = await joplin.workspace.selectedFolder()
	await joplin.data.post(['notes'], null, {title: 'Todo Summary', parent_id: par.id, body: summaryString(' ')})
			.catch((error) => {
				console.error(error);
				console.warn("Could not create summary note with api in notebook: " + par.id);
			});
}

export function insertNewSummary(old_body: string, summaryBody: string): string {
	// Preserve the content after the hr
	let spl = old_body.split(summary_regex);
	spl[0] = summaryBody;
	// preserve the custom filters
	spl[1] = summaryString(spl[1]);
	return spl.join('');
}

export function filterSummaryCategories(body: string, summary_map: Summary): Summary {
	summary_regex.lastIndex = 0;
	const match = summary_regex.exec(body);
	if (match === null) {
		console.error("filterSummaryCategories called on a note with no summary comment");
		console.error(body);
		// This would be a bug if it happens but ¯\_(ツ)_/¯
		return summary_map;
	}
	const notebook_string = match[1].trim();

	// No filtering necessary
	if (!notebook_string) { return summary_map; }


	// notebooks is a string with notebook names seperated by whitespace.
	// If the name itself contains a whitespace, the notebook name will have quotes
	// So we'll have to hand off the parsing to an actual parser
	const notebooks = parseNotebookNames(notebook_string);

	let new_summary: Summary = {};
	for (const [id, todos] of Object.entries(summary_map)) {
		const entry = todos.filter(todo => notebooks.includes(todo.parent_title));
		if (entry.length > 0) {
			new_summary[id] = entry;
		}
	}

	return new_summary;
}

function parseNotebookNames(nbs: string): string[] {
	let parsed = [];
	let acc = '';
	let in_quote = false;
	for (let i = 0; i < nbs.length; i++) {
		const ct = nbs[i];

		if (ct === ' ' && !in_quote) {
			parsed.push(acc);
			acc = '';
		}
		else if (ct === '"') {
			in_quote = !in_quote;
		}
		else {
			acc += ct;
		}
	}

	parsed.push(acc);

	return parsed;
}

export function isSummary(currentNote: Note): boolean {
	return !!currentNote?.body.match(summary_regex);
}
