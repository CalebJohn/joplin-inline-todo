import joplin from 'api';
import { Settings, Todo, Summary } from './types';
import { summaries, formats } from './settings_tables';
import { SummaryBuilder } from './builder';

export async function update_summary(summary_map: Summary, settings: Settings, summary_id: string, old_body: string) {
	let bodyFunc = summaries[settings.summary_type].func;

	const summaryBody = await bodyFunc(summary_map, settings);
	await setSummaryBody(summaryBody, summary_id, old_body, settings);
}

async function setSummaryBody(summaryBody: string, summary_id: string, old_body: string, settings: Settings) {
	// Preserve the content after the hr
	let spl = old_body.split(/<!-- inline-todo-plugin -->/gm);
	spl[0] = summaryBody;
	const body = spl.join("\n<!-- inline-todo-plugin -->");

	// Only update the note if it actually changed...
	if (old_body === body) { return; }

	// https://github.com/laurent22/joplin/issues/5955
	const currentNote = await joplin.workspace.selectedNote();
	if (currentNote.id == summary_id) {
		await joplin.commands.execute('editor.setText', body);
	}

	await joplin.data.put(['notes', summary_id], null, { body: body });

	if (settings.force_sync) {
		await joplin.commands.execute('synchronize');
	}
}

export async function mark_current_line_as_done(builder: SummaryBuilder) {
	// try to find a corresponding TODO and set it as complete in its original note 
	const line = await get_current_line();
	const todo = parse_summary_line(line, builder.summary, builder.settings);
	if (todo == undefined) { return; }

	if (set_origin_todo(todo, builder.settings)) {
		// origin was updated, so update the TODO summary
		const currentNote = await joplin.workspace.selectedNote();
		if (currentNote?.body.match(/<!-- inline-todo-plugin -->/gm)) {
			await builder.search_in_all();
			update_summary(builder.summary, builder.settings, currentNote.id, currentNote.body);
		}
	}
}

async function get_current_line(): Promise<string> {
	const n = await joplin.commands.execute('editor.execCommand', {
		name: 'getCursor',
		args: ['head'],
	});
	return await joplin.commands.execute('editor.execCommand', {
		name: 'getLine',
		args: [n.line],
	});
}

function parse_summary_line(line: string, summary_map: Summary, settings: Settings): Todo {
	const formatTodo = formats[settings.summary_type].func;

	let found = false;
	for (const [id, todos] of Object.entries(summary_map)) {
		for (let todo of todos) {
			if (line == formatTodo(todo).slice(0, -1)) {
				return todo;
			}
		}
	}
	return undefined;
}

async function set_origin_todo(todo: Todo, settings: Settings): Promise<boolean> {
	const origin = await joplin.data.get(['notes', todo.note], { fields: ['body'] });
	let lines = origin.body.split('\n');
	const todo_type = await joplin.settings.value('regexType');
	const parser = settings.todo_type;

	let match;
	for (let i = 0; i < lines.length; i++) {
		parser.regex.lastIndex = 0;
		match = parser.regex.exec(lines[i] + '\n');
		if (match === null) { continue; }

		if (!((parser.msg(match) == todo.msg) &&
			(parser.date(match) == todo.date) &&
			(parser.assignee(match) == todo.assignee) &&
			(JSON.stringify(parser.tags(match)) == JSON.stringify(todo.tags)))) {
				continue;
			}

		if (todo_type == 'link') {
			lines[i] = lines[i].replace('[TODO]', '[DONE]');
		} else {
			lines[i] = lines[i].replace('- [ ]', '- [x]');
		}

		// edit origin note
		await joplin.data.put(['notes', todo.note], null, { body: lines.join('\n') });

		return true;
		}

	return false
}
