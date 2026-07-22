import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const oxfordPath = join(projectRoot, 'words', 'oxford-5000.json');
const outputPaths = [
  join(projectRoot, 'words', 'oxford-5000-ru.json'),
  join(
    projectRoot,
    'apps',
    'mobile',
    'src',
    'infrastructure',
    'vocabulary',
    'oxford-5000-ru.json',
  ),
];
const freeDictUrl =
  'https://download.freedict.org/generated/eng-rus/eng-rus.tei';
const freeDictCachePath = join(
  tmpdir(),
  'context-english-freedict',
  'eng-rus.tei',
);
const supportedLevels = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const partOfSpeechAliases = new Map([
  ['noun', ['n']],
  ['verb', ['v']],
  ['modal verb', ['v']],
  ['auxiliary verb', ['v']],
  ['linking verb', ['v']],
  ['adjective', ['adj']],
  ['adverb', ['adv']],
  ['pronoun', ['pronoun']],
  ['preposition', ['preposition']],
  ['determiner', ['determiner']],
  ['number', ['numeral']],
  ['ordinal number', ['numeral']],
  ['conjunction', ['conjunction']],
  ['exclamation', ['interjection']],
  ['definite article', ['determiner']],
  ['indefinite article', ['determiner']],
  ['infinitive marker', ['particle']],
]);

async function loadFreeDictXml() {
  try {
    return await readFile(freeDictCachePath, 'utf8');
  } catch {
    const response = await fetch(freeDictUrl);

    if (!response.ok) {
      throw new Error(`FreeDict download failed with ${response.status}.`);
    }

    const xml = await response.text();
    await mkdir(dirname(freeDictCachePath), { recursive: true });
    await writeFile(freeDictCachePath, xml, 'utf8');
    return xml;
  }
}

function decodeXmlText(value) {
  return value
    .replace(/<[^>]+>/gu, '')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .trim();
}

function parseFreeDict(xml) {
  const entriesByWord = new Map();

  for (const match of xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gu)) {
    const entry = match[1];
    const wordMatch = entry.match(/<orth(?:\s[^>]*)?>([\s\S]*?)<\/orth>/u);
    const translationMatch = entry.match(
      /<cit\s+type="trans"[^>]*>[\s\S]*?<quote(?:\s[^>]*)?>([\s\S]*?)<\/quote>/u,
    );

    if (!wordMatch || !translationMatch) {
      continue;
    }

    const word = decodeXmlText(wordMatch[1]).toLocaleLowerCase('en');
    const posMatch = entry.match(/<pos(?:\s[^>]*)?>([\s\S]*?)<\/pos>/u);
    const candidate = {
      pos: posMatch ? decodeXmlText(posMatch[1]) : '',
      translation: decodeXmlText(translationMatch[1]),
    };
    const candidates = entriesByWord.get(word) ?? [];
    candidates.push(candidate);
    entriesByWord.set(word, candidates);
  }

  return entriesByWord;
}

async function translateFallbackWords(items) {
  const translations = new Map();

  for (let offset = 0; offset < items.length; offset += 35) {
    const batch = items.slice(offset, offset + 35);
    const query = batch.map((item) => item.value.word.trim()).join('\n');
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.search = new URLSearchParams({
      client: 'gtx',
      dt: 't',
      q: query,
      sl: 'en',
      tl: 'ru',
    }).toString();
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Fallback translation failed with ${response.status}.`);
    }

    const payload = await response.json();
    const values = payload[0]
      .map((segment) => segment[0])
      .join('')
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length !== batch.length) {
      throw new Error(
        `Fallback batch returned ${values.length} translations for ${batch.length} words.`,
      );
    }

    batch.forEach((item, index) => translations.set(String(item.id), values[index]));
  }

  return translations;
}

const oxfordEntries = JSON.parse(await readFile(oxfordPath, 'utf8')).filter(
  (entry) => supportedLevels.has(entry.value.level),
);
const entriesByWord = parseFreeDict(await loadFreeDictXml());
const translations = {};
const missingEntries = [];

for (const entry of oxfordEntries) {
  const candidates =
    entriesByWord.get(entry.value.word.trim().toLocaleLowerCase('en')) ?? [];

  if (candidates.length === 0) {
    missingEntries.push(entry);
    continue;
  }

  const aliases = partOfSpeechAliases.get(entry.value.type) ?? [];
  const candidate =
    candidates.find(({ pos }) => aliases.includes(pos)) ?? candidates[0];
  translations[String(entry.id)] = candidate.translation;
}

const fallbackTranslations = await translateFallbackWords(missingEntries);

for (const entry of missingEntries) {
  translations[String(entry.id)] = fallbackTranslations.get(String(entry.id));
}

if (
  Object.keys(translations).length !== oxfordEntries.length ||
  Object.values(translations).some(
    (translation) => typeof translation !== 'string' || !translation.trim(),
  )
) {
  throw new Error('Generated Russian vocabulary is incomplete.');
}

const output = `${JSON.stringify(translations, null, 2)}\n`;

for (const outputPath of outputPaths) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, 'utf8');
}

console.log(
  `Generated ${Object.keys(translations).length} translations (${missingEntries.length} fallback).`,
);
