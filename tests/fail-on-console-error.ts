import { format } from 'node:util';
import { afterAll, beforeEach, expect } from 'vitest';

const errors: string[] = [];
const originalError = console.error;

console.error = (...args: unknown[]) => {
    errors.push(format(...args));
    originalError.apply(console, args);
};

function assertNoErrors() {
    expect(errors.splice(0), 'Unexpected console errors').toEqual([]);
}

beforeEach(({ onTestFinished }) => {
    onTestFinished(assertNoErrors);
});

afterAll(() => {
    console.error = originalError;
    assertNoErrors();
});
