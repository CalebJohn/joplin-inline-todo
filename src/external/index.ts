import { ExternalSourceManager } from './ExternalSourceManager';
import { LinearSource } from './linear/LinearSource';
import { Settings } from '../types';

export function createExternalManager(settings: Settings): ExternalSourceManager {
	const manager = new ExternalSourceManager();
	manager.registerSource(new LinearSource(settings));
	return manager;
}
