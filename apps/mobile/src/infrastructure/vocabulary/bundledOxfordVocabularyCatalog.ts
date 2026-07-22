import type {
  VocabularyCatalog,
  VocabularyQuery,
} from '@application/ports/vocabularyCatalog';
import { cefrLevels, type CefrLevel, type VocabularyItem } from '@domain/index';

import rawOxfordVocabulary from './oxford-5000.json';
import rawRussianTranslations from './oxford-5000-ru.json';

// UnknownRecord is the safe object shape used while validating untrusted JSON.
type UnknownRecord = Record<string, unknown>;

// Type guard contract: narrows unknown seed values before property reads.
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

// Required string reader trims trusted text after enforcing presence.
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

// Optional string reader preserves absent seed fields while rejecting wrong types.
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

// CEFR reader validates the seed level against the domain-supported list.
function readOptionalCefrLevel(
  value: unknown,
  context: string,
): CefrLevel | undefined {
  // The shipped Oxford seed contains a few blank levels; they are skipped so
  // one malformed optional field does not break the offline dictionary.
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

// Translation parser validates the bundled Russian sidecar before domain objects use it.
function parseRussianTranslations(rawValue: unknown): ReadonlyMap<string, string> {
  if (!isRecord(rawValue)) {
    throw new Error('Russian vocabulary translations must be an object');
  }

  return new Map(
    Object.entries(rawValue).map(([id, translation]) => {
      if (typeof translation !== 'string' || translation.trim().length === 0) {
        throw new Error(`Russian vocabulary translation ${id} must be non-empty`);
      }

      return [id, translation.trim()] as const;
    }),
  );
}

// Example reader validates the offline sentences shown in dictionary details.
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

// Seed parser is the trust boundary between bundled JSON and domain vocabulary.
function parseVocabulary(rawValue: unknown): readonly VocabularyItem[] {
  if (!Array.isArray(rawValue)) {
    throw new Error('Oxford vocabulary seed must be an array');
  }

  // translationsById joins the independently licensed sidecar by stable Oxford id.
  const translationsById: ReadonlyMap<string, string> =
    parseRussianTranslations(rawRussianTranslations);

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

    // translation is required for every word exposed by the offline catalog.
    const translation: string | undefined = translationsById.get(String(entry.id));

    if (!translation) {
      throw new Error(`${context} must include a Russian translation`);
    }

    return [{
      id: String(entry.id),
      word,
      translation,
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

// BundledOxfordVocabularyCatalog exposes the read-only offline Oxford catalog.
export class BundledOxfordVocabularyCatalog implements VocabularyCatalog {
  // vocabulary stores validated domain items so UI never reads raw seed objects.
  private readonly vocabulary = parseVocabulary(rawOxfordVocabulary);
  // vocabularyById provides stable route lookup for dictionary detail sheets.
  private readonly vocabularyById = new Map(
    this.vocabulary.map((item) => [item.id, item]),
  );
  // vocabularyByLevel avoids refiltering the whole catalog for common CEFR tabs.
  private readonly vocabularyByLevel = new Map<CefrLevel, readonly VocabularyItem[]>(
    cefrLevels.map((level) => [
      level,
      this.vocabulary.filter((item) => item.level === level),
    ]),
  );

  // getById fulfills the catalog port for one selected dictionary item.
  async getById(id: string): Promise<VocabularyItem | undefined> {
    return this.vocabularyById.get(id);
  }

  // list fulfills the catalog port for local browsing and search.
  async list(query: VocabularyQuery = {}): Promise<readonly VocabularyItem[]> {
    const candidates = query.level
      ? (this.vocabularyByLevel.get(query.level) ?? [])
      : this.vocabulary;
    // search is normalized once to keep matching deterministic across filters.
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
