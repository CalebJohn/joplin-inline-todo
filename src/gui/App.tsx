import * as React from "react"
import calcFiltered from "./lib/filters";
import collectUnique from "./lib/collectUnique";
import useFilters from './hooks/useFilters';
import usePluginData from './hooks/usePluginData';
import { useIsMobile } from './hooks/use-mobile';
import { WebviewApi } from "../types";
import { TodoCard } from "./TodoCard"
import { FilterSidebar } from "./Sidebar"
import { RefreshButton } from "./RefreshButton";
import { Separator } from "@/src/gui/components/ui/separator"
import { SidebarProvider, SidebarTrigger } from "@/src/gui/components/ui/sidebar"
import { Loader2, AlertCircle } from "lucide-react";
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: App');

declare let webviewApi: WebviewApi;


export default function App() {
	const {
		allTodos,
		externalLoading,
		externalError,
		settings,
		refreshAll
	} = usePluginData({ webviewApi });

	const [filters, dispatch] = useFilters({ webviewApi, summary: allTodos });

	const isMobile = useIsMobile();

	const filtered = React.useMemo(() => calcFiltered(allTodos, filters), [allTodos, filters]);
	const uniqueFields = React.useMemo(() => collectUnique(allTodos), [allTodos]);

	const sidebarProps = {
		filters,
		dispatch,
		filtered,
		uniqueFields,
		todos: allTodos,
	};

	// The parent container has a 10px border, so we need to subtract 20px from the width
	// to make the plugin fit perfectly
	return (
		<SidebarProvider style={{ width: isMobile ? window.innerWidth - 20 : '100%' }}>
			<FilterSidebar {...sidebarProps} />
			<main className="todo-editor flex flex-col flex-1 min-w-0">
				<header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-[orientation=vertical]:h-4"
					/>

					{/* Loading indicator for external sources */}
					{externalLoading && (
						<span className="flex items-center gap-1 text-xs text-muted-foreground">
							<Loader2 className="size-3 animate-spin" />
							Loading external...
						</span>
					)}

					{/* Error indicator */}
					{externalError && (
						<span className="flex items-center gap-1 text-xs text-destructive" title={externalError}>
							<AlertCircle className="size-3" />
							Error
						</span>
					)}

					<div className="flex ml-auto px-3 items-center gap-2">
						<RefreshButton refreshSummary={refreshAll} />
					</div>
				</header>
				<div className="flex p-2 flex-col flex-1 overflow-y-scroll">
				{!!filtered &&
					filtered.active.todos.map((todo) => {
						return (
							<TodoCard key={todo.key} todo={todo} filters={filters} dispatch={dispatch} webviewApi={webviewApi} />
						);
					})
				}
				</div>
			</main>
		</SidebarProvider>
	);
}
