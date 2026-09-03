/**
 * Shared in-flow / overlay menu item model.
 *
 * @file forgeMenuItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface ForgeMenuItem {
  id?: string;
  label?: string;
  shortcut?: string;
  detail?: string;
  onClick?: () => void;
  children?: ForgeMenuItem[];
  disabled?: boolean;
  separator?: boolean;
  checked?: boolean;
  radio?: boolean;
  header?: boolean;
}
