import { describe, expect, test } from '@jest/globals';
import { NWScriptDataType } from '@/enums/nwscript/NWScriptDataType';
import { NWScriptAST } from '@/nwscript/decompiler/NWScriptAST';
import { NWScriptASTCodeGenerator } from '@/nwscript/decompiler/NWScriptASTCodeGenerator';
import { NWScriptExpression } from '@/nwscript/decompiler/NWScriptExpression';

describe('NWScriptASTCodeGenerator', () => {
  test('emits global assignments using valid NSS identifiers', () => {
    const global = NWScriptAST.createGlobalVariableDeclaration(
      'globalVar_0',
      NWScriptDataType.INTEGER
    );
    const body = NWScriptAST.createBlock([
      NWScriptAST.createAssignment(
        'globalVar_0',
        NWScriptExpression.constant(1, NWScriptDataType.INTEGER),
        true
      ),
      NWScriptAST.createReturn(),
    ]);
    const main = NWScriptAST.createFunction(
      'main',
      NWScriptDataType.VOID,
      [],
      body
    );

    const source = new NWScriptASTCodeGenerator().generate(
      NWScriptAST.createProgram([global], [main])
    );

    expect(source).toContain('globalVar_0 = 1;');
    expect(source).not.toContain('GLOBAL.globalVar_0');
  });
});
