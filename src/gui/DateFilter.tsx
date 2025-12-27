import * as React from "react"
import { SelectFilterComponent } from "./SelectFilter";
import { DateFilter } from "../types";
import { groupsToOptions } from "./lib/selectUtils";

const BASE_GROUPS = {
	"": [
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

interface Props {
	label: string;
	title?: string;
	field: string;
	filter: DateFilter;
	dispatch: (o) => void;
}


export function DateFilterComponent(props: Props) {
	const groups = React.useMemo(() => ({
		"": [
			(props.field === 'date' ? "All" : "None"),
			...BASE_GROUPS[""]
		],
		"Weeks": BASE_GROUPS["Weeks"],
		"Months": BASE_GROUPS["Months"],
	}), [props.field]);

	const options = React.useMemo(() => groupsToOptions(groups), [groups]);

	return (
		<SelectFilterComponent {...props} defaultClosed={false} groups={options} />
	)
}
