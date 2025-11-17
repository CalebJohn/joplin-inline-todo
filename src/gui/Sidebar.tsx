import * as React from "react";
import { Calendar, Home, Inbox, Search, Settings } from "lucide-react";

import { FilterX, MoreHorizontal } from "lucide-react";

import { CheckFilterComponent } from "./CheckFilter"
import { DateFilterComponent } from "./DateFilter"
import { SaveFilterComponent } from "./SaveFilter"
import { SavedFiltersComponent } from "./SavedFilters"
import { SelectFilterComponent } from "./SelectFilter";
import { groupsToOptions } from "./lib/selectUtils";
import { Button } from "@/src/gui/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuItem,
} from "@/src/gui/components/ui/sidebar";
import { Filtered, Filters, UniqueFields } from "../types";
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: Sidebar.tsx');

interface Props {
	dispatch: (o) => void;
	filtered: Filtered;
	filters: Filters;
	uniqueFields: UniqueFields;
}

export default function FilterSidebar({ dispatch, filtered, filters, uniqueFields }: Props) {
	const clearActiveFilter = () => {
		dispatch({ type: 'clearActive' });
	};

	return (
		<Sidebar variant="sidebar">
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Saved</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SavedFiltersComponent {... {dispatch, filtered, filters} } />
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupLabel>Filters</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<DateFilterComponent label="Due Date" field="date" filter={filters.active.date} dispatch={dispatch} />
							<DateFilterComponent label="Show Upcoming" title="Always show todos that match this filter"field="dateOverride" filter={filters.active.dateOverride} dispatch={dispatch} />
							<CheckFilterComponent label="Category" field="category" filter={filters.active.category} items={uniqueFields.category} dispatch={dispatch} />
							<CheckFilterComponent label="Tags" field="tags" filter={filters.active.tags} items={uniqueFields.tags} dispatch={dispatch} />
							<CheckFilterComponent label="Note" field="note_title" filter={filters.active.note_title} items={uniqueFields.note_title} dispatch={dispatch} />
							<CheckFilterComponent label="Notebook" field="parent_title" filter={filters.active.parent_title} items={uniqueFields.parent_title} dispatch={dispatch} />
							<SelectFilterComponent label="Show Completed" field="completed" filter={filters.active.completed} groups={groupsToOptions({"": ["None", "Today", "This Week", "This Month", "This Year", "All Time"]})} defaultClosed={true} dispatch={dispatch} />
							<CheckFilterComponent label="Note ID" field="note" filter={filters.active.note} items={uniqueFields.note} defaultClosed={true} dispatch={dispatch} />
							<CheckFilterComponent label="Notebook ID" field="parent_id" filter={filters.active.parent_id} items={uniqueFields.parent_id} defaultClosed={true} dispatch={dispatch} />
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SaveFilterComponent dispatch={dispatch} />
					</SidebarMenuItem>
					<SidebarMenuItem>
						<Button variant="outline" size="sm" onClick={clearActiveFilter} className="w-full bg-transparent rounded-sm">
							<FilterX className="h-4 w-4 mr-2" />
							Clear Filters
						</Button>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	)
}
