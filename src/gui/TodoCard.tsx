import * as React from "react";
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
// } from "@/src/gui/components/ui/dropdown-menu";
import { Filters, Todo, WebviewApi, AnyTodo, ExternalTodo, isExternalTodo } from "../types";
import { Notebook, Globe } from "lucide-react";
import { formatDate, dateColor } from "./lib/dateUtils";

interface Props {
	todo: AnyTodo;
	filters: Filters;
	dispatch: (o) => void;
	webviewApi: WebviewApi;
}

export function TodoCard({ todo, filters, dispatch, webviewApi }: Props) {
	const [checked, setChecked] = useState(todo.completed || filters.checked.hasOwnProperty(todo.key));
	const isExternal = isExternalTodo(todo);

	const markDone = React.useCallback(async (event) => {
		setChecked(c => !c);

		if (!checked) {
			dispatch({ type: 'check', key: todo.key });
		}
		// We don't need to "uncheck" because a new summary will be generated, and unchecking will happen then

		await webviewApi.postMessage({ type: 'markDone', value: {...todo, completed: !checked} });
	}, [checked, todo, dispatch, webviewApi]);

	const jumpTo = React.useCallback(async () => {
		// For external todos with a URL, open it in the browser
		if (isExternal && (todo as ExternalTodo).externalUrl) {
			window.open((todo as ExternalTodo).externalUrl, '_blank');
			return;
		}
		// For local todos, navigate to the note
		await webviewApi.postMessage({ type: 'jumpTo', value: todo });
	}, [todo, webviewApi, isExternal]);

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
			<p className="flex items-center gap-2 flex-wrap">
				<span>{todo.msg}</span>
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
				{todo.tags.length > 0 && (
					<span className="flex items-center gap-1">
					{
						todo.tags.map((tag) => {
							return (
								<span key={tag} className="text-xs text-foreground">+{tag}</span>
							);
						})
					}
					</span>
				)}
				{isExternal && (
					<span className="flex items-center gap-1 text-xs">
						{(todo as ExternalTodo).source === 'linear' ? (
							<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 100 100" className="size-3">
								<path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3542-.0443L12.6587 18.074Z"
								/>
							</svg>

						) : (
							<Globe className="size-3" />
						)}
						{(todo as ExternalTodo).source}
					</span>
				)}
			</div>
		</div>
	</div>
</div>
	);
}
