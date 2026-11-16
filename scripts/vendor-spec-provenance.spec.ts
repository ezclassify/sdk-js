// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

/**
 * Verify the vendored contract's source identity and content hashes without
 * pinning the test to one commit. The native spec writer owns these files.
 */
const ROOT = path.resolve(__dirname, '..');

/**
 * Read a repository file as text.
 *
 * @param relativePath - Path relative to the repository root.
 * @returns File contents.
 */
function read(relativePath: string): string {
    return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

interface VendorManifest {
    openapiVersion?: string;
    openapiSha256?: string;
    specBundleSha256?: string;
    specDigest?: string;
    contractsSha?: string;
    sourcePackages?: Record<string, string>;
    [key: string]: unknown;
}

const manifest = JSON.parse(
    read('vendor/spec/MANIFEST.json'),
) as VendorManifest;
const specMarkdown = read('vendor/SPEC.md');

const SHA1_HEX = /^[0-9a-f]{40}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

describe('vendored spec provenance', () => {
    it('names contracts as the source commit', () => {
        expect(manifest.contractsSha).toMatch(SHA1_HEX);
    });

    it('names the contracts packages the bundle was built from', () => {
        const packages = manifest.sourcePackages;
        expect(packages, 'sourcePackages block').toBeTypeOf('object');
        const names = Object.keys(packages ?? {});
        expect(names.length).toBeGreaterThan(0);
        for (const name of names) {
            expect(name, 'source package name').toMatch(/^@ezclassify\//);
            expect(packages?.[name], `${name} version`).toMatch(/^\d+\.\d+\./);
        }
    });

    it('records content hashes that are actually hashes', () => {
        expect(manifest.openapiSha256).toMatch(SHA256_HEX);
        expect(manifest.specBundleSha256).toMatch(SHA256_HEX);
        expect(manifest.specDigest).toMatch(SHA256_HEX);
    });

    it('records the hash of the openapi.yaml that is actually committed', () => {
        const actual = createHash('sha256')
            .update(readFileSync(path.join(ROOT, 'vendor/spec/openapi.yaml')))
            .digest('hex');
        expect(manifest.openapiSha256).toBe(actual);
    });

    it('records the openapi version the committed spec declares', () => {
        const raw = read('vendor/spec/openapi.yaml');
        const declared = raw.match(/^ {2}version:\s+(\S+)/m)?.[1];
        expect(declared, 'info.version in openapi.yaml').toBeDefined();
        expect(manifest.openapiVersion).toBe(declared);
    });
});

describe('vendored SPEC.md provenance table', () => {
    /**
     * Pull a value out of the two-column provenance table in SPEC.md.
     *
     * @param field - The row label, without the surrounding backticks.
     * @returns The row's value cell, trimmed of whitespace and backticks.
     */
    function provenanceRow(field: string): string | undefined {
        const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = specMarkdown.match(
            new RegExp(`^\\|\\s*\`${escaped}\`\\s*\\|([^|]*)\\|`, 'm'),
        );
        return match?.[1].replace(/`/g, '').trim();
    }

    it('has a contracts@ source row', () => {
        expect(provenanceRow('contracts@')).toMatch(SHA1_HEX);
    });

    it('agrees with MANIFEST.json about the source commit', () => {
        // Two files, one fact. They are written in the same pass, so a
        // disagreement means the writer half-applied a change.
        expect(provenanceRow('contracts@')).toBe(manifest.contractsSha);
    });

    it('points specSourceUrl at the contracts repo at that commit', () => {
        const url = provenanceRow('specSourceUrl');
        expect(url).toContain('github.com/ezclassify/contracts');
        expect(url).toContain(manifest.contractsSha);
    });
});
