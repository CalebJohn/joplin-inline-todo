import * as React from "react";
import { AnyTodo, isExternalTodo } from "../types";
import { CheckFilterComponent } from "./CheckFilter";
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: NoteFilter');

interface Props {
	label: string;
	field: 'note' | 'parent_id';
	filter: string[];
	todos: AnyTodo[];
	defaultClosed?: boolean;
	dispatch: (o) => void;
}

export function NoteFilterComponent({ label, field, filter, todos, defaultClosed, dispatch }: Props) {
	const idToTitleMap = React.useMemo(() => {
		const map = new Map<string, string>();

		if (field === 'note') {
			// External todos have no note. Their team maps to parent_id and stays in the Notebook list.
			todos.forEach(todo => {
				if (isExternalTodo(todo)) return;
				if (!map.has(todo.note)) {
					map.set(todo.note, todo.note_title);
				}
			});
		} else if (field === 'parent_id') {
			todos.forEach(todo => {
				if (!map.has(todo.parent_id)) {
					map.set(todo.parent_id, todo.parent_title);
				}
			});
		}

		return map;
	}, [todos, field]);

	const sortedIds = React.useMemo(() => {
		return Array.from(idToTitleMap.keys()).sort((a, b) => {
			const titleA = idToTitleMap.get(a) || '';
			const titleB = idToTitleMap.get(b) || '';
			return titleA.localeCompare(titleB);
		});
	}, [idToTitleMap]);

	const getLabel = React.useCallback((id: string) => {
		return idToTitleMap.get(id) || id;
	}, [idToTitleMap]);

	return (
		<CheckFilterComponent
			label={label}
			field={field}
			filter={filter}
			items={sortedIds}
			defaultClosed={defaultClosed}
			dispatch={dispatch}
			getLabel={getLabel}
		/>
	);
}
