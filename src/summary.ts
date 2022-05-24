import joplin from 'api';
import { Settings, Todo, Summary } from './types';
import { summaries } from './settings_tables';

export async function update_summary(summary_map: Summary, settings: Settings, summary_id: string, old_body: string) {
	let bodyFunc = summaries[settings.summary_type].func;

	const summaryBody = await bodyFunc(summary_map, settings);
	await setSummaryBody(summaryBody, summary_id, old_body, settings);
}

async function setSummaryBody(summaryBody: string, summary_id: string, old_body: string, settings: Settings) {
	// Preserve the content after the hr
	let spl = old_body.split(/<!-- inline-todo-plugin -->/gm);
	spl[0] = summaryBody;
	const body = spl.join("\n<!-- inline-todo-plugin -->");

	// Only update the note if it actually changed...
	if (old_body === body) { return; }

	// https://github.com/laurent22/joplin/issues/5955
	const currentNote = await joplin.workspace.selectedNote();
	if (currentNote.id == summary_id) {
		await joplin.commands.execute('editor.setText', body);
	}

	await joplin.data.put(['notes', summary_id], null, { body: body });

	if (settings.force_sync) {
		await joplin.commands.execute('synchronize');
	}
}
