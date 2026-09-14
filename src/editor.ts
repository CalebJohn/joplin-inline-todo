import joplin from 'api';
import { ModelType } from 'api/types';
import { SummaryBuilder } from './builder';
import { isSummary } from './summary_note';
import { Filters, IpcMessage, Todo, ExternalTodo, isExternalTodo } from './types';
import { mark_done_scrollto } from './mark_todo';
import { createExternalManager } from './external';
import { ExternalSourceManager } from './external/ExternalSourceManager';
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: registerEditor');

let externalManager: ExternalSourceManager | null = null;

export function getExternalManager(): ExternalSourceManager | null {
	return externalManager;
}

export async function registerEditor(builder: SummaryBuilder) {
	const versionInfo = await joplin.versionInfo();
	const editors = joplin.views.editors;

	// External sources are intentionally available only in the custom editor.
	// They are never written into the summary note.
	externalManager = createExternalManager(builder.settings);

	// Track the active editor view so background refreshes can push fresh data to the UI.
	// Joplin typically has one active summary editor at a time; the latest onSetup wins.
	let activeView: any = null;
	externalManager.setRefreshCallback((state) => {
		if (!activeView) return;
		// The view may have been closed since it was recorded.
		try {
			editors.postMessage(activeView, { type: 'updateExternalTodos', value: state });
		} catch (error) {
			logger.warn('Could not push external todos to the editor view:', error);
		}
	});

	editors.register("todo-editor", {
		async onSetup(view) {
			activeView = view;
			await editors.setHtml(view, `<div id="root" class="platform-${versionInfo.platform}"></div>`);
			await editors.addScript(view, './panel.js');
			await editors.addScript(view, './gui/style/output.css');

			// await editors.onUpdate(view, async () => {
			// 	logger.info('onUpdate');
			// });

			editors.onMessage(view, async (message:IpcMessage) => {
				// These messages are internal messages sent within the app webview and can be ignored
				if ((message as any).kind === 'ReturnValueResponse') return;

				logger.info('PostMessagePlugin (Webview): Got message from webview:', message);

				if (message.type === 'getSettings') {
					// Strip externalSources before sending to webview — it contains secrets (API keys)
					const { externalSources, ...safeSettings } = builder.settings;
					return JSON.stringify(safeSettings);
				}
				else if (message.type === 'getSummary') {
					await builder.search_in_all();
					return builder.summary;
				}
				else if (message.type === 'getExternalTodos') {
					if (!externalManager) {
						return {};
					}
					const forceFresh = message.value?.forceFresh === true;
					return await externalManager.fetchAllTodos(forceFresh);
				}
				else if (message.type === 'markDone') {
					const todo = message.value as Todo | ExternalTodo;

					// External todos return a boolean so the card can roll back on failure
					if (isExternalTodo(todo)) {
						if (!externalManager) {
							return false;
						}
						// External sources only support marking done, not un-marking
						if (!todo.completed) {
							return false;
						}
						return await externalManager.markDone(todo);
					}

					// Handle local todos as before
					await mark_done_scrollto(todo);
					await builder.search_in_all();
					editors.postMessage(view, { type: 'updateSummary', value: builder.summary });

					return;
				}
				else if (message.type === 'jumpTo') {
					const todo = message.value as Todo;

					if (!todo || !todo.scrollTo) { return; }

					await joplin.commands.execute('openNote', todo.note);
					await new Promise(resolve => setTimeout(resolve, 500));
					await joplin.commands.execute('editor.scrollToText', todo.scrollTo);
					return;
				}
				else if (message.type === 'openUrl') {
					const url = message.value;
					if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
						logger.warn('Refusing to open non-http(s) URL: ' + JSON.stringify(url));
						return;
					}
					await joplin.commands.execute('openItem', url);
					return;
				}
				else if (message.type === 'setFilters') {
					const currentNote = await joplin.workspace.selectedNote();
					if (!currentNote) return false;

					if (isSummary(currentNote)) {
						const filters = message.value as Filters;
						await joplin.data.userDataSet(ModelType.Note, currentNote.id, 'filters', filters);
					}
					return;
				}
				else if (message.type === 'getFilters') {
					const currentNote = await joplin.workspace.selectedNote();
					if (!currentNote) return false;

					if (isSummary(currentNote)) {
						return await joplin.data.userDataGet(ModelType.Note, currentNote.id, 'filters');
					}
					return;
				}

				logger.warn('Unknown message: ' + JSON.stringify(message));
			});

		},
		async onActivationCheck(event) {
			if (!event.noteId) return false;
			if (!builder.settings.custom_editor) return false;

			const note = await joplin.data.get([ 'notes', event.noteId ], { fields: ['body'] });

			logger.info('onActivationCheck: Handling note: ' + event.noteId);
			return isSummary(note);
		}
	});
}
