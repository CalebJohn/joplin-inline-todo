import * as React from "react"
import { useState } from 'react';
import { Button } from "@/src/gui/components/ui/button"
import { RefreshCw } from "lucide-react";

interface Props {
	refreshSummary: () => void;
}


export function RefreshButton({ refreshSummary }: Props) {
	const [rotation, setRotation] = useState(0);

  const handleClick = () => {
    setRotation(prev => prev + 180);
		refreshSummary();
  };

	return (
		<Button
			variant="outline"
			size="icon"
			className="rounded-full transition-transform duration-500 ease-in-out"
			onClick={handleClick}
			style={{ transform: `rotate(${rotation}deg)` }}
		>
			<RefreshCw />
		</Button>
	);
}

