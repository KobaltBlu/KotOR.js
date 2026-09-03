import { EditorFile } from "@/apps/forge/EditorFile";
import { EditorFileOptions } from "@/apps/forge/interfaces/EditorFileOptions";
import { AudioPlayerState } from "@/apps/forge/states/AudioPlayerState";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { 
  TabAREEditorState, TabBIKPlayerState, TabDLGEditorState, TabERFEditorState, TabGFFEditorState, TabGUIEditorState, TabHexEditorState, TabIFOEditorState, TabImageViewerState, TabJRLEditorState, TabLIPEditorState, TabLYTEditorState, TabModelViewerState, TabPTHEditorState, TabSaveGameEditorState, TabSSFEditorState, TabTextEditorState, TabTLKEditorState, TabTwoDAEditorState, TabUTCEditorState,
  TabUTDEditorState, TabUTEEditorState, TabUTIEditorState, TabUTMEditorState, TabUTPEditorState, TabUTSEditorState, TabUTTEditorState, TabUTWEditorState, TabWOKEditorState 
} from "@/apps/forge/states/tabs";
import { ResourceTypes } from "@/KotOR";
import { sniffBufferLooksLikeBinary } from "@/apps/forge/helpers/sniffBufferLooksLikeBinary";
import { DefaultEditorKind, getDefaultEditor } from "@/apps/forge/settings/forgeSettings";
import { isTopLevelSaveGameSav } from "@/apps/forge/savegame/saveGamePaths";

