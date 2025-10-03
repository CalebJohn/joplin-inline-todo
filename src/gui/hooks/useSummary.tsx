import * as React from "react"
import { useEffect, useState } from "react";
import { Summary, Todo, WebviewApi } from "../../types";
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: useSummary');

interface Props {
	webviewApi: WebviewApi;
}

export default (props:Props) => {
	const [summary, setSummary] = useState<Todo[]>([]);
	const [firstStartDone, setFirstStartDone] = useState<boolean>(false);

	useEffect(() => {
		const fn = async() => {
			if (firstStartDone) return;

			setFirstStartDone(true);
			logger.info('Getting summary data on first launch');
			const summary = await props.webviewApi.postMessage<Summary>({ type: 'getSummary' });
			// Flatten Summary map to a list of todos
			setSummary(Object.values(summary).flat());
		}

		void fn();
	}, [firstStartDone]);

	useEffect(() => {
		props.webviewApi.onMessage(async (event) => {
			const message = event.message;

			if (message.type === 'updateSummary') {
				const newSummary = message.value as Summary;
				setSummary(current => {
					// TODO: check that the summary hasn't changed. currently re-rendering unnecessarily
					// if (summay unchanged) {
					// 	// logger.info('TODOs have not changed - skipping update');
					// 	return current;
					// }
					// logger.info('TODOs have changed - updating');
					//
					// Flatten Summary map to a list of todos
					return Object.values(newSummary).flat();
				});
			} else {
				logger.warn('Unknown message:' + JSON.stringify(message));
			}
		});
	}, [props.webviewApi]);

	return summary;
}
