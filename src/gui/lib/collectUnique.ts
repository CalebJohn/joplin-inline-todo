import { Todo, UniqueFields } from "../../types";

export default function collectUnique(summary: Todo[]): UniqueFields {
	const note = new Set<string>();
	const note_title = new Set<string>();
	const parent_id = new Set<string>();
	const parent_title = new Set<string>();
	const category = new Set<string>();
	const tags = new Set<string>();

	for (const item of summary) {
		note.add(item.note);
		note_title.add(item.note_title);
		parent_id.add(item.parent_id);
		parent_title.add(item.parent_title);
		if (item.category) { 
			category.add(item.category);
		}
		if (item.tags) {
			item.tags.forEach(tag => tags.add(tag));
		}
	}

	return {
		note: [...note].sort(),
		note_title: [...note_title].sort(),
		parent_id: [...parent_id].sort(),
		parent_title: [...parent_title].sort(),
		category: [...category].sort(),
		tags: [...tags].sort(),
	};
}
