import joplin from 'api';

export async function get_summary_note_id(): Promise<string> {
	let r = await joplin.data.get(['search'], {
		query: '/"<!-- inline-todo-plugin -->"',
		fields: ['id'],
		page: 1
	});

	if (r.items.length > 0) {
		return r.items[0]['id'];
	}

	return '';
}

export async function create_summary_note() {
	const par = await joplin.workspace.selectedFolder()
	await joplin.data.post(['notes'], null, {title: 'Todo Summary', parent_id: par.id, body: "\n<!-- inline-todo-plugin -->"});
}
