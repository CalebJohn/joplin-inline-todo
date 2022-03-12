import { Settings, Todo, Summary } from '../types';

function formatTodo(todo: Todo): string {
	const date = todo.date ? todo.date : '';
	return `| ${todo.msg} | ${todo.assignee} | ${date} | ${todo.parent_title} | [${todo.note_title}](:/${todo.note})\n`;
}

export async function tableBody(summary_map: Summary, _settings: Settings) {
	let summaryBody = '| Task | Assignee | Due | Notebook | Note |\n';
	summaryBody += '| ---- | -------- | --- | -------- | ---- |\n';

	for (const [id, todos] of Object.entries(summary_map)) {
		for (let todo of todos) {
			summaryBody += formatTodo(todo);
		}
	}

	if (!summaryBody) {
		summaryBody = '# All done!\n\n';
	}

	return summaryBody;
}
