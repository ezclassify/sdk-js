// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

/**
 * That the test runner still picks up the specs outside `tests/`.
 *
 * The vitest config narrows discovery to an explicit list, and one of this
 * repository's sharpest controls sits outside the default half of it:
 * `scripts/vendor-spec-provenance.spec.ts`, the only thing that checks the
 * vendored spec's provenance against its manifest. Drop `scripts/**` from the
 * include and it stops running: the suite reports a smaller file count, passes,
 * exits 0, and nothing anywhere says the provenance went unchecked.
 *
 * That file cannot catch it, because a file that is no longer discovered cannot
 * assert its own discovery. So the assertion lives here, under `tests/`, which
 * the include covers.
 */
const ROOT = path.resolve(__dirname, '..');

/** Specs that guard the vendored spec and live outside `tests/`. */
const GUARD_SPECS = ['scripts/vendor-spec-provenance.spec.ts'];

describe('spec discovery', () => {
    const config = readFileSync(path.join(ROOT, 'vitest.config.mjs'), 'utf8');

    it.each(GUARD_SPECS)('%s is present', (relativePath) => {
        expect(
            existsSync(path.join(ROOT, relativePath)),
            `${relativePath} guards the vendored spec. If it was deliberately ` +
                `retired, retire this assertion in the same commit and say why.`,
        ).toBe(true);
    });

    it('runs everything under scripts/, where those specs live', () => {
        expect(
            config,
            "vitest.config.mjs must include 'scripts/**/*.spec.ts'. Without it " +
                'the vendored-spec provenance spec is silently not run and the ' +
                'suite still exits 0.',
        ).toContain("'scripts/**/*.spec.ts'");
    });
});
