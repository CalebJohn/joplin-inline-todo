import { execFileSync } from 'child_process';
import * as path from 'path';
import { localDate, localDateTime } from './dateUtils';

// Node fixes the process timezone for the life of the process, so a far-positive
// zone cannot be simulated in-process: assigning process.env.TZ after startup
// does not move `new Date()`. These checks therefore run twice - once on
// whatever zone the suite was started with, and once re-run in a child process
// with TZ pinned to a far-positive zone, which is where the original bug showed
// up (local midnight is already the previous day in UTC, so reading UTC
// components shifted the date back a day).

const CIVIL_DATE_SUITE = 'civil date parsing';

const cases: Array<[string, number, number, number]> = [
	['2026/10/14', 2026, 9, 14],
	['2026-10-14', 2026, 9, 14],
	['10/14/2026', 2026, 9, 14],
	['October 14, 2026', 2026, 9, 14],
	['2024/01/15', 2024, 0, 15],
	['01-15-2024', 2024, 0, 15],
];

describe(CIVIL_DATE_SUITE, () => {
	it.each(cases)('parses %s without shifting the day', (input, year, month, day) => {
		const d = localDate(input);
		expect(d.getFullYear()).toBe(year);
		expect(d.getMonth()).toBe(month);
		expect(d.getDate()).toBe(day);
	});

	it('parses the same day identically whether slashed or ISO', () => {
		expect(localDate('2026/10/14').valueOf()).toBe(localDate('2026-10-14').valueOf());
	});

	it('yields a local-midnight DateTime on the written date', () => {
		expect(localDateTime('2026/10/14').toISODate()).toBe('2026-10-14');
	});
});

describe('far-positive timezones', () => {
	const jestBin = path.join(path.dirname(require.resolve('jest-cli/package.json')), 'bin', 'jest.js');

	it.each(['Pacific/Kiritimati', 'Asia/Shanghai'])('parses dates correctly with TZ=%s', (tz) => {
		const env: NodeJS.ProcessEnv = { ...process.env, TZ: tz };
		delete env.JEST_WORKER_ID;

		try {
			execFileSync(process.execPath, [
				jestBin,
				'--runInBand',
				'--silent',
				'-t', CIVIL_DATE_SUITE,
				path.join(__dirname, 'dateUtils.timezone.test.ts'),
			], { env, stdio: 'pipe' });
		} catch (err) {
			const e = err as { stdout?: Buffer; stderr?: Buffer };
			throw new Error(`Date parsing failed in TZ=${tz}:\n${e.stdout}\n${e.stderr}`);
		}
	});
});
