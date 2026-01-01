import joplin from 'api';
import { Settings, Note, Todo, Summary } from './types';
import { summaries } from './settings_tables';
import { SummaryBuilder } from './builder';
import { update_summary } from './summary';
import Logger from "@joplin/utils/Logger";

const logger = Logger.create('inline-todo: mark_todo');

export async function mark_current_line_as_done(builder: SummaryBuilder, currentNote: Note) {
	// try to find a corresponding TODO and set it as complete in its original note 
	const line = await get_current_line();
	const todo = parse_summary_line(line, builder.summary, builder.settings);
	if (todo == undefined) { return; }

	if (await set_origin_todo(todo, builder.settings)) {
		// origin was updated, so update the TODO summary
		const origin = await joplin.data.get(['notes', todo.note], { fields: ['body', 'id', 'title', 'parent_id', 'is_conflict'] })
				.catch((error) => {
					logger.error(error);
					logger.warn("Could not read note with api: " + todo.note);
					return;
				});
		if (!origin) {
			logger.error("Could not mark current line as done, see errors above");
			return;
		}
		await builder.search_in_note(origin);
		update_summary(builder.summary, builder.settings, currentNote.id, currentNote.body);
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

// Map the formated line back to it's origin
function parse_summary_line(line: string, summary: Summary, settings: Settings): Todo {
	const formatTodo = summaries[settings.summary_type].format;

	for (const [_, todos] of Object.entries(summary.map)) {
		for (const todo of todos) {
			if (line.trim() == formatTodo(todo, settings).trim()) {
				return todo;
			}
		}
	}
	logger.error(`Failed to find the corresponding todo for ${line}`);
	return undefined;
}

async function set_origin_todo(todo: Todo, settings: Settings): Promise<boolean> {
	const origin = await joplin.data.get(['notes', todo.note], { fields: ['body'] })
			.catch((error) => {
				logger.error(error);
				logger.warn("Could not get note body from api: " + todo.note);
				return { };
			});
	if (!origin) {
		logger.error("Could not set the todo origin, see errors above");
		return;
	}
	const lines = origin.body.split('\n');
	const parser = settings.todo_type;

	let match: RegExpExecArray;
	for (let i = 0; i < lines.length; i++) {
		parser.regex.lastIndex = 0;
		match = parser.regex.exec(lines[i] + '\n');
		if (match === null) { continue; }

		if (!((parser.msg(match) == todo.msg) &&
			(parser.date(match) == todo.date) &&
			(parser.category(match) == todo.category) &&
			(JSON.stringify(parser.tags(match)) == JSON.stringify(todo.tags)))) {
				continue;
			}

		if (todo.completed) {
			lines[i] = lines[i].replace(parser.toggle.closed, parser.toggle.open);
		}
		else {
			lines[i] = lines[i].replace(parser.toggle.open, parser.toggle.closed);
		}

		// edit origin note
		await joplin.data.put(['notes', todo.note], null, { body: lines.join('\n') })
				.catch((error) => {
					logger.error(error);
					logger.warn("Could not write to note: " + todo.note);
				});

		return true;
	}

	return false
}

export async function mark_done_scrollto(todo: Todo): Promise<boolean> {
	let originalBody: string;
	try {
		const original = await joplin.data.get(['notes', todo.note], { fields: ['body'] });
		originalBody = original.body;
	} catch (error) {
		logger.error(error);
		logger.warn("Could not get note body from api: " + todo.note);
		return false;
	}

	const updateState = (t, s) => '[' + s + t.slice(2);
	// the todo.completed field here is not true to the builder summary
	// it comes from the TodoCard component, so it isn't guarenteed to be
	// inline with that the scrollTo.text field says, so we'll need to manually create that
	const oldState = todo.completed ? ' ' : 'x';;
	const text = updateState(todo.scrollTo.text, oldState);
	const newState = todo.completed ? 'x' : ' ';;
	const newText = updateState(text, newState);

	const newBody = originalBody.replace(text, newText);

	try {
		await joplin.data.put(['notes', todo.note], null, { body: newBody });
	} catch (error) {
		logger.error(error);
		logger.warn("Could not write to note: " + todo.note + " todo not toggled " + todo.msg);
		return false;
	}

	return true;
}
