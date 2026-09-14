import {
	BaseExternalSource,
	CACHE_TTL_MS,
	FAILURE_BACKOFF_BASE_MS,
	FAILURE_BACKOFF_MAX_MS,
	RATE_LIMIT_DEFAULT_MS,
} from './BaseExternalSource';
import { ExternalSourceError } from './types';
import { ExternalTodo, ExternalFetchResult, Settings } from '../types';
import { createSettings } from '../__test-utils__/factories';
import { mockDateNow } from '../__test-utils__/mocks';

jest.mock('@joplin/utils/Logger', () => ({
	__esModule: true,
	default: {
		create: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
	},
}));

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (error: unknown) => void;
}

function deferred<T>(): Deferred<T> {
	let resolve: (value: T) => void;
	let reject: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

// Lets promise chains that are already resolved run to completion
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

class TestSource extends BaseExternalSource {
	enabled = true;
	fetchMock = jest.fn<Promise<ExternalFetchResult>, []>();
	markDoneMock = jest.fn<Promise<boolean>, [ExternalTodo]>();

	constructor(settings: Settings) {
		super('test', settings);
	}

	isEnabled(): boolean {
		return this.enabled && !!this._settings.externalSources?.linear?.apiKey;
	}

	updateSettings(settings: Settings): void {
		const keyChanged = this._settings.externalSources?.linear?.apiKey !== settings.externalSources?.linear?.apiKey;
		super.updateSettings(settings);
		if (keyChanged) {
			this.resetState();
		}
	}

	protected fetchTodosInternal(): Promise<ExternalFetchResult> {
		return this.fetchMock();
	}

	protected markDoneInternal(todo: ExternalTodo): Promise<boolean> {
		return this.markDoneMock(todo);
	}
}

const settingsWithKey = (apiKey: string) => createSettings({ externalSources: { linear: { apiKey } } });

const makeTodo = (id: string, completed = false): ExternalTodo => ({
	note: `test:${id}`,
	note_title: id,
	parent_id: 'test:team',
	parent_title: 'Team',
	msg: `Todo ${id}`,
	category: '',
	date: '',
	tags: [],
	note_tags: [],
	completed,
	description: '',
	scrollTo: { text: '', element: 'ul' },
	key: `test:${id}`,
	source: 'test',
	externalId: id,
});

const makeResult = (todos: ExternalTodo[]): ExternalFetchResult => ({
	source: 'test',
	todos,
	timestamp: Date.now(),
});

describe('BaseExternalSource', () => {
	const T0 = 1_700_000_000_000;
	let now: number;
	let nowSpy: jest.SpyInstance<number, []>;
	let source: TestSource;
	let callback: jest.Mock;

	const setNow = (value: number) => {
		now = value;
		nowSpy.mockReturnValue(now);
	};

	// Fills the cache with a successful fetch of the given todos
	const primeCache = async (todos: ExternalTodo[]) => {
		const result = makeResult(todos);
		source.fetchMock.mockResolvedValueOnce(result);
		await source.fetchTodos();
		return result;
	};

	beforeEach(() => {
		nowSpy = mockDateNow(T0);
		now = T0;
		source = new TestSource(settingsWithKey('key-1'));
		callback = jest.fn();
		source.setRefreshCallback(callback);
	});

	afterEach(() => {
		nowSpy.mockRestore();
	});

	test('disabled source returns an empty result without fetching', async () => {
		source.enabled = false;
		const result = await source.fetchTodos();
		expect(result).toEqual({ source: 'test', todos: [], timestamp: T0 });
		expect(source.fetchMock).not.toHaveBeenCalled();
	});

	test('fresh cache hit makes no network call', async () => {
		const first = await primeCache([makeTodo('a')]);

		setNow(T0 + CACHE_TTL_MS - 1);
		const second = await source.fetchTodos();

		expect(second).toBe(first);
		expect(source.fetchMock).toHaveBeenCalledTimes(1);
	});

	test('expired cache returns stale todos and triggers one background refresh', async () => {
		const stale = await primeCache([makeTodo('a')]);
		const fresh = makeResult([makeTodo('a'), makeTodo('b')]);
		const pending = deferred<ExternalFetchResult>();
		source.fetchMock.mockReturnValueOnce(pending.promise);

		setNow(T0 + CACHE_TTL_MS);
		const result = await source.fetchTodos();
		expect(result).toBe(stale);
		expect(source.fetchMock).toHaveBeenCalledTimes(2);

		// A second call while the refresh is in flight does not start another
		expect(await source.fetchTodos()).toBe(stale);
		expect(source.fetchMock).toHaveBeenCalledTimes(2);
		expect(callback).not.toHaveBeenCalled();

		pending.resolve(fresh);
		await flush();

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(fresh);
		expect(await source.fetchTodos()).toBe(fresh);
		expect(source.fetchMock).toHaveBeenCalledTimes(2);
	});

	test('concurrent calls share an in-flight fetch, forced or not', async () => {
		const pending = deferred<ExternalFetchResult>();
		source.fetchMock.mockReturnValueOnce(pending.promise);
		const fresh = makeResult([makeTodo('a')]);

		const p1 = source.fetchTodos();
		const p2 = source.fetchTodos(true);
		const p3 = source.fetchTodos();
		expect(source.fetchMock).toHaveBeenCalledTimes(1);

		pending.resolve(fresh);
		const results = await Promise.all([p1, p2, p3]);
		expect(results).toEqual([fresh, fresh, fresh]);
		expect(source.fetchMock).toHaveBeenCalledTimes(1);
	});

	test('failed fetch returns previous todos plus error and leaves cache intact', async () => {
		const good = await primeCache([makeTodo('a')]);
		source.fetchMock.mockRejectedValueOnce(new Error('boom'));

		setNow(T0 + CACHE_TTL_MS);
		const failed = await source.fetchTodos(true);
		expect(failed.error).toBe('boom');
		expect(failed.todos).toBe(good.todos);
		expect(failed.timestamp).toBe(good.timestamp);

		// The cache still holds the last good todos, reported with the error, and no refresh starts during cooldown
		const cached = await source.fetchTodos();
		expect(cached.todos).toBe(good.todos);
		expect(cached.error).toBe('boom');
		expect(source.fetchMock).toHaveBeenCalledTimes(2);
	});

	test('during cooldown with no cache, non-forced fetch makes no call and forced does', async () => {
		source.fetchMock.mockRejectedValue(new Error('boom'));

		const first = await source.fetchTodos();
		expect(first).toEqual({ source: 'test', todos: [], error: 'boom', timestamp: T0 });
		expect(source.fetchMock).toHaveBeenCalledTimes(1);

		setNow(T0 + 1000);
		const second = await source.fetchTodos();
		expect(second).toEqual({ source: 'test', todos: [], error: 'boom', timestamp: T0 + 1000 });
		expect(source.fetchMock).toHaveBeenCalledTimes(1);

		await source.fetchTodos(true);
		expect(source.fetchMock).toHaveBeenCalledTimes(2);
	});

	test('auth error blocks until updateSettings with a new key', async () => {
		source.fetchMock.mockRejectedValue(new ExternalSourceError('Invalid key', 'auth'));

		const failed = await source.fetchTodos();
		expect(failed.error).toBe('Invalid key');

		setNow(T0 + 60 * 60 * 1000);
		const blocked = await source.fetchTodos();
		expect(blocked.error).toBe('Invalid key');
		expect(source.fetchMock).toHaveBeenCalledTimes(1);

		// An unrelated settings change does not unblock
		source.updateSettings(settingsWithKey('key-1'));
		await source.fetchTodos();
		expect(source.fetchMock).toHaveBeenCalledTimes(1);

		source.fetchMock.mockResolvedValue(makeResult([makeTodo('a')]));
		source.updateSettings(settingsWithKey('key-2'));
		const result = await source.fetchTodos();
		expect(result.error).toBeUndefined();
		expect(result.todos).toHaveLength(1);
		expect(source.fetchMock).toHaveBeenCalledTimes(2);
	});

	test('stale cache with a failed background refresh reports the error until a later success', async () => {
		const good = await primeCache([makeTodo('a')]);
		source.fetchMock.mockRejectedValueOnce(new ExternalSourceError('Invalid key', 'auth'));

		setNow(T0 + CACHE_TTL_MS);
		const stale = await source.fetchTodos();
		expect(stale).toBe(good);
		await flush();
		expect(callback).not.toHaveBeenCalled();

		const withError = await source.fetchTodos();
		expect(withError.todos).toBe(good.todos);
		expect(withError.error).toBe('Invalid key');
		expect(source.fetchMock).toHaveBeenCalledTimes(2);

		// A new key clears the block; the refresh it starts replaces the cache
		const fresh = makeResult([makeTodo('b')]);
		source.fetchMock.mockResolvedValueOnce(fresh);
		source.updateSettings(settingsWithKey('key-2'));
		await flush();
		const recovered = await source.fetchTodos();
		expect(recovered).toBe(fresh);
		expect(recovered.error).toBeUndefined();
	});

	test('fresh cache with a failed forced refresh reports the error', async () => {
		const good = await primeCache([makeTodo('a')]);
		source.fetchMock.mockRejectedValueOnce(new Error('boom'));

		await source.fetchTodos(true);
		const result = await source.fetchTodos();
		expect(result.todos).toBe(good.todos);
		expect(result.error).toBe('boom');

		setNow(T0 + FAILURE_BACKOFF_BASE_MS);
		source.fetchMock.mockResolvedValueOnce(makeResult([makeTodo('a')]));
		await source.fetchTodos(true);
		expect((await source.fetchTodos()).error).toBeUndefined();
	});

	test('rate_limit with retryAfterMs sets that cooldown', async () => {
		source.fetchMock.mockRejectedValue(new ExternalSourceError('Slow down', 'rate_limit', 7000));
		await source.fetchTodos();
		expect(source.fetchMock).toHaveBeenCalledTimes(1);

		setNow(T0 + 6999);
		await source.fetchTodos();
		expect(source.fetchMock).toHaveBeenCalledTimes(1);

		setNow(T0 + 7000);
		await source.fetchTodos();
		expect(source.fetchMock).toHaveBeenCalledTimes(2);
	});

	test('rate_limit without retryAfterMs uses the default cooldown', async () => {
		source.fetchMock.mockRejectedValue(new ExternalSourceError('Slow down', 'rate_limit'));
		await source.fetchTodos();

		setNow(T0 + RATE_LIMIT_DEFAULT_MS - 1);
		await source.fetchTodos();
		expect(source.fetchMock).toHaveBeenCalledTimes(1);

		setNow(T0 + RATE_LIMIT_DEFAULT_MS);
		await source.fetchTodos();
		expect(source.fetchMock).toHaveBeenCalledTimes(2);
	});

	test('repeated failures back off exponentially up to the cap', async () => {
		source.fetchMock.mockRejectedValue(new ExternalSourceError('down', 'network'));

		await source.fetchTodos();
		let failedAt = now;
		const expected = [1, 2, 4, 8, 16, 32].map(m => Math.min(m * FAILURE_BACKOFF_BASE_MS, FAILURE_BACKOFF_MAX_MS));
		expect(expected).toEqual([30_000, 60_000, 120_000, 240_000, 300_000, 300_000]);

		for (const cooldown of expected) {
			const calls = source.fetchMock.mock.calls.length;

			setNow(failedAt + cooldown - 1);
			await source.fetchTodos();
			expect(source.fetchMock).toHaveBeenCalledTimes(calls);

			setNow(failedAt + cooldown);
			await source.fetchTodos();
			expect(source.fetchMock).toHaveBeenCalledTimes(calls + 1);
			failedAt = now;
		}

		// A success resets the backoff to the base value
		source.fetchMock.mockResolvedValueOnce(makeResult([]));
		await source.fetchTodos(true);
		// Let the new cache expire so the probes below are not served from it
		setNow(now + CACHE_TTL_MS);
		await source.fetchTodos(true);
		failedAt = now;
		const calls = source.fetchMock.mock.calls.length;
		setNow(failedAt + FAILURE_BACKOFF_BASE_MS - 1);
		await source.fetchTodos();
		expect(source.fetchMock).toHaveBeenCalledTimes(calls);
		setNow(failedAt + FAILURE_BACKOFF_BASE_MS);
		await source.fetchTodos();
		expect(source.fetchMock).toHaveBeenCalledTimes(calls + 1);
	});

	test('markDone during an in-flight fetch overrides the older result; a later fetch drops the override', async () => {
		await primeCache([makeTodo('x'), makeTodo('y')]);
		source.markDoneMock.mockResolvedValue(true);

		// Expired cache starts a background fetch that will still report x as open
		const pending = deferred<ExternalFetchResult>();
		source.fetchMock.mockReturnValueOnce(pending.promise);
		setNow(T0 + CACHE_TTL_MS);
		await source.fetchTodos();
		expect(source.fetchMock).toHaveBeenCalledTimes(2);

		expect(await source.markDone(makeTodo('x'))).toBe(true);

		pending.resolve(makeResult([makeTodo('x'), makeTodo('y')]));
		await flush();

		expect(callback).toHaveBeenCalledTimes(1);
		const pushed: ExternalFetchResult = callback.mock.calls[0][0];
		expect(pushed.todos.map(t => [t.externalId, t.completed])).toEqual([['x', true], ['y', false]]);
		expect(await source.fetchTodos()).toBe(pushed);

		// A fetch started after the mutation is trusted as-is
		source.fetchMock.mockResolvedValueOnce(makeResult([makeTodo('x'), makeTodo('y')]));
		const later = await source.fetchTodos(true);
		expect(later.todos.map(t => [t.externalId, t.completed])).toEqual([['x', false], ['y', false]]);
	});

	test('markDone success patches the cache in place with new identities', async () => {
		const before = await primeCache([makeTodo('x'), makeTodo('y')]);
		source.markDoneMock.mockResolvedValue(true);

		expect(await source.markDone(makeTodo('x'))).toBe(true);
		expect(source.markDoneMock).toHaveBeenCalledWith(makeTodo('x'));

		const after = await source.fetchTodos();
		expect(after).not.toBe(before);
		expect(after.todos).not.toBe(before.todos);
		expect(after.todos.map(t => [t.externalId, t.completed])).toEqual([['x', true], ['y', false]]);
		expect(after.todos[1]).toBe(before.todos[1]);
		expect(source.fetchMock).toHaveBeenCalledTimes(1);
	});

	test('markDone failure or throw returns false and changes nothing', async () => {
		const before = await primeCache([makeTodo('x')]);

		source.markDoneMock.mockResolvedValueOnce(false);
		expect(await source.markDone(makeTodo('x'))).toBe(false);
		expect(await source.fetchTodos()).toBe(before);

		source.markDoneMock.mockRejectedValueOnce(new Error('nope'));
		expect(await source.markDone(makeTodo('x'))).toBe(false);
		expect(await source.fetchTodos()).toBe(before);
		expect(before.todos[0].completed).toBe(false);
	});

	test('key change discards the result of a fetch started under the old key', async () => {
		await primeCache([makeTodo('old')]);

		const pending = deferred<ExternalFetchResult>();
		source.fetchMock.mockReturnValueOnce(pending.promise);
		setNow(T0 + CACHE_TTL_MS);
		await source.fetchTodos();
		expect(source.fetchMock).toHaveBeenCalledTimes(2);

		// The key change starts a fetch under the new key right away
		const fresh = makeResult([makeTodo('new')]);
		source.fetchMock.mockResolvedValueOnce(fresh);
		source.updateSettings(settingsWithKey('key-2'));
		expect(source.fetchMock).toHaveBeenCalledTimes(3);

		pending.resolve(makeResult([makeTodo('old-2')]));
		await flush();

		// Only the new key's result is pushed and cached
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(fresh);
		expect(await source.fetchTodos()).toBe(fresh);
		expect(source.fetchMock).toHaveBeenCalledTimes(3);
	});

	test('a caller that joined a fetch before a key change receives an empty result', async () => {
		const pending = deferred<ExternalFetchResult>();
		source.fetchMock.mockReturnValueOnce(pending.promise);
		const joined = source.fetchTodos();

		source.fetchMock.mockReturnValueOnce(deferred<ExternalFetchResult>().promise);
		source.updateSettings(settingsWithKey('key-2'));

		pending.resolve(makeResult([makeTodo('old')]));
		expect(await joined).toEqual({ source: 'test', todos: [], timestamp: T0 });
	});

	test('updateSettings with a new key starts one fetch and pushes the result', async () => {
		const fresh = makeResult([makeTodo('new')]);
		source.fetchMock.mockResolvedValueOnce(fresh);

		source.updateSettings(settingsWithKey('key-2'));
		expect(source.fetchMock).toHaveBeenCalledTimes(1);
		await flush();

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(fresh);
		expect(await source.fetchTodos()).toBe(fresh);
		expect(source.fetchMock).toHaveBeenCalledTimes(1);
	});

	test('updateSettings with the key removed starts no fetch', async () => {
		await primeCache([makeTodo('a')]);

		source.updateSettings(createSettings({ externalSources: { linear: {} } }));
		await flush();

		expect(source.fetchMock).toHaveBeenCalledTimes(1);
		expect(callback).not.toHaveBeenCalled();
		expect(await source.fetchTodos()).toEqual({ source: 'test', todos: [], timestamp: T0 });
	});

	test('key change does not share the old in-flight fetch', async () => {
		const oldPending = deferred<ExternalFetchResult>();
		source.fetchMock.mockReturnValueOnce(oldPending.promise);
		const oldPromise = source.fetchTodos();

		const fresh = makeResult([makeTodo('new')]);
		source.fetchMock.mockResolvedValueOnce(fresh);
		source.updateSettings(settingsWithKey('key-2'));
		const newResult = await source.fetchTodos();
		expect(newResult).toBe(fresh);
		expect(source.fetchMock).toHaveBeenCalledTimes(2);

		// The old fetch finishing later does not overwrite the new cache
		oldPending.resolve(makeResult([makeTodo('old')]));
		await oldPromise;
		expect(await source.fetchTodos()).toBe(fresh);
	});

	test('failure under an old key does not put the new key into cooldown', async () => {
		const oldPending = deferred<ExternalFetchResult>();
		source.fetchMock.mockReturnValueOnce(oldPending.promise);
		const oldPromise = source.fetchTodos();

		source.fetchMock.mockResolvedValueOnce(makeResult([makeTodo('new')]));
		source.updateSettings(settingsWithKey('key-2'));
		oldPending.reject(new ExternalSourceError('Invalid key', 'auth'));
		await oldPromise;

		const result = await source.fetchTodos();
		expect(result.error).toBeUndefined();
		expect(source.fetchMock).toHaveBeenCalledTimes(2);
	});
});
