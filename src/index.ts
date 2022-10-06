import joplin from 'api';
import {ContentScriptType, MenuItem, MenuItemLocation, SettingItemType} from 'api/types';
import { SummaryBuilder } from './builder';
import { Settings } from './types';
import { isSummary, update_summary } from './summary';
import { mark_current_line_as_done } from './mark_todo';
import { regexes, regexTitles, summaryTitles } from './settings_tables';
import { create_summary_note } from './summary_note';


async function getSettings(): Promise<Settings> {
	return {
		scan_period_s: await joplin.settings.value('scanPeriod'),
		scan_period_c: await joplin.settings.value('scanPeriodRequestCount'),
		todo_type: regexes[await joplin.settings.value('regexType')],
		summary_type: await joplin.settings.value('summaryType'),
		force_sync: await joplin.settings.value('forceSync'),
		show_complete_todo: await joplin.settings.value('showCompletetodoitems'),
		
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
				label: 'Scan Period (how many seconds to wait between bursts of scanning)',
			},
			'scanPeriodRequestCount': {
				value: 960,
				type: SettingItemType.Int,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				minimum: 1,
				maximum: 200,
				step: 1,
				label: 'Scan Period Allowed Requests (how many requests to make before taking a rest)',
			},
			'styleConfluenceTodos': {
				value: true,
				type: SettingItemType.Bool,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				label: 'Apply styling to confluence style todos in the markdown renderer (Restart Required)',
			},
			'forceSync': {
				value: true,
				type: SettingItemType.Bool,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				label: 'Force sync after summary not update (Important: do not un-check this)',
			},
			'showCompletetodoitems': {
				value: true,
				type: SettingItemType.Bool,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				label: 'Include complete TODO items in TODO summary (it might take long time/long list)',
			},
		});

		const builder = new SummaryBuilder(await getSettings());

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

		await joplin.commands.register({
			name: "inlineTodo.markDone",
			label: "Mark TODO as done",
			execute: async () => {
				const currentNote = await joplin.workspace.selectedNote();
				if (!isSummary(currentNote)) { return; }
				mark_current_line_as_done(builder, currentNote);
			},
		});

		joplin.workspace.filterEditorContextMenu(async (object: any) => {
			const currentNote = await joplin.workspace.selectedNote();
			if (!isSummary(currentNote)) { return object; }

			const newItems: MenuItem[] = [
				{
					type: 'separator',
				},
				{
					label: 'Mark TODO as done',
					accelerator: 'Ctrl+Alt+D',
					commandName: 'inlineTodo.markDone',
					commandArgs: [],
				},
			];

			object.items = object.items.concat(newItems);

			return object;
		});

		await joplin.views.menuItems.create(
			"markDoneMenuTools",
			"inlineTodo.markDone",
			MenuItemLocation.Note,
			{ accelerator: 'Ctrl+Alt+D' }
		);

		await joplin.settings.onChange(async (_) => {
			builder.settings = await getSettings();
		});

		await joplin.workspace.onNoteSelectionChange(async () => {
			const currentNote = await joplin.workspace.selectedNote();

			if (isSummary(currentNote)) {
				await builder.search_in_all();
				update_summary(builder.summary, builder.settings, currentNote.id, currentNote.body);
			}
		});

		if (await joplin.settings.value('styleConfluenceTodos')) {
			await joplin.contentScripts.register(
				ContentScriptType.MarkdownItPlugin,
				'conference_style_renderer',
				'./todoRender/index.js'
			);
		}
	},
});
