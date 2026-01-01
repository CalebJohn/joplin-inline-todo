import * as React from "react"
import { useEffect, useReducer } from "react";
import { Checked, Filter, Filtered, Filters, Todo, WebviewApi } from "../../types";
import { DateTime } from "luxon";
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: useFilters');

interface Props {
	webviewApi: WebviewApi;
	summary: Todo[];
}

const emptyFilter = {
	filterName: '',
	note: [],
	parent_id: [],
	msg: [],
	category: [],
	date: 'All',
	dateOverride: 'None',
	tags: [],
	completed: 'Today',
}

const initialFilters = {
	saved: [],
	active : emptyFilter,
	activeHistory: [],
	checked: new Set(),
}

function filterReducer(filters, action): Filters {
	logger.info("dispatch:", action);
	switch(action.type) {
		case 'firstSet': {
			return action.filters;
		}
		case 'clearActive': {
			return { ...filters, active: emptyFilter };
		}
		case 'saveActive': {
			const newFilter = { ...filters.active, filterName: action.name };
			// If a filter with a name already exists, overwrite it
			const newSaved = [...filters.saved.filter((f) => f.filterName !== action.name), newFilter];
			return { ...filters, active: newFilter, saved: newSaved };
		}
		case 'switchToSaved': {
			return { ...filters, active: action.filter }
		}
		case 'check': {
			const newChecked = { ...filters.checked, [action.key]: DateTime.now().toISODate() };
			return { ...filters, checked: newChecked };
		}
		case 'updateActiveField': {
			const newActive = { ...filters.active, filterName: '', [action.field]: action.value };
			return { ...filters, active: newActive };
		}
		case 'renameSaved': {
			const newSaved = filters.saved.map((f) => {
				if (f.filterName === action.oldName) {
					return {...f, filterName: action.newName};
				}

				return f;
			});
			return { ...filters, saved: newSaved };
		}
		case 'deleteSaved': {
			const newSaved = filters.saved.filter((f) => f.filterName !== action.name);
			return { ...filters, saved: newSaved };
		}

		default: {
			throw Error('Unknown action: ' + action.type);
		}
	}
}

// On first load we need to ensure that our cached checked state is inline
// with any changes that might have happened outside this app
function syncChecked(checked: Checked, summary: Todo[]): Checked {
	const notCompleted = new Set(
		summary
			.filter(todo => !todo.completed)
			.map(todo => todo.key)
	);

	const filtered = Object.fromEntries(
		Object.entries(checked)
			.filter(([key, _]) => !notCompleted.has(key))
	);

	return filtered;
}

export default (props: Props) => {
	const [filters, dispatch] = useReducer(filterReducer, initialFilters);

	useEffect(() => {
		const getSavedFilters = async() => {
			const newFilters: Filters = await props.webviewApi.postMessage({ type: 'getFilters' });
			// newFilters will be undefined on first launch, so ignore the result
			if (newFilters) {
				console.info("Received new Filters:" + newFilters);
				dispatch({
					type: 'firstSet',
					filters: {...newFilters, checked: syncChecked(newFilters.checked, props.summary)},
				});
			}
		}

		if (props.summary.length > 0) {
			void getSavedFilters();
		}
	}, [props.summary]);

	useEffect(() => {
		const fn = async() => {
			if (filters !== initialFilters) {
				await props.webviewApi.postMessage({ type: 'setFilters', value: filters });
			}
		}

		void fn();

	}, [filters]);

	return [filters, dispatch];
}
