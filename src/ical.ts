import { Settings, Todo, Summary } from './types';
import { createEvents } from 'ics';


function cleanDescription(description: string): string {
	// Remove leading indent and extra newlines
  const withoutLeadingNewlines = description.replace(/^\n+/, '');

  // If the text is empty or has no lines, return it as is
  if (!withoutLeadingNewlines.trim()) {
    return withoutLeadingNewlines;
  }

  const lines = withoutLeadingNewlines.split('\n');

  // Find the first non-empty line
  const firstNonEmptyLineIndex = lines.findIndex(line => line.trim().length > 0);

  const firstNonEmptyLine = lines[firstNonEmptyLineIndex];

  // Calculate the indent level by finding the number of leading spaces/tabs
  const indentMatch = firstNonEmptyLine.match(/^(\s*)/);
  const baseIndent = indentMatch ? indentMatch[1] : '';
  const baseIndentLength = baseIndent.length;

  // If there's no indentation in the first line, return the text as is
  if (baseIndentLength === 0) {
    return withoutLeadingNewlines;
  }

  // Process each line to remove the base indentation
  const processedLines = lines.map(line => {
    // If the line starts with at least the base indent, remove it
    if (line.startsWith(baseIndent)) {
      return line.substring(baseIndentLength);
    }

    // For lines with less indentation than the base (should be rare if text is properly formatted),
    // try to remove as many leading whitespace characters as possible without going beyond the line length
    const lineLeadingWhitespace = line.match(/^(\s*)/)[1];
    return line.substring(Math.min(baseIndentLength, lineLeadingWhitespace.length));
  });

  return processedLines.join('\n');
}

function parseDate(todo_date: string, settings: Settings): Date {
	// For now only all day events are supported
	let date = new Date();
	try {
		date = new Date(todo_date);
		// Convert date into local time, this works because... javascript
		date = new Date(
			date.getUTCFullYear(),
			date.getUTCMonth(),
			date.getUTCDate()
		);

		if (settings.shift_overdue) {
			const today = new Date();

			if (date < today) {
				date = today;
			}
		}
	} catch (error) {
		console.warn(`${todo_date} is not a date that new Date can understand, falling back to today`);
		console.error(error);
	}
	return date;
}

function formatDate(date: Date): string {
	// Dates without timezones are parsed as UTC, so we need to treat them as UTC here
	const year = date.getFullYear();
	// getMonth() is zero-based, so add 1
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}${month}${day}`;
}

function todosToEvent(todo: Todo, settings: Settings) {
	const date = parseDate(todo.date, settings);

  return {
		calName: "Joplin Todos",
		productId: "-//plugin.calebjohn.todo//Inline Todo for Joplin//EN",
		title: todo.msg,
		url: "joplin://x-callback-url/openNote?id=" + todo.note,
		description: cleanDescription(todo.description),
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

export function icalBlock(summary_map: Summary, settings: Settings) {
	let due: Todo[] = [];

	for (const [id, todos] of Object.entries(summary_map)) {
		for (let todo of todos) {
			if (todo.date) {
				due.push(todo);
			}
		}
	}

	let icalBody = '```ical\n';

	const events = due.map((d) => todosToEvent(d, settings));
	const { error, value } = createEvents(events);

	if (error) {
		console.error(error);
		icalBody += "Error generating ical, please check logs for details";
	} else {
		// TODO: Consider adding a ttl setting
		const ttl = "1H"
		// refresh-interval is the better field to use to specify how often a client can refresh
		// apparently the rfc was put forward by apple, and is respected by their calendars
		// https://www.rfc-editor.org/rfc/rfc7986#section-5.7
		// https://stackoverflow.com/a/14162451
		icalBody += value.replace("X-PUBLISHED-TTL:PT1H", `X-PUBLISHED-TTL:PT${ttl}\nREFRESH-INTERVAL;VALUE=DURATION:PT${ttl}`)
										.replace(/\r\n\t/g, ''); // Need to remove the newlines inserted by ics, they are in the wrong spots
										// TODO: probably need to figure out why they use \r\n\t because it might be necessary for some calendar apps
	}

	icalBody += '```';

	return icalBody;
}

