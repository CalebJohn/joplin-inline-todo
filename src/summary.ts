import joplin from 'api';
import { Settings, Todo, Summary } from './types';
import { summaries } from './settings_tables';

export async function update_summary(summary_map: Summary, settings: Settings) {
	let bodyFunc = summaries[settings.summary_type].func;

	const summaryBody = await bodyFunc(summary_map, settings);
	await setSummaryBody(summaryBody, settings);
}

async function setSummaryBody(summaryBody: string, settings: Settings) {
	// If we have never set a summary note before, we'll need to create one 
	// And store it's ID for future use
	if (!settings.summary_id) {
		const summaryNote = await joplin.data.post(['notes'], null, {title: 'Tasks', body: summaryBody});
		await joplin.settings.setValue('summaryNoteId', summaryNote.id);
	} else {
		// Get the current summary note so that we can preserve aspects of it
		const summaryNote = await joplin.data.get(['notes', settings.summary_id], { fields: ['body'] });
		// Preserve the content after the hr
		let spl = summaryNote.body.split(/^---/gm);
		spl[0] = summaryBody;
		const body = spl.join("\n---");
		await joplin.data.put(['notes', settings.summary_id], null, { body: body });

		// https://github.com/laurent22/joplin/issues/5955
		const currentNote = await joplin.workspace.selectedNote();
		if (currentNote.id == settings.summary_id) {
			joplin.commands.execute('editor.setText', body);
		}
	}
}
