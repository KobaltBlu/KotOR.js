/**
 * Format serialization utilities for converting between JSON, XML, YAML, and TOML.
 * Used by resource *Object classes for toJSON/fromJSON/toXML/fromXML/toYAML/fromYAML/toTOML/fromTOML.
 */

import TOML from '@ltd/j-toml';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import YAML from 'yaml';

const XML_ROOT = 'resource';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
  isArray: (name) => ['entries', 'rows', 'resources', 'keyframes', 'sound_refs', 'bifs', 'keys', 'localizedStrings', 'keyList', 'rooms', 'doorhooks', 'tracks', 'obstacles', 'headers'].includes(name),
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
});

export function objectToXML(obj: unknown): string {
  const wrapped = { [XML_ROOT]: obj };
  return xmlBuilder.build(wrapped);
}

export function xmlToObject(xml: string): unknown {
  const parsed = xmlParser.parse(xml) as Record<string, unknown> | undefined;
  const root = parsed?.[XML_ROOT];
  return root !== undefined ? root : parsed;
}

export function objectToYAML(obj: unknown): string {
  return YAML.stringify(obj);
}

export function yamlToObject(yaml: string): unknown {
  return YAML.parse(yaml);
}

type TomlStringifyTable = Parameters<typeof TOML.stringify>[0];

export function objectToTOML(obj: unknown): string {
  try {
    return TOML.stringify(obj as TomlStringifyTable, { newline: '\n' });
  } catch {
    return TOML.stringify({ data: obj } as TomlStringifyTable, { newline: '\n' });
  }
}

export function tomlToObject(toml: string): unknown {
  const parsed = TOML.parse(toml) as Record<string, unknown> | undefined;
  if (parsed && typeof parsed === 'object' && Object.keys(parsed).length === 1 && 'data' in parsed) {
    return parsed.data;
  }
  return parsed;
}