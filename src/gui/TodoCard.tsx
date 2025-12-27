import * as React from "react"
import { useState } from 'react';

// import {
// 	DropdownMenu,
// 	DropdownMenuContent,
// 	DropdownMenuGroup,
// 	DropdownMenuItem,
// 	DropdownMenuLabel,
// 	DropdownMenuPortal,
// 	DropdownMenuSub,
// 	DropdownMenuSubContent,
// 	DropdownMenuSubTrigger,
// 	DropdownMenuTrigger,
// } from "@/src/gui/components/ui/dropdown-menu"
import { Filters, Todo, WebviewApi } from "../types"
import { Notebook } from "lucide-react"


// without a timezone, dates will be interpreted as UTC.
// We do the below trickery so that the local date is handled as local
function localDate(todo_date: string): Date {
	const date = new Date(todo_date);
	// Convert date into local time, this works because... javascript
	return new Date(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate()
	);
}

// TODO: move to helper lib
function formatDate(todo_date: string) {
	const now: Date = new Date();
	const date: Date = localDate(todo_date);
	const diffms: number = now.valueOf() - date.valueOf();
	const diffDays = Math.floor(diffms / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		return 'Today';
	} else if (diffDays === 1) {
		return 'Yesterday';
	} else if (diffDays === -1) {
		return 'Tomorrow';
	} else if (diffDays > 1) {
		return `${diffDays} days ago`;
	} else if (diffDays < -1 && diffDays > -11) {
		return `${-diffDays} days`;
	}

	const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };

	if (now.getFullYear() === date.getFullYear()) {
		options.year = undefined;
	}

	return date.toLocaleDateString(undefined, options);
}

function dateColor(todo: Todo) {
	if (todo.completed) { return 'font-medium'; }

	const now: Date = new Date();
	const date: Date = localDate(todo.date);
	const diffms: number = now.valueOf() - date.valueOf();
	const diffDays = Math.floor(diffms / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		return 'font-medium text-warn';
	} else if (diffDays > 0) {
		return 'font-medium text-destructive';
	} else if (diffDays < 0) {
		return 'text-foreground';
		// return 'text-correct';
	}

	return 'text-destructive';
}

interface Props {
	todo: Todo;
	filters: Filters;
	dispatch: (o) => void;
	webviewApi: WebviewApi;
}

export function TodoCard({ todo, filters, dispatch, webviewApi }: Props) {
	const [checked, setChecked] = useState(todo.completed || filters.checked.hasOwnProperty(todo.key));

	const markDone = React.useCallback(async (event) => {
		setChecked(c => !c);

		if (!checked) {
			dispatch({ type: 'check', key: todo.key });
		}
		// We don't need to "uncheck" because a new summary will be generated, and unchecking will happen then

		await webviewApi.postMessage({ type: 'markDone', value: {...todo, completed: !checked} });
	}, [checked, todo, dispatch, webviewApi]);

	const jumpTo = React.useCallback(async () => {
		await webviewApi.postMessage({ type: 'jumpTo', value: todo });
	}, [todo, webviewApi]);

	// const handleDateSelection = (e, option) => {
	// 	e.stopPropagation();

	// 	// TODO: create a date_utils lib
	// 	// use it to get a datetime here
	// 	// Then below use it to transform the datetime as necessary
	// 	// then post a message that issues a change date command

	// 	switch (option) {
	// 		case 'today':
	// 			logger.warn('today');
	// 			break;
	// 		case 'tomorrow':
	// 			// setDueDate(getTomorrow());
	// 			break;
	// 		case 'friday':
	// 			// setDueDate(getFriday());
	// 			break;
	// 		case 'nextweek':
	// 			// setDueDate(getNextWeek());
	// 			break;
	// 		case 'clear':
	// 			// setDueDate(null);
	// 			// setCustomDate(null);
	// 			break;
	// 		case 'custom':
	// 			// setShowCustomDate(true);
	// 			break;
	// 		default:
	// 			break;
	// 	}
	// };

	const checkTodo = React.useCallback(async (event) => {
		event.stopPropagation();
	}, []);

	// Date Adjustment dropdown
				// 	<DropdownMenu>
				// 		<DropdownMenuTrigger asChild>
				// 			<div className={'flex-shrink-0 text-xs '+ dateColor(props.todo)} title={props.todo.date}>
				// 				{formatDate(props.todo.date)}
				// 			</div>
				// 		</DropdownMenuTrigger>
				// 		<DropdownMenuContent className="w-56" align="start">
				// 			<DropdownMenuLabel>Change to</DropdownMenuLabel>
				// 			<DropdownMenuGroup>
				// 				<DropdownMenuItem onClick={(e) => handleDateSelection(e, 'today')}>Today</DropdownMenuItem>
				// 				<DropdownMenuItem onClick={(e) => handleDateSelection(e, 'tomorrow')}>Tomorrow</DropdownMenuItem>
				// 				<DropdownMenuItem onClick={(e) => handleDateSelection(e, 'friday')}>Friday</DropdownMenuItem>
				// 				<DropdownMenuItem onClick={(e) => handleDateSelection(e, 'nextweek')}>Next Week</DropdownMenuItem>
				// 				<DropdownMenuItem onClick={(e) => handleDateSelection(e, 'clear')}>Clear Due Date</DropdownMenuItem>
				// 			</DropdownMenuGroup>
				// 		</DropdownMenuContent>
				// 	</DropdownMenu>

	return (

<div className={checked ? 'opacity-50' : ''}>
	<div className="py-1 px-2 text-sm mx-auto rounded-lg transition-colors hover:bg-hover grid grid-cols-[auto_1fr] gap-3 items-start" onClick={jumpTo}>
		<label className="flex items-center p-2 -m-2" onClick={checkTodo}>
			<input
				type="checkbox"
				checked={checked}
				onChange={markDone}
				onClick={checkTodo}
				className="px-2 mt-1"
			/>
		</label>

		<div className="min-w-0">
			<p>
				{todo.msg}
			</p>

			<div className="flex items-center flex-wrap gap-3 opacity-70 text-xs">
				{todo.date && (
					<div className={'shrink-0 text-xs '+ dateColor(todo)} title={todo.date}>
						{formatDate(todo.date)}
					</div>
				)}

				<span className="flex items-center gap-1">
					<span className="text-xs flex items-center gap-1">
						<Notebook className="size-3" />{todo.parent_title} &gt;
					</span>
					<span className="text-xs">{todo.note_title}</span>
				</span>
				{todo.category &&
					<span className="inline-flex items-center text-xs font-medium">
						@{todo.category}
					</span>
				}
				<span className="flex items-center gap-1">
				{
					todo.tags.map((tag) => {
						return (
							<span key={tag} className="text-xs text-foreground">+{tag}</span>
						);
					})
				}
				</span>
			</div>
		</div>
	</div>
</div>
	);
}
