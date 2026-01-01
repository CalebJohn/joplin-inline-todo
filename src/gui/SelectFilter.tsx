import * as React from "react"
import Select, { GroupBase } from 'react-select';
import { Label } from "@/src/gui/components/ui/label"
import { selectStyles, selectTheme } from "./lib/selectUtils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/gui/components/ui/collapsible";
import { SidebarMenuButton, SidebarMenuItem } from "@/src/gui/components/ui/sidebar";
import { ChevronRight } from "lucide-react";


interface Props {
	label: string;
	title?: string;
	field: string;
	filter: string;
	groups: GroupBase<any>[];
	defaultClosed: boolean;
	dispatch: (o) => void;
}


export function SelectFilterComponent({ label, title, field, filter, dispatch, groups, defaultClosed }: Props) {
	const selectValue = {
		value: filter,
		label: filter
	};

	const handleSelectionChange = (s) => {
		dispatch({
			type: "updateActiveField",
			field: field,
			value: s.value,
		});
	}


	return (
		<Collapsible defaultOpen={!defaultClosed} className="group/collapsible">
			<SidebarMenuItem>
				<CollapsibleTrigger asChild>
					<SidebarMenuButton title={title ? title : ''}>
						<Label className="text-xs font-medium">{label}</Label>
						<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
					</SidebarMenuButton>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="px-2 py-1">
						<Select
							options={groups}
							value={selectValue}
							onChange={handleSelectionChange}
							theme={selectTheme}
							styles={selectStyles}
						/>
					</div>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	)
}

