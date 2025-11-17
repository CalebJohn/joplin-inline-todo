import * as React from "react"
import { SelectFilterComponent } from "./SelectFilter";
import { DateFilter } from "../types";
import { Label } from "@/src/gui/components/ui/label"
import { groupsToOptions } from "./lib/selectUtils";


interface Props {
	label: string;
	title?: string;
	field: string;
	filter: DateFilter;
	dispatch: (o) => void;
}


export function DateFilterComponent(props: Props) {
	const groups = {
		"": [
			(props.field === 'date' ? "All" : "None"),
			"Overdue",
			"Today",
			"Tomorrow",
			"End of Week",
			"End of Month",
			"End of Year",
		],
		"Weeks": [
			"1 week",
			"2 weeks",
			"3 weeks",
			"4 weeks",
			"5 weeks",
			"6 weeks",
		],
		"Months": [
			"1 month",
			"2 months",
			"3 months",
			"4 months",
			"5 months",
			"6 months",
			"7 months",
			"8 months",
			"9 months",
			"10 months",
			"11 months",
			"12 months",
		],
	};
	return (
		<SelectFilterComponent {...props} defaultClosed={false} groups={groupsToOptions(groups)} />
	)
}
