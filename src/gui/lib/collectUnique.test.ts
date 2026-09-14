import collectUnique from './collectUnique';
import { createTodo, createExternalTodo } from '../../__test-utils__/factories';

describe('collectUnique', () => {
	test('collects sorted unique values for each field', () => {
		const todos = [
			createTodo({ note: 'n2', parent_id: 'p1', category: 'work', tags: ['b', 'a'], note_tags: ['y'] }),
			createTodo({ note: 'n1', parent_id: 'p1', category: '', tags: ['a'], note_tags: ['x', 'y'] }),
		];

		const unique = collectUnique(todos);

		expect(unique.note).toEqual(['n1', 'n2']);
		expect(unique.parent_id).toEqual(['p1']);
		expect(unique.category).toEqual(['work']);
		expect(unique.tags).toEqual(['a', 'b']);
		expect(unique.note_tags).toEqual(['x', 'y']);
	});

	test('source lists only local when there are no external todos', () => {
		const unique = collectUnique([createTodo()]);
		expect(unique.source).toEqual(['local']);
	});

	test('source lists local first, then external sources alphabetically', () => {
		const todos = [
			createExternalTodo({ source: 'zeta', key: 'z' }),
			createExternalTodo({ source: 'linear', key: 'l' }),
			createTodo({ key: 'a' }),
			createExternalTodo({ source: 'alpha', key: 'al' }),
		];

		const unique = collectUnique(todos);
		expect(unique.source).toEqual(['local', 'alpha', 'linear', 'zeta']);
	});

	test('external todos are excluded from the note set but their team is kept in parent_id', () => {
		const todos = [
			createTodo({ note: 'note-1', parent_id: 'folder-1' }),
			createExternalTodo({ note: 'linear:ENG-1', parent_id: 'linear:team-1' }),
		];

		const unique = collectUnique(todos);
		expect(unique.note).toEqual(['note-1']);
		expect(unique.parent_id).toEqual(['folder-1', 'linear:team-1']);
	});
});
