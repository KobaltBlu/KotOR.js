/**
 * ConversationState enum.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ConversationState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum ConversationState {
  INVALID = -1,
  LISTENING_TO_SPEAKER = 0,
  WAITING_FOR_PC_CHOICE = 1,
  CONTINUE_DIALOG = 2,
  END_DIALOG = 3,
}
