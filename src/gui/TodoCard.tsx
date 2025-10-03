import * as React from "react"
import { Button } from "@/src/gui/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/gui/components/ui/card"
import { Todo, WebviewApi } from "../types"

declare var webviewApi: WebviewApi;

export default (props: Todo) => {

	const markDone = async () => {
		await webviewApi.postMessage({ type: 'markDone', value: props });
  }

	const jumpTo = async () => {
		await webviewApi.postMessage({ type: 'jumpTo', value: props });
  }

	return (
		<Card>
			<CardHeader>
				<CardTitle>{props.note_title}</CardTitle>
				<CardDescription>{props.msg}</CardDescription>
				<CardAction><Button onClick={jumpTo}>Go</Button></CardAction>
			</CardHeader>
		</Card>
	);
}
