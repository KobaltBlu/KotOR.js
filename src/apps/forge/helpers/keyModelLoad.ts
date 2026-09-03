/**
 * Guard OdysseyModel3D.FromMDL: the loader rejects when the MDL is missing.
 *
 * @file keyModelLoad.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export function shouldBuildFromMdl(mdl: unknown, hasGameData: boolean): boolean {
  return !!hasGameData && mdl != null;
}
