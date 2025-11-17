import * as React from "react";
import { useState } from "react";
import { Button } from "@/src/gui/components/ui/button";
import { Input } from "@/src/gui/components/ui/input"
import { Label } from "@/src/gui/components/ui/label";

interface Props {
	defaultName: string;
	saveAndClose: (s: string) => void;
}


export function FilterNameDialogComponent({ defaultName, saveAndClose }: Props) {
	const [filterName, setFilterName] = useState(defaultName);
	const [open, setOpen] = useState(false);

	const saveName = () => {
		saveAndClose(filterName);
	};

	const handleKeyPress = (e) => {
		if (e.key === 'Enter') {
			saveName();
		}
	};

	return  (
		<div className="grid gap-4">
				<Label htmlFor="filterName">Filter Name</Label>
				<Input
					id="filterName"
					value={filterName}
					className="col-span-2 h-8"
					onChange={(e) => setFilterName(e.target.value)}
					onKeyPress={handleKeyPress}
					autoFocus
				/>
				<Button type="submit" onClick={saveName} disabled={!filterName.trim()}>
					Save
				</Button>
		</div>
	)
}
