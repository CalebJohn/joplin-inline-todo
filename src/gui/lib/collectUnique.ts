import { AnyTodo, UniqueFields } from "../../types";

export default function collectUnique(summary: AnyTodo[]): UniqueFields {
	const note = new Set<string>();
	const parent_id = new Set<string>();
	const category = new Set<string>();
	const tags = new Set<string>();
	const note_tags = new Set<string>();

	for (const item of summary) {
		note.add(item.note);
		parent_id.add(item.parent_id);
		if (item.category) { 
			category.add(item.category);
		}
		if (item.tags) {
			item.tags.forEach(tag => tags.add(tag));
		}
		if (item.note_tags) {
			item.note_tags.forEach(tag => note_tags.add(tag));
		}
	}

	return {
		note: [...note].sort(),
		parent_id: [...parent_id].sort(),
		category: [...category].sort(),
		tags: [...tags].sort(),
		note_tags: [...note_tags].sort(),
	};
}
