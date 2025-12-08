import * as React from "react";
import { useState } from "react";
import { FilterNameDialogComponent } from './FilterNameDialog';
import { Button } from "@/src/gui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/gui/components/ui/popover"
import { Filter } from "lucide-react";
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: SaveFilter.tsx');

interface Props {
	dispatch: (o) => void;
}


export function SaveFilterComponent({ dispatch }: Props) {
	const [open, setOpen] = useState(false);

	const saveActiveFilter = (filterName: string) => {
		dispatch({
			type: "saveActive",
			name: filterName,
		});
		setOpen(false);
	};

	return  (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button size="sm" className="w-full rounded-sm">
					<Filter className="h-4 w-4 mr-2" />
					Save Filter
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80">
				<FilterNameDialogComponent defaultName={''} saveAndClose={saveActiveFilter} />
			</PopoverContent>
		</Popover>
	)
}
