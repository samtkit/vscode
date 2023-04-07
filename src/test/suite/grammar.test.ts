import assert from 'assert/strict';
import { Convert, TextmateGrammar, Pattern } from '../generated/textmate-grammar';
import { readFile } from 'fs/promises';
import path from 'path';

async function readGrammar(): Promise<TextmateGrammar> {
    const grammarPath = path.resolve(__dirname, '../../../syntaxes/samt.tmLanguage.json');
    const grammarJson = await readFile(grammarPath, 'utf8');
    return Convert.toTextmateGrammar(grammarJson);
}

suite('TextMate Grammar Test Suite', () => {
    test('scope name is source.samt', async () => {
        const grammar = await readGrammar();
        assert.equal(grammar.scopeName, 'source.samt');
    });

    test('name is SAMT', async () => {
        const grammar = await readGrammar();
        assert.equal(grammar.name, 'SAMT');
    });

    test('fileTypes are samt', async () => {
        const grammar = await readGrammar();
        assert.deepEqual(grammar.fileTypes, ['samt']);
    });

    test('#code is included in all patterns', async () => {
        function isStringOrComment({ name }: Pattern): boolean {
            if (name == null) {
                return false;
            }
            return /^(comment|string)(\.|$)/.test(name);
        }

        function checkPatternRecursive(pattern: Pattern) {
            if (pattern.begin == null && pattern.end == null || isStringOrComment(pattern)) {
                return;
            }
            assert(pattern.patterns?.some(p => p.include === '#code'), `code was not included in pattern ${JSON.stringify(pattern)}`);
            pattern.patterns?.forEach(checkPatternRecursive);
        }

        const grammar = await readGrammar();
        grammar.patterns.forEach(checkPatternRecursive);
        for (const [key, value] of Object.entries(grammar.repository ?? {})) {
            if (key === 'code') {
                continue;
            }
            checkPatternRecursive(value);
        }
    });

    test('scope names end with .samt', async () => {
        function checkPatternRecursive({ name, patterns, captures, beginCaptures, endCaptures, whileCaptures }: Pattern) {
            assert(name == null || name.endsWith('.samt'), `scope name "${name}" does not end with .samt`);
            patterns?.forEach(checkPatternRecursive);
            for (const c of [captures, beginCaptures, endCaptures, whileCaptures]) {
                if (c == null) {
                    continue;
                }
                Object.values(c).forEach(checkPatternRecursive);
            }
        }

        const grammar = await readGrammar();
        grammar.patterns.forEach(checkPatternRecursive);
        Object.values(grammar.repository ?? {}).forEach(checkPatternRecursive);
    });

    test('no unused values in repositories', async () => {
        function findUsedPatterns(patterns: Pattern[]): Set<string> {
            const keys = new Set<string>();
            for (const { include, patterns: childPatterns } of patterns) {
                if (include?.startsWith('#')) {
                    keys.add(include.substring(1));
                }
                if (childPatterns) {
                    findUsedPatterns(childPatterns).forEach(k => keys.add(k));
                }
            }
            return keys;
        }

        const grammar = await readGrammar();
        if (grammar.repository == null) {
            return;
        }

        const allKeys = new Set(Object.keys(grammar.repository));
        const encounteredKeys = new Set([...findUsedPatterns(grammar.patterns), ...findUsedPatterns(Object.values(grammar.repository))]);
        assert.deepEqual(encounteredKeys, allKeys);
    });
});
