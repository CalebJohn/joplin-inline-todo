import { Settings, Todo, Summary } from '../types';

export function formatTodo(todo: Todo): string {
	if (todo.completed) {
		return `| ${todo.msg} | ${todo.assignee} | ${todo.date} | ${todo.tags.join(' ')} | ${todo.parent_title} | [${todo.note_title}](:/${todo.note}) |V |\n`;	
	}
	else{
		return `| ${todo.msg} | ${todo.assignee} | ${todo.date} | ${todo.tags.join(' ')} | ${todo.parent_title} | [${todo.note_title}](:/${todo.note}) |  |\n`;
	}
}

// Create a string by concating some Note fields, this will determine sort order
function sortString(todo: Todo): string {
	return todo.assignee + todo.parent_title + todo.note_title + todo.msg + todo.note;
}

export async function tableBody(summary_map: Summary, _settings: Settings) {
	let summaryBody = '| Task | Assignee | Due | Tags | Notebook | Note | Completed |\n';
	let completed: Todo[] = [];
	
	summaryBody += '| ---- | -------- | --- | ---- | -------- | ---- | ---- |\n';

	let todos = []
	for (const [id, tds] of Object.entries(summary_map)) {
		todos = todos.concat(tds)
	}

	todos = todos.sort((a, b) => sortString(a).localeCompare(sortString(b), undefined, { sensitivity: 'accent', numeric: true }));
	for (let todo of todos) {
		if (todo.completed) {
			completed.push(todo)
		}
		else {
			summaryBody += formatTodo(todo);
		}
	}
	
	if (completed.length > 0 && _settings.show_complete_todo) {
		for (let todo of completed) {
			summaryBody += formatTodo(todo);
		}
	}

	if (!summaryBody) {
		summaryBody = '# All done!\n\n';
	}

	return summaryBody;
}