/**
 * FileTypeManager class.
 * 
 * This class was oringially designed to handle file loading inside KotOR Forge and isn't suitable for use inside the game engine
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file FileTypeManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class FileTypeManager {

  /** Open the resource in a raw hex view (does not change extension routing). */
  static openHexEditor(options: EditorFileOptions): void {
    ForgeState.tabManager.addTab(
      new TabHexEditorState({ editorFile: new EditorFile(options) }),
    );
  }

  static onOpenFile(options: EditorFileOptions){
    FileTypeManager.onOpenResource(new EditorFile(options));
  }

  static onOpenResource(res: EditorFile|string){

    if(typeof res === 'string'){
      res = EditorFile.fromReference(res);
    }

    const ext = (
      ResourceTypes.getKeyByValue(res.reskey)
      || (typeof res.ext === 'string' ? res.ext : '')
      || 'NA'
    ).toLowerCase();

    ForgeState.addRecentFile(res);

    console.log('FileTypeManager.onOpenResource', res, ext);

    const kind = getDefaultEditor(ext);
    FileTypeManager.openWithEditor(kind, res, ext);
  }

  /**
   * Open with a specific editor. Defaults and one-shot Open with… share this factory.
   * Restored tabs do not go through here.
   */
  static openWithEditor(kind: DefaultEditorKind, res: EditorFile, ext?: string): void {
    const resolvedExt = (
      ext
      || ResourceTypes.getKeyByValue(res.reskey)
      || (typeof res.ext === 'string' ? res.ext : '')
      || 'NA'
    ).toLowerCase();

    if(kind === 'gff'){
      ForgeState.tabManager.addTab(new TabGFFEditorState({editorFile: res}));
      return;
    }
    if(kind === 'hex'){
      ForgeState.tabManager.addTab(new TabHexEditorState({editorFile: res}));
      return;
    }
    if(kind === 'text'){
      ForgeState.tabManager.addTab(new TabTextEditorState({editorFile: res}));
      return;
    }

    FileTypeManager.openNativeEditor(resolvedExt, res);
  }

  static openNativeEditor(ext: string, res: EditorFile): void {
    switch(ext){
      case 'lyt':
        ForgeState.tabManager.addTab(new TabLYTEditorState({editorFile: res}));
      break;
      case 'vis':
      case 'txi':
      case 'txt':
        ForgeState.tabManager.addTab(new TabTextEditorState({editorFile: res}));
      break;
      case '2da':
        ForgeState.tabManager.addTab(new TabTwoDAEditorState({editorFile: res}));
      break;
      case 'ssf':
        ForgeState.tabManager.addTab(new TabSSFEditorState({editorFile: res}));
      break;
      case 'tlk':
        ForgeState.tabManager.addTab(new TabTLKEditorState({editorFile: res}));
      break;
      case 'dlg':
        ForgeState.tabManager.addTab(new TabDLGEditorState({editorFile: res}));
      break;
      case 'jrl':
        ForgeState.tabManager.addTab(new TabJRLEditorState({editorFile: res}));
      break;
      case 'ifo':
        ForgeState.tabManager.addTab(new TabIFOEditorState({editorFile: res}));
      break;
      case 'are':
        ForgeState.tabManager.addTab(new TabAREEditorState({editorFile: res}));
      break;
      case 'bic':
      case 'git':
      case 'res':
      case 'fac':
        ForgeState.tabManager.addTab(new TabGFFEditorState({editorFile: res}));
      break;
      case 'lip':
        ForgeState.tabManager.addTab(new TabLIPEditorState({editorFile: res}));
      break;
      case 'erf':
      case 'mod':
        ForgeState.tabManager.addTab(new TabERFEditorState({editorFile: res}));
      break;
      case 'sav':
        if (isTopLevelSaveGameSav(res)) {
          ForgeState.tabManager.addTab(new TabSaveGameEditorState({editorFile: res}));
        } else {
          ForgeState.tabManager.addTab(new TabERFEditorState({editorFile: res}));
        }
      break;
      case 'mdl':
      case 'mdx':
        ForgeState.tabManager.addTab(new TabModelViewerState({editorFile: res}));
      break;
      case 'dwk':
      case 'pwk':
      case 'wok':
        ForgeState.tabManager.addTab(new TabWOKEditorState({editorFile: res}));
      break;
      case 'nss':
        ForgeState.tabManager.addTab(new TabTextEditorState({editorFile: res}));
      break;
      case 'ncs':
        ForgeState.tabManager.addTab(new TabTextEditorState({editorFile: res}));
      break;
      case 'tpc':
      case 'tga':
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'psd':
        ForgeState.tabManager.addTab(new TabImageViewerState({editorFile: res}));
      break;
      case 'utc':
        ForgeState.tabManager.addTab(new TabUTCEditorState({editorFile: res}));
      break;
      case 'utd':
        ForgeState.tabManager.addTab(new TabUTDEditorState({editorFile: res}));
      break;
      case 'ute':
        ForgeState.tabManager.addTab(new TabUTEEditorState({editorFile: res}));
      break;
      case 'uti':
        ForgeState.tabManager.addTab(new TabUTIEditorState({editorFile: res}));
      break;
      case 'utm': 
        ForgeState.tabManager.addTab(new TabUTMEditorState({editorFile: res}));
      break;
      case 'utp':
        ForgeState.tabManager.addTab(new TabUTPEditorState({editorFile: res}));
      break;
      case 'uts':
        ForgeState.tabManager.addTab(new TabUTSEditorState({editorFile: res}));
      break;
      case 'utt':
        ForgeState.tabManager.addTab(new TabUTTEditorState({editorFile: res}));
      break;
      case 'utw':
        ForgeState.tabManager.addTab(new TabUTWEditorState({editorFile: res}));
      break;
      case 'gui': 
        ForgeState.tabManager.addTab(new TabGUIEditorState({editorFile: res}));
      break;
      case 'pth':
        ForgeState.tabManager.addTab(new TabPTHEditorState({editorFile: res}));
      break;
      case 'bik':
        ForgeState.tabManager.addTab(new TabBIKPlayerState({editorFile: res}));
      break;
      case 'wav':
      case 'mp3':
      case 'bmu':
        console.log('audio file', res);
        AudioPlayerState.OpenAudio(res);
      break;
      default:
        void FileTypeManager.openUnknownExtensionWithSniff(res);
      break;
    }
  }

  /** Unknown extension: sniff bytes; binary → hex tab, else text editor. */
  private static async openUnknownExtensionWithSniff(res: EditorFile): Promise<void> {
    try {
      const { buffer } = await res.readFile();
      if (sniffBufferLooksLikeBinary(buffer)) {
        ForgeState.tabManager.addTab(new TabHexEditorState({ editorFile: res }));
      } else {
        ForgeState.tabManager.addTab(new TabTextEditorState({ editorFile: res }));
      }
    } catch (e) {
      console.warn("FileTypeManager.openUnknownExtensionWithSniff", e);
      ForgeState.tabManager.addTab(new TabTextEditorState({ editorFile: res }));
    }
  }

}
