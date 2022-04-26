import joplin from 'api';
import { MenuItemLocation, SettingItemType } from 'api/types';
import { SummaryBuilder } from './builder';
import { Note, Settings, Todo } from './types';
import { update_summary } from './summary';
import { regexes, regexTitles, summaryTitles } from './settings_tables';
import { create_summary_note } from './summary_note';


async function getSettings(): Promise<Settings> {
	return {
		scan_period_s: await joplin.settings.value('scanPeriod'),
		scan_period_c: await joplin.settings.value('scanPeriodRequestCount'),
		todo_type: regexes[await joplin.settings.value('regexType')],
		summary_type: await joplin.settings.value('summaryType'),
	};
}

joplin.plugins.register({
	onStart: async function() {
		await joplin.settings.registerSection('settings.calebjohn.todo', {
			label: 'Inline TODO',
			iconName: 'fa fa-check'
		});
		await joplin.settings.registerSettings({
			'regexType': {
				value: 'list',
				type: SettingItemType.String,
				isEnum: true,
				options: regexTitles,
				section: 'settings.calebjohn.todo',
				public: true,
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
				value: 11,
				type: SettingItemType.Int,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				minimum: 0,
				maximum: 99,
				step: 1,
				label: 'Scan Period (how long to wait between bursts of scanning)',
			},
			'scanPeriodRequestCount': {
				value: 180,
				type: SettingItemType.Int,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				minimum: 1,
				maximum: 200,
				step: 1,
				label: 'Scan Period Allowed Requests (how many requests to make before taking a rest)',
			},
		});

		await joplin.commands.register({
			name: "inlineTodo.createSummaryNote",
			label: "Create TODO summary note",
			execute: async () => {
				await create_summary_note();
			},
		});

		await joplin.views.menuItems.create(
			"createSummaryNoteMenuTools",
			"inlineTodo.createSummaryNote",
			MenuItemLocation.Tools
		);

		const builder = new SummaryBuilder(await getSettings());

		await joplin.settings.onChange(async (event) => {
			builder.settings = await getSettings();
		});

		await joplin.workspace.onNoteSelectionChange(async () => {
			const currentNote = await joplin.workspace.selectedNote()
			if (currentNote.body.match(/<!-- inline-todo-plugin -->/gm)) {
				await builder.search_in_all();
				update_summary(builder.summary, builder.settings, currentNote.id);
			}
		});
	},
});
