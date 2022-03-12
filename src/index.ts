import joplin from 'api';
import { MenuItemLocation, SettingItemType } from 'api/types';
import { SummaryBuilder } from './builder';
import { Note, Settings, Todo } from './types';
import { update_summary } from './summary';
import { regexes, regexTitles, summaryTitles } from './settings_tables';


async function getSettings(): Promise<Settings> {
	return {
		scan_period_s: await joplin.settings.value('scanPeriod'),
		scan_period_c: await joplin.settings.value('scanPeriodRequestCount'),
		todo_regex: regexes[await joplin.settings.value('regexType')].regex,
		summary_type: await joplin.settings.value('summaryType'),
		summary_id: await joplin.settings.value('summaryNoteId'),
	};
}

joplin.plugins.register({
	onStart: async function() {
		await joplin.settings.registerSection('settings.calebjohn.todo', {
			label: 'Inline TODO',
			iconName: 'fa fa-check'
		});
		await joplin.settings.registerSettings({
			'summaryNoteId': {
				value: '',
				type: SettingItemType.String,
				section: 'settings.calebjohn.todo',
				public: false,
				label: '',
			},
			'regexType': {
				value: 'list',
				type: SettingItemType.String,
				isEnum: true,
				options: regexTitles,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				label: 'Choose the inline TODO style (default is recommended)',
			},
			'summaryType': {
				value: 'plain',
				type: SettingItemType.String,
				isEnum: true,
				options: summaryTitles,
				section: 'settings.calebjohn.todo',
				public: true,
				label: 'Choose a Summary Note Format. Check the project page for examples',
			},
			'scanPeriod': {
				value: 1,
				type: SettingItemType.Int,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				minimum: 0,
				maximum: 99,
				step: 1,
				label: 'Scan Period',
			},
			'scanPeriodRequestCount': {
				value: 8,
				type: SettingItemType.Int,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				minimum: 1,
				maximum: 999999,
				step: 1,
				label: 'Scan Period Allowed Requests',
			},
		});

		const builder = new SummaryBuilder();
		// Make sure everything is up to date on start
		// This is purposefully run in the background 
		builder.check_all(await getSettings());

		let prevNote = await joplin.workspace.selectedNote();
		let noteDirty = false;

		await joplin.settings.onChange(async (event) => {
			if (event.keys.includes('regexType')) {
				// This is purposefully run in the background 
				builder.check_all(await getSettings());
			} else if (event.keys.includes('summaryType')) {
				await update_summary(builder.summary, await getSettings());
			}
		});

		await joplin.workspace.onNoteChange(async (_event) => {
			noteDirty = true;
			prevNote = await joplin.workspace.selectedNote();
		});
		await joplin.workspace.onSyncComplete(async () => {
			// This is purposefully run in the background 
			builder.check_all(await getSettings());
		});
		await joplin.workspace.onNoteSelectionChange(async () => {
			if (noteDirty) {
				noteDirty = false;
				const settings = await getSettings();
				await builder.search_in_note(prevNote, settings);
			}
		});
	},
});
