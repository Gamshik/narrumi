import type {
  VocabularyCatalog,
  VocabularyQuery,
} from '@application/ports/vocabularyCatalog';
import { cefrLevels, type CefrLevel, type VocabularyItem } from '@domain/index';

import rawOxfordVocabulary from '../../../../../words/oxford-5000.json';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function readRequiredString(
  record: UnknownRecord,
  key: string,
  context: string,
): string {
  const value = record[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${context}.${key} must be a non-empty string`);
  }

  return value.trim();
}

function readOptionalString(
  record: UnknownRecord,
  key: string,
  context: string,
): string | undefined {
  const value = record[key];

  if (value === undefined || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`${context}.${key} must be a string when provided`);
  }

  return value.trim() || undefined;
}

function readOptionalCefrLevel(
  value: unknown,
  context: string,
): CefrLevel | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`${context}.level must be a supported CEFR level`);
  }

  const normalizedLevel = value.trim();

  if (normalizedLevel.length === 0) {
    return undefined;
  }

  if (!cefrLevels.includes(normalizedLevel as CefrLevel)) {
    throw new Error(`${context}.level must be a supported CEFR level`);
  }

  return normalizedLevel as CefrLevel;
}

function readExamples(value: unknown, context: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${context}.examples must be an array`);
  }

  return value.map((example, index) => {
    if (typeof example !== 'string' || example.trim().length === 0) {
      throw new Error(`${context}.examples[${index}] must be a non-empty string`);
    }

    return example.trim();
  });
}

function parseVocabulary(rawValue: unknown): readonly VocabularyItem[] {
  if (!Array.isArray(rawValue)) {
    throw new Error('Oxford vocabulary seed must be an array');
  }

  return rawValue.flatMap((entry, index) => {
    const context = `Oxford vocabulary seed[${index}]`;

    if (!isRecord(entry) || !isRecord(entry.value)) {
      throw new Error(`${context} must include a value object`);
    }

    if (typeof entry.id !== 'number' || !Number.isInteger(entry.id)) {
      throw new Error(`${context}.id must be an integer`);
    }

    const phonetics = entry.value.phonetics;

    if (!isRecord(phonetics)) {
      throw new Error(`${context}.value.phonetics must be an object`);
    }

    const ukPhonetics = readOptionalString(
      phonetics,
      'uk',
      `${context}.value.phonetics`,
    );
    const usPhonetics = readOptionalString(
      phonetics,
      'us',
      `${context}.value.phonetics`,
    );
    const word = readRequiredString(entry.value, 'word', `${context}.value`);
    const partOfSpeech = readRequiredString(
      entry.value,
      'type',
      `${context}.value`,
    );
    const examples = readExamples(entry.value.examples, `${context}.value`);
    const level = readOptionalCefrLevel(entry.value.level, `${context}.value`);

    if (!level) {
      return [];
    }

    return [{
      id: String(entry.id),
      word,
      partOfSpeech,
      level,
      examples,
      phonetics: {
        ...(ukPhonetics ? { uk: ukPhonetics } : {}),
        ...(usPhonetics ? { us: usPhonetics } : {}),
      },
    }];
  });
}

export class BundledOxfordVocabularyCatalog implements VocabularyCatalog {
  private readonly vocabulary = parseVocabulary(rawOxfordVocabulary);
  private readonly vocabularyById = new Map(
    this.vocabulary.map((item) => [item.id, item]),
  );
  private readonly vocabularyByLevel = new Map<CefrLevel, readonly VocabularyItem[]>(
    cefrLevels.map((level) => [
      level,
      this.vocabulary.filter((item) => item.level === level),
    ]),
  );

  async getById(id: string): Promise<VocabularyItem | undefined> {
    return this.vocabularyById.get(id);
  }

  async list(query: VocabularyQuery = {}): Promise<readonly VocabularyItem[]> {
    const candidates = query.level
      ? (this.vocabularyByLevel.get(query.level) ?? [])
      : this.vocabulary;
    const search = query.search?.trim().toLocaleLowerCase();

    if (!search) {
      return candidates;
    }

    return candidates.filter(
      (item) =>
        item.word.toLocaleLowerCase().includes(search) ||
        item.partOfSpeech.toLocaleLowerCase().includes(search),
    );
  }
}
