import * as React from "react"
import { useState } from 'react';
import { useIsMobile } from "@/src/gui/hooks/use-mobile"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/src/gui/components/ui/dropdown-menu"
import { Filters, Todo, WebviewApi } from "../types"
import { Notebook } from "lucide-react"
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: TodoCard');

declare var webviewApi: WebviewApi;

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
	refresh: () => void;
}

const TodoCard: React.FC<Props> = (props: Props) => {
	const isMobile = useIsMobile();
	const [checked, setChecked] = useState(props.todo.completed || props.filters.checked.hasOwnProperty(props.todo.key));

	const markDone = async (event) => {
		setChecked(c => !c);

		if (!checked) {
			props.dispatch({ type: 'check', key: props.todo.key });
		}
		// We don't need to "uncheck" because a new summary will be generated, and unchecking will happen then

		await webviewApi.postMessage({ type: 'markDone', value: {...props.todo, completed: !checked} });
	}

	const jumpTo = async () => {
		await webviewApi.postMessage({ type: 'jumpTo', value: props.todo });
	}


	const handleDateSelection = (e, option) => {
		e.stopPropagation();

		// TODO: create a date_utils lib
		// use it to get a datetime here
		// Then below use it to transform the datetime as necessary
		// then post a message that issues a change date command

		switch (option) {
			case 'today':
				logger.warn('today');
				break;
			case 'tomorrow':
				// setDueDate(getTomorrow());
				break;
			case 'friday':
				// setDueDate(getFriday());
				break;
			case 'nextweek':
				// setDueDate(getNextWeek());
				break;
			case 'clear':
				// setDueDate(null);
				// setCustomDate(null);
				break;
			case 'custom':
				// setShowCustomDate(true);
				break;
			default:
				break;
		}
	};

	const checkTodo = async (event) => {
		event.stopPropagation();
	};

	// Condensed
	// <div className={checked ? 'opacity-50' : ''}>
	//	<div className="py-2 px-3 text-sm mx-auto rounded-lg transition-colors hover:bg-hover">
	//		<div className="flex items-start gap-3">
	//			<label className="flex items-center cursor-pointer p-2 -m-2 h-5">
	//				<input
	//					type="checkbox"
	//					checked={checked}
	//					onChange={markDone}
	//					onClick={props.checkTodo}
	//					className="cursor-pointer"
	//				/>
	//			</label>

	//			<div className="flex-1 min-w-0">
	//				<a className="block cursor-pointer" onClick={jumpTo}>
	//					<p className="text-sm font-normal mb-1">
	//						{props.todo.msg}
	//					</p>
	//				</a>

	//				<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
	//					{props.todo.date && (
	//						<span className="flex items-center gap-1">
	//							<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
	//								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
	//							</svg>
	//							{formatDate(props.todo.date)}
	//						</span>
	//					)}

	//					<span className="flex items-center gap-1">
	//						<Notebook className="w-3 h-3" />
	//						{props.todo.parent_title}
	//					</span>

	//					{!isMobile && props.todo.tags.length > 0 && (
	//						<>
	//							{props.todo.tags.map((tag, index) => (
	//								<span key={index} className="inline-flex items-center">
	//									#{tag}
	//								</span>
	//							))}
	//						</>
	//					)}
	//				</div>
	//			</div>
	//		</div>
	//	</div>
	// </div>
	//
	//
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
				{props.todo.msg}
			</p>

			<div className="flex items-center flex-wrap gap-3 opacity-70 text-xs">
				{props.todo.date && (
					<div className={'flex-shrink-0 text-xs '+ dateColor(props.todo)} title={props.todo.date}>
						{formatDate(props.todo.date)}
					</div>
				)}

				<span className="flex items-center gap-1">
					<span className="text-xs flex items-center gap-1">
						<Notebook className="size-3" />{props.todo.parent_title} &gt;
					</span>
					<span className="text-xs">{props.todo.note_title}</span>
				</span>
				{props.todo.category &&
					<span className="inline-flex items-center text-xs font-medium">
						@{props.todo.category}
					</span>
				}
				<span className="flex items-center gap-1">
				{
					props.todo.tags.map((tag) => {
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

export default TodoCard;
