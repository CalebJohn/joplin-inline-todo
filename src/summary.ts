import joplin from 'api';
import { Settings, Summary } from './types';
import { summaries } from './settings_tables';
import { insertNewSummary, filterSummaryCategories } from './summary_note';
// import { icalBlock } from './ical';

export async function update_summary(summary: Summary, settings: Settings, summary_id: string, old_body: string) {
	const bodyFunc = summaries[settings.summary_type].func;

	// Use the summary special comment to filter the todos for this summary note
	const filtered_map = filterSummaryCategories(old_body, summary);

	const summaryBody = await bodyFunc(filtered_map, settings);

	// if (settings.add_ical_block) {
	// 	summaryBody += icalBlock(filtered_map, settings);
	// }

	await setSummaryBody(summaryBody, summary_id, old_body, settings);
}

// Joplin throws "Cannot execute a command without a runtime" when a command is registered
// but the component that provides it isn't currently mounted
async function setSummaryBody(summaryBody: string, summary_id: string, old_body: string, settings: Settings) {
	const body = insertNewSummary(old_body, summaryBody);

	// Only update the note if it actually changed...
	if (old_body === body) { return; }

	// if (settings.add_ical_block) {
	// 	// UIDs in the ical block change with each generation, so need to compare without them
	// 	// TODO: When I make the UIDs stable, this can be removed
	// 	if (old_body.replace(/```ical[\s\S]*```/, '') === body.replace(/```ical[\s\S]*```/, '')) { return; }
	// }

	// https://github.com/laurent22/joplin/issues/5955
	const currentNote = await joplin.workspace.selectedNote();
	// Don't immediately swap the text when the custom_editor is enabled, it's not necessary
	// and can cause unrelated notes to be overwritten in some situations
	// https://github.com/laurent22/joplin/issues/11721
	if (!settings.custom_editor && currentNote && currentNote.id == summary_id) {
		try {
			await joplin.commands.execute('editor.setText', body);
		} catch (error) {
			// editor.setText only has a runtime while a note editor is mounted for the note
			// (on mobile that means the note is open in the editor, the viewer and every other
			// screen leave the command without a runtime). Joplin throws in that case, it's an
			// expected condition and the api call below is what updates the note.
			// https://github.com/CalebJohn/joplin-inline-todo/issues/61
			// Notably, this must not be logged with console.error: Joplin marks a plugin as
			// having errors (and shows an error indicator on the plugin's settings page) when
			// it logs anything at error level.
			if (!String(error).includes('Cannot execute a command without a runtime')) {
				console.error(error);
				console.warn("Could not update summary note with editor.setText: " + summary_id);
			}
		}
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
