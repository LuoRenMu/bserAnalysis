import type { CharacterBrief } from "../types/bser";

function findCharacterByName(
  characters: CharacterBrief[],
  name: string
): CharacterBrief | undefined {
  return characters.find((c) => c.name === name);
}

/**
 * Finds a character ID by name.
 * @param characters - Array of character briefs
 * @param name - Character name to search for
 * @returns The character ID or undefined
 */
export function findCharacterIdByName(
  characters: CharacterBrief[],
  name: string
): number | undefined {
  return findCharacterByName(characters, name)?.id;
}

/**
 * Generates a character detail page path.
 * @param characterId - The character ID
 * @returns The route path
 */
export function getCharacterDetailPath(characterId: number): string {
  return `/characters/${characterId}`;
}
