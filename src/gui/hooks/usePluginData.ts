import * as React from "react"
import { useEffect, useState, useMemo } from "react";
import { Settings, Summary, Todo, WebviewApi, ExternalTodo, ExternalSourcesState, AnyTodo } from "../../types";
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
	const [externalTodos, setExternalTodos] = useState<ExternalTodo[]>([]);
	const [externalLoading, setExternalLoading] = useState(false);
	const [externalError, setExternalError] = useState<string | null>(null);
	const [summaryLoading, setSummaryLoading] = useState(false);
	const [summaryError, setSummaryError] = useState<string | null>(null);
	const [settings, setSettings] = useState<Settings>(null);

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
			setExternalError(null);

			try {
				const externalState: ExternalSourcesState = await props.webviewApi.postMessage({
					type: 'getExternalTodos',
					value: { forceFresh }
				});

				// Flatten all external todos from all sources
				const allExternal: ExternalTodo[] = [];
				let hasErrors = false;

				for (const [sourceId, result] of Object.entries(externalState)) {
					if (result.error) {
						hasErrors = true;
						logger.error(`Error from ${sourceId}: ${result.error}`);
					}
					allExternal.push(...result.todos);
				}

				setExternalTodos(allExternal);

				if (hasErrors) {
					setExternalError('Some external sources had errors. Check logs for details.');
				}
			} catch (error) {
				logger.error('Failed to fetch external todos:', error);
				setExternalError('Failed to fetch external todos');
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
				const externalState = message.value as ExternalSourcesState;
				const allExternal: ExternalTodo[] = [];
				for (const result of Object.values(externalState)) {
					allExternal.push(...result.todos);
				}
				setExternalTodos(allExternal);
			} else if (message.type === 'updateExternalTodoItem') {
				const updated = message.value as ExternalTodo;
				setExternalTodos(prev => prev.map(t =>
					t.source === updated.source && t.externalId === updated.externalId ? updated : t
				));
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
