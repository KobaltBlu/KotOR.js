/**
 * Formatting utilities ported from Holocron Toolset.
 * Used for displaying sizes, progress, and other human-readable values.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * @file FormatUtils.ts
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

const SIZE_UNITS = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"] as const;

/**
 * Format a byte size as a human-readable string.
 * Ported from Holocron async_loader.human_readable_size.
 */
export function humanReadableSize(byteSize: number): string {
  let size = byteSize;
  for (const unit of SIZE_UNITS) {
    if (size < 1024) {
      return `${Math.round(size * 100) / 100} ${unit}`;
    }
    size /= 1024;
  }
  return String(size);
}

/**
 * Extract numbers from a string. Numbers are separated by any non-numeric character.
 * Ported from Holocron toolset.utils.misc.get_nums.
 */
export function getNums(stringInput: string): number[] {
  let s = "";
  const nums: number[] = [];
  for (const char of `${stringInput} `) {
    if (/\d/.test(char)) {
      s += char;
    } else if (s.trim()) {
      nums.push(parseInt(s, 10));
      s = "";
    }
  }
  return nums;
}

/**
 * Clamp a value between min and max.
 * Ported from Holocron toolset.utils.misc.clamp.
 */
export function clamp(value: number, minVal: number, maxVal: number): number {
  return Math.max(minVal, Math.min(value, maxVal));
}
