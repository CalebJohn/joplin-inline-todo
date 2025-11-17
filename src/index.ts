import joplin from 'api';
import Logger, { TargetType } from '@joplin/utils/Logger';
import {ContentScriptType, MenuItem, MenuItemLocation, SettingItemType, SettingStorage, ToolbarButtonLocation} from 'api/types';
import { SummaryBuilder } from './builder';
import { Settings } from './types';
import { update_summary } from './summary';
import { mark_current_line_as_done } from './mark_todo';
import { regexes, regexTitles, summaryTitles } from './settings_tables';
import { createSummaryNote, isSummary } from './summary_note';
import { registerEditor } from './editor';

const globalLogger = new Logger();
globalLogger.addTarget(TargetType.Console);
Logger.initializeGlobalLogger(globalLogger);

const logger = Logger.create('inline-todo: Index');


async function getSettings(): Promise<Settings> {
	return {
		scan_period_s: await joplin.settings.value('scanPeriod'),
		scan_period_c: await joplin.settings.value('scanPeriodRequestCount'),
		todo_type: regexes[await joplin.settings.value('regexType')],
		summary_type: await joplin.settings.value('summaryType'),
		sort_by: await joplin.settings.value('sortBy'),
		force_sync: await joplin.settings.value('forceSync'),
		show_complete_todo: await joplin.settings.value('showCompletetodoitems'),
		auto_refresh_summary: await joplin.settings.value('autoRefreshSummary'),
		custom_editor: await joplin.settings.value('enableCustomEditor'),
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
			'sortBy': {
				value: 'category',
				type: SettingItemType.String,
				isEnum: true,
				options: {
					'category': 'Category (Default)',
					'date': 'Due Date'
				},
				section: 'settings.calebjohn.todo',
				public: true,
				label: 'Sort table display TODOs by',
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
				label: 'Apply styling to metalist style todos in the markdown renderer (Restart Required)',
			},
			'forceSync': {
				value: true,
				type: SettingItemType.Bool,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				label: 'Force sync after summary note update (Important: do not un-check this)',
			},
			'showCompletetodoitems': {
				value: false,
				type: SettingItemType.Bool,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				label: 'Include complete TODO items in TODO summary (it might take long time/long list)',
			},
			'autoRefreshSummary': {
				value: true,
				type: SettingItemType.Bool,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				label: 'Refresh Summary note when opening the note.',
			},
			'enableCustomEditor': {
				value: true,
				type: SettingItemType.Bool,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				label: 'Enable custom editor for summary notes',
			},
		});

		const builder = new SummaryBuilder(await getSettings());
		await registerEditor(builder);

		await joplin.commands.register({
			name: "inlineTodo.createSummaryNote",
			label: "Create TODO summary note",
			execute: async () => {
				await createSummaryNote();
			},
		});

		await joplin.views.menuItems.create(
			"createSummaryNoteMenuTools",
			"inlineTodo.createSummaryNote",
			MenuItemLocation.Tools
		);

		await joplin.commands.register({
			name: "inlineTodo.markDone",
			label: "Toggle TODO",
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
					label: 'Toggle TODO',
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

		await joplin.commands.register({
			name: "inlineTodo.refreshSummary",
			label: "Refresh Summary Note",
			iconName: "fas fa-sync-alt",
			execute: async () => {
				await builder.search_in_all();
				let query = '/"<!-- inline-todo-plugin"';
				let page = 0;
				let r;
				do {
					page += 1;
					r = await joplin.data.get(['search'], { query: query,  fields: ['id', 'body','is_conflict'], page: page })
							.catch((error) => {
								logger.error(error);
								logger.warn("Joplin api error while searching for: " + query + " at page: " + page);
								return { items: [], has_more: false };
							});
					if (r.items) {
						for (let note of r.items) {
							if (!note.is_conflict) {
								update_summary(builder.summary, builder.settings, note.id, note.body);
							}
						}
					}
				} while(r.has_more);
			}
		});

		const platform = (await joplin.versionInfo()).platform;
		if (!builder.settings.auto_refresh_summary || platform == "mobile") {
			await joplin.views.toolbarButtons.create(
				"refreshSummaryToolbarButton",
				"inlineTodo.refreshSummary",
				ToolbarButtonLocation.EditorToolbar
			);
		}

		await joplin.settings.onChange(async (_) => {
			builder.settings = await getSettings();
		});

		await joplin.workspace.onNoteSelectionChange(async () => {
			const currentNote = await joplin.workspace.selectedNote();

			if (builder.settings.auto_refresh_summary && isSummary(currentNote)) {
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
