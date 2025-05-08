import { Settings, Todo, Summary } from '../types';
import { createEvents } from 'ics';

export function formatTodo(todo: Todo, _settings: Settings): string {
	const tags = todo.tags.map((s: string) => '+' + s).join(' ');
	if (todo.date) {
		return `- [${todo.note_title}](:/${todo.note}): ${todo.date} ${todo.msg} @${todo.assignee} ${tags}\n`;
	} else {
		return `- [${todo.note_title}](:/${todo.note}): ${todo.msg} ${tags}\n`;
	}
}

// Create a string by concating some Note fields, this will determine sort order
function sortString(todo: Todo): string {
	return todo.note_title + todo.msg + todo.note;
}

function formatDate(date: Date): string {
	// Dates without timezones are parsed as UTC, so we need to treat them as UTC here
	const year = date.getUTCFullYear();
	// getMonth() is zero-based, so add 1
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');

	return `${year}${month}${day}`;
}

function todosToEvent(todo: Todo, settings: Settings) {
	// For now only all day events are supported
	let date = new Date();
	try {
		date = new Date(todo.date);

		if (settings.shift_overdue) {
			const today = new Date();

			if (date < today) {
				date = today;
			}
		}
	} catch (error) {
		console.warn(`${todo.date} is not a date that new Date can understand, falling back to today`);
		console.error(error);
	}
  return {
		calName: "Joplin Todos",
		productId: "-//plugin.calebjohn.todo//Inline Todo for Joplin//EN",
		title: todo.msg,
		url: "joplin://x-callback-url/openNote?id=" + todo.note,
		// created: todo.created_time,
		start: formatDate(date),
		end: formatDate(date),
		// duration: { minutes: 30 },
		// alarms: [{
		// 	action: 'display',
		// 	description: todo.msg,
		// 	trigger: todo.todo_due,
		// }],
	};
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

	if (settings.add_ical_block) {
		summaryBody += '```ical\n';

		const events = due.map((d) => todosToEvent(d, settings));
		const { error, value } = createEvents(events);

		if (error) {
			console.error(error);
			summaryBody += "Error generating ical, please check logs for details";
		} else {
			// TODO: Consider adding a ttl setting
			const ttl = "1H"
			// refresh-interval is the better field to use to specify how often a client can refresh
			// apparently the rfc was put forward by apple, and is respected by their calendars
			// https://www.rfc-editor.org/rfc/rfc7986#section-5.7
			// https://stackoverflow.com/a/14162451
			summaryBody += value.replace("X-PUBLISHED-TTL:PT1H", `X-PUBLISHED-TTL:PT${ttl}\nREFRESH-INTERVAL;VALUE=DURATION:PT${ttl}`);
		}


		summaryBody += '```';
		delete summary["DUE"];
	}
	

	if (!summaryBody) {
		summaryBody = '# All done!\n\n';
	}

	return summaryBody;
}
