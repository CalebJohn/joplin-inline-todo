import { Settings, Todo, Summary } from '../types';

export function formatTodo(todo: Todo, _settings: Settings): string {
	const tags = todo.tags.map((s: string) => '+' + s).join(' ');
	if (todo.date) {
		return `- [${todo.note_title}](:/${todo.note}): ${todo.date} ${todo.msg} ${tags}\n`;
	} else {
		return `- [${todo.note_title}](:/${todo.note}): ${todo.msg} ${tags}\n`;
	}
}

// Create a string by concating some Note fields, this will determine sort order
function sortString(todo: Todo): string {
	return todo.note_title + todo.msg + todo.note;
}

export async function plainBody(summary_map: Summary, settings: Settings) {
	let summaryBody = '';
	let summary: Record<string, Record<string, Todo[]>> = {};
	let due: Todo[] = [];
	let completed: Todo[] = [];

	for (const [id, todos] of Object.entries(summary_map)) {
		for (let todo of todos) {
			if (todo.completed) {
				completed.push(todo)
			}
			else {
				if (todo.date) {
					due.push(todo);
				} else {
					const assignee = todo.assignee.toUpperCase();
					if (!(assignee in summary)) {
						summary[assignee] = {};
					}
					if (!(todo.parent_title in summary[assignee])) {
						summary[assignee][todo.parent_title] = [];
					}
					summary[assignee][todo.parent_title].push(todo);
				}
			}
		}
	}
	
	if (due.length > 0) {
		summaryBody += `# DUE\n`;

		due.sort((a, b) => { return Date.parse(a.date) - Date.parse(b.date); });
		summaryBody += due.map((d) => formatTodo(d, settings)).join('\n');
		summaryBody += '\n';

		delete summary["DUE"];
	}

	const entries = Object.entries(summary).sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'accent', numeric: true }));
	// The rest of the "assignees"
	for (const [assignee, folders] of entries) {
		if (assignee) {
			summaryBody += `# ${assignee}\n`;
		}
		const fentries = Object.entries(folders).sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'accent', numeric: true }));
		for (const [folder, tds] of fentries) {
			summaryBody += `## ${folder}\n`;
			const todos = tds.sort((a, b) => sortString(a).localeCompare(sortString(b), undefined, { sensitivity: 'accent', numeric: true }));
			for (let todo of todos) {
				summaryBody += formatTodo(todo, settings) + '\n';
			}
		}
	}
	if (completed.length > 0 && settings.show_complete_todo) {
		summaryBody += `# COMPLETED\n`;

		completed.sort((a, b) => { return Date.parse(a.date) - Date.parse(b.date); });
		summaryBody += completed.map((d) => formatTodo(d, settings)).join('\n');
		
		summaryBody += '\n';
		
		delete summary["COMPLETED"];
	}
	

	if (!summaryBody) {
		summaryBody = '# All done!\n\n';
	}

	return summaryBody;
}
