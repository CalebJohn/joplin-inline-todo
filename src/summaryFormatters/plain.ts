import { Settings, Todo, Summary } from '../types';

function formatTodo(todo: Todo): string {
	if (todo.date) {
		return `- [${todo.note_title}](:/${todo.note}): ${todo.date} ${todo.msg}\n`;
	} else {
		return `- [${todo.note_title}](:/${todo.note}): ${todo.msg}\n`;
	}
}

export async function plainBody(summary_map: Summary, _settings: Settings) {
	let summaryBody = '';
	let summary: Record<string, Record<string, Todo[]>> = {};
	let due: Todo[] = [];

	for (const [id, todos] of Object.entries(summary_map)) {
		for (let todo of todos) {
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

	if (due.length > 0) {
		summaryBody += `# DUE\n`;

		due.sort((a, b) => { return Date.parse(a.date) - Date.parse(b.date); });
		summaryBody += due.map(formatTodo).join('\n');
		summaryBody += '\n';

		delete summary["DUE"];
	}

	const entries = Object.entries(summary).sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'accent', numeric: true }));
	// The rest of the "assignees"
	for (const [assignee, folders] of entries) {
		if (assignee) {
			summaryBody += `# ${assignee}\n`;
		}
		for (const [folder, todos] of Object.entries(folders)) {
			summaryBody += `## ${folder}\n`;
			for (let todo of todos) {
				summaryBody += formatTodo(todo) + '\n';
			}
		}
	}

	if (!summaryBody) {
		summaryBody = '# All done!\n\n';
	}

	return summaryBody;
}
