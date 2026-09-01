/**
 * WeatherCondition enum.
 *
 * Retail area SetWeather / AIUpdate weather types.
 * Lightning is not a weather type — ChanceLightning overlays fx_lightning01
 * while rain or snow is active.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file WeatherCondition.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum WeatherCondition {
  CLEAR = 0,
  RAIN = 1,
  SNOW = 2,
}
