import * as React from "react"
import { useEffect, useState } from "react";
import { Settings, Summary, Todo, WebviewApi } from "../../types";
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: usePluginData');

interface Props {
	webviewApi: WebviewApi;
}

// necessary so that react can keep track of todos
function addStableKey(todo: Todo): Todo {
	const key = todo.msg + todo.category + todo.tags.join() + todo.note + todo.parent_id + todo.date;
	return { ...todo, key: key };
}

// This handles the loading and updating for all data that is read-only from the plugin
// point of view
export default (props: Props) => {
	const [summary, setSummary] = useState<Todo[]>([]);
	const [settings, setSettings] = useState<Settings>(null);

	const refreshSummary = () => {
		const fn = async() => {
			const newSummary: Summary = await props.webviewApi.postMessage({ type: 'getSummary' });
			// Flatten Summary map to a list of todos
			const flatSummary = Object.values(newSummary.map).flat();
			setSummary(flatSummary.map(addStableKey));
		}
		void fn();
	}

	useEffect(() => {
		const fn = async() => {
			logger.info('Getting plugin data on first launch');

			refreshSummary();

			// Settings are passed as a JSON string in order to support more complex data types
			const newSettings: string = await props.webviewApi.postMessage({ type: 'getSettings' });
			setSettings(JSON.parse(newSettings));
		}

		void fn();
	}, []);

	useEffect(() => {
		props.webviewApi.onMessage(async (event) => {
			const message = event.message;

			if (message.type === 'updateSummary') {
				const newSummary = message.value as Summary;
				const flatSummary = Object.values(newSummary.map).flat();
				setSummary(flatSummary.map(addStableKey));
			} else {
				logger.warn('Unknown message:' + JSON.stringify(message));
			}
		});
	}, []);

	return { summary, settings, refreshSummary };
}
