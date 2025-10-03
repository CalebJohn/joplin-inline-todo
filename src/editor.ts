import joplin from 'api';
import { SummaryBuilder } from './builder';
import { isSummary } from './summary_note';
import { IpcMessage, Todo } from './types';
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: registerEditor');

export async function registerEditor(builder: SummaryBuilder) {
	const versionInfo = await joplin.versionInfo();
	const editors = joplin.views.editors;

	const view = await editors.create("todo-editor");
	
	await editors.setHtml(view, `<div id="root" class="platform-${versionInfo.platform}"></div>`);
	await editors.addScript(view, './panel.js');
	await editors.addScript(view, './gui/style/output.css');

	await editors.onActivationCheck(view, async () => {
		const currentNote = await joplin.workspace.selectedNote();
		if (!currentNote) return false;
		if (!builder.settings.custom_editor) return false;

		logger.info('onActivationCheck: Handling note: ' + currentNote.id);
		const isSummaryNote = isSummary(currentNote);
		return isSummaryNote;
	});

	await editors.onUpdate(view, async () => {
		logger.info('onUpdate');

		editors.postMessage(view, { type: 'updateSummary', value: builder.summary });
	});

	editors.onMessage(view, async (message:IpcMessage) => {
		// These messages are internal messages sent within the app webview and can be ignored
		if ((message as any).kind === 'ReturnValueResponse') return;

		logger.info('PostMessagePlugin (Webview): Got message from webview:', message);

		if (message.type === 'getSettings') {
			return JSON.stringify(builder.settings);
		}
		else if (message.type === 'getSummary') {
			await builder.search_in_all();
			return builder.summary;
		}
		else if (message.type === 'markDone') {
			logger.warn("Marked");
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

		logger.warn('Unknown message: ' + JSON.stringify(message));
	});

	return view;
}
