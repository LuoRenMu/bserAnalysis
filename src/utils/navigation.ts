import type { NavigateFunction } from "react-router-dom";
import type { CharacterBrief } from "../types/bser";
import { findCharacterIdByName, getCharacterDetailPath } from "./character";

/**
 * Navigates to a character's detail page by character name.
 * Searches for an exact name match and navigates to the character detail route.
 *
 * @param navigate - React Router navigate function
 * @param characters - Array of character briefs
 * @param characterName - Name of the character to navigate to
 * @returns true if navigation was successful, false if character not found
 *
 * @example
 * const success = navigateToCharacterByName(navigate, characters, "雅典娜");
 * if (!success) console.log("Character not found");
 */
export function navigateToCharacterByName(
  navigate: NavigateFunction,
  characters: CharacterBrief[],
  characterName: string
): boolean {
  const characterId = findCharacterIdByName(characters, characterName);
  if (!characterId) {
    console.warn(`Character not found: ${characterName}`);
    return false;
  }
  navigate(getCharacterDetailPath(characterId));
  return true;
}

/**
 * Creates a click handler for navigating to a character detail page.
 * Useful for creating onClick handlers with proper event handling.
 * The returned handler stops event propagation by default to prevent
 * triggering parent element click handlers.
 *
 * @param navigate - React Router navigate function
 * @param characters - Array of character briefs
 * @param characterName - Name of the character
 * @param stopPropagation - Whether to stop event propagation (default: true)
 * @returns Click event handler function
 *
 * @example
 * <button onClick={createCharacterNavigationHandler(navigate, characters, "雅典娜")}>
 *   View Character
 * </button>
 */
export function createCharacterNavigationHandler(
  navigate: NavigateFunction,
  characters: CharacterBrief[],
  characterName: string,
  stopPropagation = true
) {
  return (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    navigateToCharacterByName(navigate, characters, characterName);
  };
}

/**
 * Type guard to check if characters and navigate are available.
 * Useful for conditional rendering before navigation attempts.
 *
 * @param characters - Character briefs array or undefined
 * @param navigate - Navigate function or undefined
 * @returns true if both parameters are available and ready for navigation
 *
 * @example
 * if (canNavigateToCharacter(characters, navigate)) {
 *   // Safe to navigate
 * }
 */
export function canNavigateToCharacter(
  characters: CharacterBrief[] | undefined,
  navigate: NavigateFunction | undefined
): navigate is NavigateFunction {
  return !!(characters?.length && navigate);
}
