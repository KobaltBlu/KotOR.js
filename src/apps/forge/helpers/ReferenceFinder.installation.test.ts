import {
  findConversationReferences,
  findFieldValueReferences,
  findResrefReferences,
  findScriptReferences,
  findTagReferences,
  findTemplateResrefReferences,
} from '@/apps/forge/helpers/ReferenceFinderCore';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { getTestInstallationPath, loadTestInstallation } from '@/tests/helpers/testInstallation';

jest.setTimeout(300000);

const hasInstallPath = !!getTestInstallationPath();
let resources: Awaited<ReturnType<typeof loadTestInstallation>> | null = null;

(hasInstallPath ? describe : describe.skip)('ReferenceFinder installation coverage', () => {
  beforeAll(async () => {
    resources = await loadTestInstallation();
  });

  const requireInstallation = () => {
    if (!resources) {
      throw new Error('KOTOR_INSTALL_PATH or KOTOR2_INSTALL_PATH must be set to run reference finder tests.');
    }
  };

  test('findScriptReferences basic', async () => {
    requireInstallation();
    let results = await findScriptReferences(resources?.resources ?? [], 'k_ai_master', {
      partialMatch: false,
      caseSensitive: false,
    });

    if (results.length === 0 && resources) {
      results = await findScriptReferences(resources.resources, 'k_ai', {
        partialMatch: true,
        caseSensitive: false,
      });
    }

    for (const result of results) {
      expect(result).toBeDefined();
      expect(result.fileResource).toBeDefined();
      expect(result.fieldPath).toBeTruthy();
      expect(result.matchedValue).toBeTruthy();
      expect(['UTC', 'UTD', 'UTP', 'UTT', 'ARE', 'IFO', 'NCS', 'DLG', 'GIT']).toContain(result.fileType);
    }
  });

  test('findScriptReferences supports partialMatch and caseSensitive', async () => {
    requireInstallation();
    const partial = await findScriptReferences(resources?.resources ?? [], 'k_ai', {
      partialMatch: true,
      caseSensitive: false,
    });
    for (const result of partial) {
      expect(result.matchedValue.toLowerCase()).toContain('k_ai');
    }

    const sensitive = await findScriptReferences(resources?.resources ?? [], 'k_ai', {
      partialMatch: true,
      caseSensitive: true,
    });
    const insensitive = await findScriptReferences(resources?.resources ?? [], 'K_AI', {
      partialMatch: true,
      caseSensitive: false,
    });
    expect(insensitive.length).toBeGreaterThanOrEqual(sensitive.length);
  });

  test('findScriptReferences supports filePattern and fileTypes filters', async () => {
    requireInstallation();
    const resultsModules = await findScriptReferences(resources?.resources ?? [], 'k_ai_master', {
      partialMatch: false,
      caseSensitive: false,
      filePattern: '*.mod',
    });
    const resultsUtc = await findScriptReferences(resources?.resources ?? [], 'k_ai_master', {
      partialMatch: false,
      caseSensitive: false,
      fileTypes: new Set(['UTC']),
    });

    expect(Array.isArray(resultsModules)).toBe(true);
    expect(Array.isArray(resultsUtc)).toBe(true);

    for (const result of resultsModules) {
      const filename = (result.fileResource.containerPath || '').toLowerCase();
      expect(filename.endsWith('.mod') || filename.includes('module')).toBe(true);
    }

    for (const result of resultsUtc) {
      expect(result.fileType).toBe('UTC');
    }
  });

  test('findScriptReferences surfaces NCS bytecode hits and empty results', async () => {
    requireInstallation();
    const results = await findScriptReferences(resources?.resources ?? [], 'k_ai_master', {
      partialMatch: false,
      caseSensitive: false,
    });

    const ncsResults = results.filter((result) => result.fileType === 'NCS');
    for (const result of ncsResults) {
      expect(result.fieldPath).toBe('(NCS bytecode)');
      expect(result.byteOffset).toBeDefined();
    }

    const emptyResults = await findScriptReferences(resources?.resources ?? [], 'nonexistent_script_xyz123', {
      partialMatch: false,
      caseSensitive: false,
    });
    expect(emptyResults).toEqual([]);
  });

  test('findTagReferences covers result shape, filters, and no-hit cases', async () => {
    requireInstallation();
    let results = await findTagReferences(resources?.resources ?? [], 'player', {
      partialMatch: false,
      caseSensitive: false,
    });

    if (results.length === 0) {
      results = await findTagReferences(resources?.resources ?? [], 'play', {
        partialMatch: true,
        caseSensitive: false,
      });
    }

    for (const result of results) {
      expect(result.fileResource).toBeDefined();
      expect(result.fieldPath).toBeTruthy();
      expect(result.matchedValue).toBeTruthy();
      expect(['UTC', 'UTD', 'UTP', 'UTT', 'UTI', 'UTM', 'UTW', 'GIT']).toContain(result.fileType);
    }

    const patterned = await findTagReferences(resources?.resources ?? [], 'player', {
      partialMatch: false,
      caseSensitive: false,
      filePattern: '*.utc',
    });
    expect(Array.isArray(patterned)).toBe(true);

    const utcOnly = await findTagReferences(resources?.resources ?? [], 'player', {
      partialMatch: false,
      caseSensitive: false,
      fileTypes: new Set(['UTC']),
    });
    for (const result of utcOnly) {
      expect(result.fileType).toBe('UTC');
    }

    const sensitive = await findTagReferences(resources?.resources ?? [], 'player', {
      partialMatch: false,
      caseSensitive: true,
    });
    const insensitive = await findTagReferences(resources?.resources ?? [], 'PLAYER', {
      partialMatch: false,
      caseSensitive: false,
    });
    expect(insensitive.length).toBeGreaterThanOrEqual(sensitive.length);

    const emptyResults = await findTagReferences(resources?.resources ?? [], 'nonexistent_tag_xyz123', {
      partialMatch: false,
      caseSensitive: false,
    });
    expect(emptyResults).toEqual([]);
  });

  test('findTemplateResrefReferences covers shape, filters, and empty search', async () => {
    requireInstallation();
    const results = await findTemplateResrefReferences(resources?.resources ?? [], 'p_hk47', {
      partialMatch: false,
      caseSensitive: false,
    });

    for (const result of results) {
      expect(result.fileResource).toBeDefined();
      const fieldLabel = result.fieldPath.split('.').pop() || result.fieldPath;
      expect(
        fieldLabel === 'TemplateResRef' || fieldLabel === 'InventoryRes' || result.fieldPath.includes('ItemList')
      ).toBe(true);
      expect(result.matchedValue).toBeTruthy();
      expect(['UTC', 'UTD', 'UTP', 'UTT', 'UTI', 'UTM']).toContain(result.fileType);
    }

    const partial = await findTemplateResrefReferences(resources?.resources ?? [], 'p_hk', {
      partialMatch: true,
      caseSensitive: false,
    });
    for (const result of partial) {
      expect(result.matchedValue.toLowerCase()).toContain('p_hk');
    }

    const utcOnly = await findTemplateResrefReferences(resources?.resources ?? [], 'p_hk47', {
      partialMatch: false,
      caseSensitive: false,
      fileTypes: new Set(['UTC']),
    });
    for (const result of utcOnly) {
      expect(result.fileType).toBe('UTC');
    }

    const emptyResults = await findTemplateResrefReferences(resources?.resources ?? [], 'nonexistent_template_xyz_123', {
      partialMatch: false,
      caseSensitive: false,
    });
    expect(emptyResults).toEqual([]);
  });

  test('findConversationReferences covers result shape, filters, and valid file types', async () => {
    requireInstallation();
    const results = await findConversationReferences(resources?.resources ?? [], 'k_pdan_m12aa', {
      partialMatch: false,
      caseSensitive: false,
    });

    for (const result of results) {
      expect(result.fileResource).toBeDefined();
      expect(result.fieldPath === 'Conversation' || result.fieldPath === 'Mod_OnStart').toBe(true);
      expect(result.matchedValue).toBeTruthy();
      expect(['UTC', 'UTD', 'UTP', 'IFO']).toContain(result.fileType);
    }

    const partial = await findConversationReferences(resources?.resources ?? [], 'k_pdan', {
      partialMatch: true,
      caseSensitive: false,
    });
    for (const result of partial) {
      expect(result.matchedValue.toLowerCase()).toContain('k_pdan');
      expect(new Set(['UTC', 'UTD', 'UTP', 'IFO']).has(result.fileType)).toBe(true);
    }

    const utcOnly = await findConversationReferences(resources?.resources ?? [], 'k_pdan_m12aa', {
      partialMatch: false,
      caseSensitive: false,
      fileTypes: new Set(['UTC']),
    });
    for (const result of utcOnly) {
      expect(result.fileType).toBe('UTC');
    }
  });

  test('findResrefReferences and findFieldValueReferences support field filtering', async () => {
    requireInstallation();
    const resrefResults = await findResrefReferences(resources?.resources ?? [], 'k_ai_master', {
      partialMatch: false,
      caseSensitive: false,
      fieldTypes: new Set([GFFDataType.RESREF]),
    });
    expect(Array.isArray(resrefResults)).toBe(true);

    const fieldValueResults = await findFieldValueReferences(resources?.resources ?? [], 'player', {
      partialMatch: false,
      caseSensitive: false,
      fieldNames: new Set(['Tag']),
    });
    for (const result of fieldValueResults) {
      expect(result.fieldPath).toContain('Tag');
    }

    const multiFieldResults = await findFieldValueReferences(resources?.resources ?? [], 'coorta', {
      partialMatch: false,
      caseSensitive: false,
      fieldNames: new Set(['Tag', 'TemplateResRef']),
    });
    expect(Array.isArray(multiFieldResults)).toBe(true);
  });
});