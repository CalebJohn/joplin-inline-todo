import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./gui/App";
import Logger, { TargetType } from '@joplin/utils/Logger';

const logger = new Logger();
logger.addTarget(TargetType.Console);
Logger.initializeGlobalLogger(logger);

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(<App />);
