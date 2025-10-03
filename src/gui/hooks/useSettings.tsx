import { useEffect, useState } from "react";
import { WebviewApi } from "../../types";

interface Props {
	webviewApi: WebviewApi;
}
interface Settings {
	key: string
}

export default (props:Props) => {
	const [settings, setSettings] = useState<Settings>({key: ''});

	useEffect(() => {
		const fn = async () => {
			// Settings need to be manually serialized because the todo_type field
			// contains functions and regexes
			const output = await props.webviewApi.postMessage<string>({ type: 'getSettings' });
			setSettings(JSON.parse(output));
		}

		void fn();		
	}, [props.webviewApi]);

	return settings;
}
