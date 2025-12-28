// Manual mock for Joplin API
export default {
	data: {
		get: jest.fn(),
		put: jest.fn(),
		post: jest.fn(),
		delete: jest.fn(),
		userDataGet: jest.fn(),
		userDataSet: jest.fn(),
	},
	settings: {
		value: jest.fn(),
		globalValue: jest.fn(),
	},
	workspace: {
		selectedNote: jest.fn(),
		selectedFolder: jest.fn(),
	},
	commands: {
		execute: jest.fn(),
	},
};
