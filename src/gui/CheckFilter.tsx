import * as React from "react";
import { Label } from "@/src/gui/components/ui/label";
import Select from "react-select";
import { selectTheme } from "./lib/selectUtils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/gui/components/ui/collapsible";
import { SidebarMenuButton, SidebarMenuItem } from "@/src/gui/components/ui/sidebar";
import { ChevronRight } from "lucide-react";
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: CheckFilter');

interface Props {
	label: string;
	field: string;
	filter: string[];
	items: string[];
	defaultClosed?: boolean;
	dispatch: (o) => void;
	getLabel?: (value: string) => string;
}


export function CheckFilterComponent({ label, field, filter, items, defaultClosed, dispatch, getLabel }: Props) {
	const options = React.useMemo(() => items.map(item => ({
		value: item,
		label: getLabel ? getLabel(item) : item
	})), [items, getLabel]);

	// Convert filter array to react-select format
	const selectValues = React.useMemo(() => filter.map(item => ({
		value: item,
		label: getLabel ? getLabel(item) : item
	})), [filter, getLabel]);

	const handleCheck = React.useCallback((s: string) => {
		const newFilter = filter.includes(s)
			? filter.filter(i => i !== s)
			: [...filter, s];

		dispatch({
			type: "updateActiveField",
			field: field,
			value: newFilter,
		});
	}, [filter, field, dispatch]);

	const handleSelectChange = React.useCallback((selected) => {
		const newFilter = selected ? selected.map(option => option.value) : [];

		dispatch({
			type: "updateActiveField",
			field: field,
			value: newFilter,
		});
	}, [field, dispatch]);

	const checkItem = React.useCallback(async (event) => {
		event.stopPropagation();
	}, []);

	return items.length > 0 && (
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
						<div className="space-y-2">
							{items.length <=3 && ((items).map((item) => (
								<div key={item} className="flex items-center space-x-2">
									<input type="checkbox" className="mr-2 px-2"
										id={item}
										checked={filter.includes(item)}
										onChange={() => handleCheck(item)}
										onClick={checkItem} />
									<Label htmlFor={item} className="text-sm">
										{getLabel ? getLabel(item) : item}
									</Label>
								</div>
							)))}
							<div className="flex flex-wrap gap-2">
								{items.length > 3 && selectValues.map(option => (
									<div key={option.value} className="flex items-center bg-raised-background text-xs rounded-sm">
										<div className="flex py-0.75 px-1.5">
										{option.label}
										</div>
										<button
											onClick={() => handleSelectChange(
												selectValues.filter(o => o.value !== option.value)
											)}
											className="flex color-raised-background hover:bg-error transition-colors py-0.75 px-1.5"
										>
											×
										</button>
									</div>
								))}
							</div>
							{items.length > 3 && (
								<Select isClearable isMulti options={options} value={selectValues} onChange={handleSelectChange} theme={selectTheme} controlShouldRenderValue={false} />
							)}
						</div>
					</div>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	)
}
