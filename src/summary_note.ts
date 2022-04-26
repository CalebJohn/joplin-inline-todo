import joplin from 'api';


export async function create_summary_note() {
	const par = await joplin.workspace.selectedFolder()
	await joplin.data.post(['notes'], null, {title: 'Todo Summary', parent_id: par.id, body: "\n<!-- inline-todo-plugin -->"});
}
