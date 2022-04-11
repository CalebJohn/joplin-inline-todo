import { Settings, Todo, Summary } from '../types';

function formatTodo(todo: Todo): string {
	const date = todo.date ? todo.date : '';
	return `| ${todo.msg} | ${todo.assignee} | ${date} | ${todo.parent_title} | [${todo.note_title}](:/${todo.note}) |\n`;
}

export async function tableBody(summary_map: Summary, _settings: Settings) {
	let summaryBody = '| Task | Assignee | Due | Notebook | Note |\n';
	summaryBody += '| ---- | -------- | --- | -------- | ---- |\n';

	const entries = Object.entries(summary_map).sort((a, b) => a[1][0].assignee.localeCompare(b[1][0].assignee, undefined, { sensitivity: 'accent', numeric: true }));
	for (const [id, todos] of entries) {
		for (let todo of todos) {
			summaryBody += formatTodo(todo);
		}
	}

	if (!summaryBody) {
		summaryBody = '# All done!\n\n';
	}

	return summaryBody;
}
