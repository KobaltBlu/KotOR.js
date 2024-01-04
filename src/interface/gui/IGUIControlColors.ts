import type * as THREE from "three";

/**
 * IGUIControlColors interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IGUIControlColors.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IGUIControlColors {
    BORDER: THREE.Color;
    BORDER_HOVER: THREE.Color;

    BORDER_HIGHLIGHT: THREE.Color;
    BORDER_HIGHLIGHT_HOVER: THREE.Color;

    TEXT: THREE.Color;
    TEXT_HIGHLIGHT: THREE.Color;
}