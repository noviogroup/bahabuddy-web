import { describe, test, expect } from 'vitest';

import {
  parseCardsFromContent,
  deriveTitleFromMessage,
} from '@/lib/chat-utils';

/**
 * Tests for chat-utils.
 *
 * parseCardsFromContent extracts JSON card fences embedded in Claude's
 * streamed prose. The fence shape is documented in chat-tools.ts —
 * the regex accepts both ```card-data and ```json fenced blocks
 * containing an object with card_type or cards.
 *
 * deriveTitleFromMessage powers the chat-thread sidebar — it must
 * never produce an empty string (would render as a blank thread row).
 */

describe('parseCardsFromContent', () => {
  test('content with no fence returns empty cards and the original text', () => {
    const input = 'Just a normal message from Buddy.';
    const result = parseCardsFromContent(input);
    expect(result.cards).toEqual([]);
    expect(result.text).toBe('Just a normal message from Buddy.');
  });

  test('extracts a single card-data fence and strips it from text', () => {
    const input = [
      'Check out this hotel:',
      '```card-data',
      '{"card_type":"hotel","name":"Atlantis","rating":4.5}',
      '```',
      'It is on Paradise Island.',
    ].join('\n');

    const result = parseCardsFromContent(input);

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].card_type).toBe('hotel');
    expect(result.cards[0].name).toBe('Atlantis');

    // The fence is removed from the text but the surrounding prose stays.
    expect(result.text).not.toContain('card-data');
    expect(result.text).not.toContain('Atlantis');
    expect(result.text).toContain('Check out this hotel');
    expect(result.text).toContain('It is on Paradise Island');
  });

  test('also accepts ```json fences (legacy alias)', () => {
    const input = '```json\n{"card_type":"flight","route":"MIA → NAS"}\n```';
    const result = parseCardsFromContent(input);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].card_type).toBe('flight');
  });

  test('extracts multiple fences and preserves order', () => {
    const input = [
      'First:',
      '```card-data',
      '{"card_type":"hotel","name":"A"}',
      '```',
      'Then:',
      '```card-data',
      '{"card_type":"restaurant","name":"B"}',
      '```',
    ].join('\n');

    const result = parseCardsFromContent(input);
    expect(result.cards.map((c) => c.card_type)).toEqual([
      'hotel',
      'restaurant',
    ]);
    expect(result.cards.map((c) => c.name)).toEqual(['A', 'B']);
  });

  test('accepts a "cards" wrapper (mixed bundle)', () => {
    // A mixed message can be a single fence with a `cards` array.
    const input = [
      '```card-data',
      '{"cards":[{"card_type":"hotel","name":"A"},{"card_type":"activity","name":"B"}]}',
      '```',
    ].join('\n');

    const result = parseCardsFromContent(input);
    expect(result.cards).toHaveLength(1);
    expect(Array.isArray(result.cards[0].cards)).toBe(true);
  });

  test('skips invalid JSON inside a fence (does not crash)', () => {
    const input = [
      'Before',
      '```card-data',
      '{not valid json',
      '```',
      'After',
    ].join('\n');

    const result = parseCardsFromContent(input);
    expect(result.cards).toEqual([]);
    // Malformed fences are LEFT in place — the user sees the raw text
    // rather than silently losing content.
    expect(result.text).toContain('not valid json');
  });

  test('skips JSON that does not look like a card (no card_type or cards key)', () => {
    const input = '```card-data\n{"random":"object","without":"shape"}\n```';
    const result = parseCardsFromContent(input);
    expect(result.cards).toEqual([]);
  });

  test('handles surrounding whitespace cleanly', () => {
    const input =
      '   \n```card-data\n{"card_type":"hotel"}\n```\n   ';
    const result = parseCardsFromContent(input);
    expect(result.cards).toHaveLength(1);
    expect(result.text).toBe('');
  });
});

describe('deriveTitleFromMessage', () => {
  test('takes the first 6 words', () => {
    const t = deriveTitleFromMessage(
      'I want to plan a Bahamas honeymoon for next March',
    );
    expect(t).toBe('I want to plan a Bahamas');
  });

  test('strips punctuation', () => {
    const t = deriveTitleFromMessage('Hi! Can you help me — please?');
    expect(t).toBe('Hi Can you help me please');
  });

  test('collapses multiple whitespace characters', () => {
    const t = deriveTitleFromMessage('foo    bar\t\tbaz\n\nqux');
    expect(t).toBe('foo bar baz qux');
  });

  test('trims leading/trailing whitespace', () => {
    expect(deriveTitleFromMessage('   hello world   ')).toBe('hello world');
  });

  test('never returns an empty string (falls back to "New Chat")', () => {
    // Critical: a blank chat sidebar row would look like a bug.
    expect(deriveTitleFromMessage('')).toBe('New Chat');
    expect(deriveTitleFromMessage('     ')).toBe('New Chat');
    expect(deriveTitleFromMessage('...?!')).toBe('New Chat');
    expect(deriveTitleFromMessage('🎉🎉🎉')).toBe('New Chat');
  });

  test('handles a single short word', () => {
    expect(deriveTitleFromMessage('Hi')).toBe('Hi');
  });

  test('does not pad short input', () => {
    expect(deriveTitleFromMessage('Two words')).toBe('Two words');
  });
});
