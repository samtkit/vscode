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
});
