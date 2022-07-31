import joplin from 'api';
import { Settings, Todo, Summary } from './types';
import { summaries, regexes } from './settings_tables';
import { plainBody } from './summaryFormatters/plain';
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
	const [originId, msg] = parse_summary_line(line);
	if (originId == undefined) { return undefined; }

	if (set_origin_todo(originId, msg)) {
		// origin was updated, so update the TODO summary
		const currentNote = await joplin.workspace.selectedNote();
		await builder.search_in_all();
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

function parse_summary_line(line: string): string[] {
	const origin = (new RegExp(/\[(?<title>[^\[]+)\]\(:\/(?<id>.*)\)/g)).exec(line);
	if (origin == undefined) { return [undefined, undefined]; }

	let parse = regexes.list.msg([line]);
	parse = parse.split(origin.groups.id + '): ')[1];
	return [origin.groups.id, parse];
}

async function set_origin_todo(originId: string, msg: string): Promise<boolean> {
	const origin = await joplin.data.get(['notes', originId], { fields: ['body'] });
	let lines = origin.body.split('\n');
	const subMsg = msg.split(' ').slice(1, -1).join(' ');  // omitting date

	let changed = false;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(msg) || (lines[i].includes(subMsg))) {
			console.log(lines[i]);
			lines[i] = lines[i].replace('- [ ]', '- [x]');
			lines[i] = lines[i].replace('[TODO]', '[DONE]');
			console.log(lines[i]);
			changed = true;
			break;
		}
	}

	if (changed) {
		// edit origin note
		await joplin.data.put(['notes', originId], null, { body: lines.join('\n') });
	}

	return changed
}
