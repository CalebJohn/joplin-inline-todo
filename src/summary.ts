import joplin from 'api';
import { Settings, Summary } from './types';
import { summaries } from './settings_tables';
import { insertNewSummary, filterSummaryCategories } from './summary_note';

export async function update_summary(summary_map: Summary, settings: Settings, summary_id: string, old_body: string) {
	let bodyFunc = summaries[settings.summary_type].func;

	// Use the summary special comment to filter the todos for this summary note
	const filtered_map = filterSummaryCategories(old_body, summary_map);

	const summaryBody = await bodyFunc(filtered_map, settings);
	await setSummaryBody(summaryBody, summary_id, old_body, settings);
}

async function setSummaryBody(summaryBody: string, summary_id: string, old_body: string, settings: Settings) {
	const body = insertNewSummary(old_body, summaryBody);

	// Only update the note if it actually changed...
	if (old_body === body) { return; }

	// https://github.com/laurent22/joplin/issues/5955
	const currentNote = await joplin.workspace.selectedNote();
	if (currentNote.id == summary_id) {
		await joplin.commands.execute('editor.setText', body);
	}

	await joplin.data.put(['notes', summary_id], null, { body: body })
			.catch((error) => {
				console.error(error);
				console.warn("Could not update summary note with api: " + summary_id);
			});

	if (settings.force_sync) {
		await joplin.commands.execute('synchronize');
	}
}

