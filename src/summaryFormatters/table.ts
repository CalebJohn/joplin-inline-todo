import { Settings, Todo, SummaryMap } from '../types';

export function formatTodo(todo: Todo, settings: Settings): string {
	let todoString = `\n| ${todo.msg} | ${todo.category} | ${todo.date} | ${todo.tags.join(' ')} | ${todo.parent_title} | [${todo.note_title}](:/${todo.note}) |`;
	if (settings.show_complete_todo) {
		todoString += ` ${todo.completed ? 'Y' : ''} |`;
	}
	return todoString;
}

// Create a string by concating some Note fields, this will determine sort order
function sortString(todo: Todo, settings: Settings): string {
	if (settings.sort_by === 'date') {
		const sortableDate = formatDateForSorting(todo.date) || '9999-12-31';
		return sortableDate + todo.category + todo.parent_title + todo.note_title + todo.msg + todo.note;
	}
	return todo.category + todo.parent_title + todo.note_title + todo.msg + todo.note;
}

// Convert date to sortable format (YYYY-MM-DD), handling various input formats
function formatDateForSorting(dateStr: string): string | null {
	if (!dateStr || dateStr.trim() === '') {
		return null;
	}
	
	try {
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) {
			return null;
		}
		
		// Format as YYYY-MM-DD for proper string sorting
		return date.getFullYear() + '-' + 
			String(date.getMonth() + 1).padStart(2, '0') + '-' + 
			String(date.getDate()).padStart(2, '0');
	} catch {
		return null;
	}
}

export async function tableBody(summary_map: SummaryMap, settings: Settings) {
	let completed: Todo[] = [];
	let summaryBody = '| Task | category | Due | Tags | Notebook | Note |';
	if (settings.show_complete_todo) {
		summaryBody += ' Completed |';
	}
	summaryBody +=  '\n| ---- | -------- | --- | ---- | -------- | ---- |';
	if (settings.show_complete_todo) {
		summaryBody += ' --------- |';
	}

	let todos = []
	for (const [id, tds] of Object.entries(summary_map)) {
		todos = todos.concat(tds)
	}

	todos = todos.sort((a, b) => sortString(a, settings).localeCompare(sortString(b, settings), undefined, { sensitivity: 'accent', numeric: true }));
	for (let todo of todos) {
		if (todo.completed) {
			completed.push(todo)
		}
		else {
			summaryBody += formatTodo(todo, settings);
		}
	}
	
	if (completed.length > 0 && settings.show_complete_todo) {
		for (let todo of completed) {
			summaryBody += formatTodo(todo, settings);
		}
	}

	if (!summaryBody) {
		summaryBody = '# All done!\n\n';
	}

	return summaryBody;
}
