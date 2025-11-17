import * as React from "react";
import { Label } from "@/src/gui/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/gui/components/ui/collapsible";
import { SidebarMenuButton, SidebarMenuItem } from "@/src/gui/components/ui/sidebar";
import { ChevronRight, X } from "lucide-react";
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: BooleanFilter');

interface Props {
	label: string;
	msg: string;
	field: string;
	filter: boolean;
	defaultClosed?: boolean;
	dispatch: (o) => void;
}


export function BooleanFilterComponent({ label, msg, field, filter, defaultClosed, dispatch }: Props) {
	const handleCheck = () => {
		dispatch({
			type: "updateActiveField",
			field: field,
			value: !filter,
		});
	}

	const checkItem = async (event) => {
		event.stopPropagation();
	};

	return (
		<Collapsible defaultOpen={!defaultClosed} className="group/collapsible">
			<SidebarMenuItem>
				<CollapsibleTrigger asChild>
					<SidebarMenuButton>
						<Label className="text-xs font-medium">{label}</Label>
						<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
					</SidebarMenuButton>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="px-2">
						<div className="flex items-center space-x-2">
							<input type="checkbox" className="mr-2 px-2"
								id={field}
								checked={filter}
								onChange={handleCheck}
								onClick={checkItem} />
							<label htmlFor={field} className="text-sm">
								{msg}
							</label>
						</div>
					</div>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	)
}
