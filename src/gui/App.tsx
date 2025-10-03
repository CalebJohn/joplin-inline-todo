import * as React from "react"
import { useState } from 'react';
import useSettings from './hooks/useSettings';
import useSummary from './hooks/useSummary';
import { Summary, Todo, WebviewApi } from "../types";
import TodoCard from "./TodoCard"
import { ScrollArea } from "@/src/gui/components/ui/scroll-area"

declare var webviewApi: WebviewApi;

export default function Game() {

	const settings = useSettings({ webviewApi });
	const summary = useSummary({ webviewApi });

	return (
		<div className="todo-editor w-full">
			<ScrollArea className="todo-list w-full h-full">
			{
				summary.filter(t => !t.completed).map((todo) => {
					return (
						<TodoCard {...todo} />
					);
				})
			}
			</ScrollArea>
		</div>
	);
}

