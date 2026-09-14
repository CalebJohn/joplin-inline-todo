import * as React from "react"
import { useEffect, useState, useMemo } from "react";
import { Settings, Summary, Todo, WebviewApi, ExternalTodo, ExternalSourcesState, AnyTodo } from "../../types";
import { sourceDisplayName } from "../lib/sourceIcons";
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
// point of view (contrast to the useFilters hook)
export default (props: Props) => {
	const [summary, setSummary] = useState<Todo[]>([]);
	// Latest result per external source. A result can carry both todos (the last good
	// ones) and an error, so both are derived from it.
	const [externalState, setExternalState] = useState<ExternalSourcesState>({});
	const [externalLoading, setExternalLoading] = useState(false);
	const [externalIpcError, setExternalIpcError] = useState<string | null>(null);
	const [summaryLoading, setSummaryLoading] = useState(false);
	const [summaryError, setSummaryError] = useState<string | null>(null);
	const [settings, setSettings] = useState<Settings>(null);

	const externalTodos: ExternalTodo[] = useMemo(() => {
		return Object.values(externalState).flatMap(result => result.todos);
	}, [externalState]);

	const externalError: string | null = useMemo(() => {
		if (externalIpcError) return externalIpcError;
		const messages = Object.values(externalState)
			.filter(result => result.error)
			.map(result => `${sourceDisplayName(result.source)}: ${result.error}`);
		return messages.length > 0 ? messages.join('; ') : null;
	}, [externalState, externalIpcError]);

	// Combine local and external todos
	const allTodos: AnyTodo[] = useMemo(() => {
		return [...summary, ...externalTodos];
	}, [summary, externalTodos]);

	const refreshSummary = () => {
		const fn = async() => {
			setSummaryLoading(true);
			setSummaryError(null);
			try {
				const newSummary: Summary = await props.webviewApi.postMessage({ type: 'getSummary' });
				// Flatten Summary map to a list of todos
				const flatSummary = Object.values(newSummary.map).flat();
				setSummary(flatSummary.map(addStableKey));
			} catch (error) {
				logger.error('Failed to fetch summary:', error);
				setSummaryError('Failed to fetch summary');
			} finally {
				setSummaryLoading(false);
			}
		}
		void fn();
	}

	const refreshExternalTodos = (forceFresh: boolean = false) => {
		const fn = async () => {
			setExternalLoading(true);
			setExternalIpcError(null);

			try {
				const newState: ExternalSourcesState = await props.webviewApi.postMessage({
					type: 'getExternalTodos',
					value: { forceFresh }
				});

				for (const [sourceId, result] of Object.entries(newState)) {
					if (result.error) {
						logger.error(`Error from ${sourceId}: ${result.error}`);
					}
				}

				setExternalState(newState);
			} catch (error) {
				logger.error('Failed to fetch external todos:', error);
				setExternalIpcError('Failed to fetch external todos');
			} finally {
				setExternalLoading(false);
			}
		};
		void fn();
	};

	const refreshAll = (forceFresh: boolean = false) => {
		refreshSummary();
		refreshExternalTodos(forceFresh);
	};

	useEffect(() => {
		const fn = async() => {
			// Load local todos first (fast)
			refreshSummary();

			// Settings are passed as a JSON string in order to support more complex data types
			try {
				const newSettings: string = await props.webviewApi.postMessage({ type: 'getSettings' });
				setSettings(JSON.parse(newSettings));
			} catch (error) {
				logger.error('Failed to parse settings JSON:', error);
				// Keep settings as null, which will be handled by the consuming components
			}

			// Fetch external todos after local data is loaded
			refreshExternalTodos();
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
			} else if (message.type === 'updateExternalTodos') {
				// A background refresh reports only the sources that refreshed
				const updated = message.value as ExternalSourcesState;
				setExternalState(prev => ({ ...prev, ...updated }));
			} else {
				logger.warn('Unknown message:' + JSON.stringify(message));
			}
		});
	}, []);

	return {
		summary,           // Local todos only
		allTodos,          // Combined local + external
		externalTodos,     // External only
		externalLoading,
		externalError,
		summaryLoading,
		summaryError,
		settings,
		refreshSummary,
		refreshExternalTodos,
		refreshAll
	};
}
