import * as React from "react";
import { useState } from "react";
import { Filtered, Filters } from "../types";
import { FilterNameDialogComponent } from './FilterNameDialog';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/gui/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/src/gui/components/ui/dropdown-menu"
import {
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/src/gui/components/ui/sidebar";
import { MoreHorizontal } from "lucide-react";
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: SavedFilters.tsx');

interface Props {
	dispatch: (o) => void;
	filtered: Filtered;
	filters: Filters;
}


export function SavedFiltersComponent({ dispatch, filtered, filters }: Props) {
	const [showSaveDialog, setShowSaveDialog] = useState(false);

	const switchToFilter = (item) => {
		const savedFilter = filters.saved.find(sf => sf.filterName === item.filterName);

		if (!!savedFilter) {
			dispatch({ type: 'switchToSaved', filter: savedFilter })
		} else {
			logger.error("Cannot find a saved filter with name:", item.name, "this is a bug");
		}
	};

	const changeFilterName = (item, newName) => {
		dispatch({
			type: "renameSaved",
			oldName: item.filterName,
			newName: newName,
		});
		setShowSaveDialog(false);
	}

	const deleteFilter = (e, item) => {
		// Give time for the dropdown to close before deleting the item
		e.preventDefault();
		setTimeout(() => {
			dispatch({
				type: "deleteSaved",
				name: item.filterName,
			});
		}, 10);
	}


	return (
		<div>
			{filtered.saved.map((sf) => (
				<SidebarMenuItem className="group/menu" key={sf.filterName}>
					<SidebarMenuButton asChild isActive={ sf.filterName === filters.active.filterName }>
						<a href="#" onClick={() => switchToFilter(sf)}>
							<span>{sf.filterName}</span>
						</a>
					</SidebarMenuButton>
					<SidebarMenuBadge className="transition-opacity group-hover/menu:opacity-0 group-hover/menu:pointer-events-none">{sf.openCount}</SidebarMenuBadge>
					<DropdownMenu modal={false}>
						<DropdownMenuTrigger asChild>
							<SidebarMenuAction className="opacity-0 group-hover/menu:opacity-100 transition-opacity">
								<MoreHorizontal />
							</SidebarMenuAction>
						</DropdownMenuTrigger>
						<DropdownMenuContent side="right" align="start">
							<DropdownMenuItem onSelect={() => setShowSaveDialog(true)}>
								<span>Rename Filter</span>
							</DropdownMenuItem>
							<DropdownMenuItem variant="destructive" onSelect={(e) => deleteFilter(e, sf)}>
								<span>Delete Filter</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
						<DialogContent className="sm:max-w-[425px]">
							<DialogHeader>
								<DialogTitle>Rename Filter</DialogTitle>
								<DialogDescription>
									Please Enter a new name. Press Escape to cancel.
								</DialogDescription>
							</DialogHeader>
							<FilterNameDialogComponent defaultName={sf.filterName} saveAndClose={(newName) => changeFilterName(sf, newName)} />
						</DialogContent>
					</Dialog>
				</SidebarMenuItem>
			))}
		</div>
	)
}
