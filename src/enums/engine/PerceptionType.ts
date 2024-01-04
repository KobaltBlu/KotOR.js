/**
 * PerceptionMask enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file PerceptionMask.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @see https://nwnlexicon.com/index.php?title=Perception
 * @enum
 */
export enum PerceptionType {
  PERCEPTION_SEEN_AND_HEARD         = 0x00, // Both seen and heard (Spot beats Hide, Listen beats Move Silently).
  PERCEPTION_NOT_SEEN_AND_NOT_HEARD = 0x01, // Neither seen nor heard (Hide beats Spot, Move Silently beats Listen).
  PERCEPTION_HEARD_AND_NOT_SEEN     = 0x02, // Heard only (Hide beats Spot, Listen beats Move Silently). Usually arouses suspicion for a creature to take a closer look.
  PERCEPTION_SEEN_AND_NOT_HEARD     = 0x03, // Seen only (Spot beats Hide, Move Silently beats Listen). Usually causes a creature to take instant notice.
  PERCEPTION_NOT_HEARD              = 0x04, // Not heard (Move Silently beats Listen), no line of sight.
  PERCEPTION_HEARD                  = 0x05, // Heard (Listen beats Move Silently), no line of sight.
  PERCEPTION_NOT_SEEN               = 0x06, // Not seen (Hide beats Spot), too far away to heard or magically silenced.
  PERCEPTION_SEEN                   = 0x07, // Seen (Spot beats Hide), too far away to heard or magically silenced.
}