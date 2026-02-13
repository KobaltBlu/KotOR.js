import { createScopedLogger, LogScope } from "../../utility/Logger";

import { ResourceTypes } from "../../KotOR";

import { EditorFile } from "./EditorFile";
import { EditorFileOptions } from "./interfaces/EditorFileOptions";
import { AudioPlayerState } from "./states/AudioPlayerState";
import { ForgeState } from "./states/ForgeState";
import {
  TabERFEditorState, TabGFFEditorState, TabGUIEditorState, TabImageViewerState, TabLIPEditorState, TabModelViewerState, TabPTHEditorState, TabTextEditorState, TabTwoDAEditorState, TabUTCEditorState,
  TabUTDEditorState, TabUTEEditorState, TabUTIEditorState, TabUTMEditorState, TabUTPEditorState, TabUTSEditorState, TabUTTEditorState, TabUTWEditorState, TabWOKEditorState, TabBinaryViewerState,
  TabAREEditorState, TabIFOEditorState, TabJRLEditorState, TabSSFEditorState, TabTLKEditorState, TabFACEditorState, TabLTREditorState, TabDLGEditorState, TabGITEditorState, TabSAVEditorState, TabVISEditorState,
  TabIndoorBuilderState
} from "./states/tabs";

const log = createScopedLogger(LogScope.Forge);

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

  static onOpenFile(options: EditorFileOptions){
    FileTypeManager.onOpenResource(new EditorFile(options));
  }

  /**
   * Open a resource in the generic GFF editor (e.g. from "Open with Generic GFF").
   * Use this when the file type normally has a specific editor (e.g. UTS) but the user wants the raw GFF tree.
   */
  static onOpenResourceAsGff(res: EditorFile | string): void {
    const file = typeof res === 'string' ? new EditorFile({ path: res }) : res;
    ForgeState.addRecentFile(file);
    log.debug('FileTypeManager.onOpenResourceAsGff', file);
    ForgeState.tabManager.addTab(new TabGFFEditorState({ editorFile: file }));
  }

  static onOpenResource(res: EditorFile|string){

    let ext = 'NA';

    if(typeof res === 'string'){
      res = new EditorFile({path: res});
      ext = ResourceTypes.getKeyByValue(res.reskey);
    }else{
      ext = ResourceTypes.getKeyByValue(res.reskey);
    }

    //Update the opened files list
    ForgeState.addRecentFile(res);

    log.debug('FileTypeManager.onOpenResource', res, ext);

    switch(ext){
      case 'lyt':
      case 'txi':
      case 'txt':
        ForgeState.tabManager.addTab(new TabTextEditorState({editorFile: res}));
      break;
      case '2da':
        ForgeState.tabManager.addTab(new TabTwoDAEditorState({editorFile: res}));
      break;
      case 'dlg':
        ForgeState.tabManager.addTab(new TabDLGEditorState({editorFile: res}));
      break;
      case 'lip':
        ForgeState.tabManager.addTab(new TabLIPEditorState({editorFile: res}));
      break;
      case 'erf':
      case 'mod':
        ForgeState.tabManager.addTab(new TabERFEditorState({editorFile: res}));
      break;
      case 'sav':
        ForgeState.tabManager.addTab(new TabSAVEditorState({editorFile: res}));
      break;
      case 'mdl':
      case 'mdx':
        ForgeState.tabManager.addTab(new TabModelViewerState({editorFile: res}));
      break;
      case 'dwk':
      case 'pwk':
      case 'wok':
      case 'bwm':
        ForgeState.tabManager.addTab(new TabWOKEditorState({editorFile: res}));
      break;
      case 'nss':
        ForgeState.tabManager.addTab(new TabTextEditorState({editorFile: res}));
        // ForgeState.tabManager.addTab(new TabScriptEditorState({editorFile: res}));
      break;
      case 'ncs':
        ForgeState.tabManager.addTab(new TabTextEditorState({editorFile: res}));
        // ForgeState.tabManager.addTab(new TabScriptEditorState({editorFile: res}));
      break;
      case 'tpc':
      case 'tga':
      case 'bmp':
      case 'dds':
        ForgeState.tabManager.addTab(new TabImageViewerState({editorFile: res}));
      break;
      case 'ltr':
        ForgeState.tabManager.addTab(new TabLTREditorState({editorFile: res}));
      break;
      case 'ssf':
        ForgeState.tabManager.addTab(new TabSSFEditorState({editorFile: res}));
      break;
      case 'fac':
        ForgeState.tabManager.addTab(new TabFACEditorState({editorFile: res}));
      break;
      case 'tlk':
        ForgeState.tabManager.addTab(new TabTLKEditorState({editorFile: res}));
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
      case 'are':
        ForgeState.tabManager.addTab(new TabAREEditorState({editorFile: res}));
      break;
      case 'ifo':
        ForgeState.tabManager.addTab(new TabIFOEditorState({editorFile: res}));
      break;
      case 'jrl':
        ForgeState.tabManager.addTab(new TabJRLEditorState({editorFile: res}));
      break;
      case 'git':
        ForgeState.tabManager.addTab(new TabGITEditorState({editorFile: res}));
      break;
      case 'res':
      case 'gff':
        ForgeState.tabManager.addTab(new TabGFFEditorState({editorFile: res}));
      break;
      case 'vis':
        ForgeState.tabManager.addTab(new TabVISEditorState({editorFile: res}));
      break;
      case 'indoor':
        ForgeState.tabManager.addTab(new TabIndoorBuilderState({editorFile: res}));
      break;
      case 'bik':
        // ForgeState.tabManager.addTab(new TabMovieViewerState({editorFile: res}));
      break;
      case 'wav':
      case 'mp3':
        log.debug('audio file', res);
        AudioPlayerState.OpenAudio(res);
        // ForgeState.inlineAudioPlayer.OpenAudio({editorFile: res});

        // if(ForgeState.Project instanceof Project){
        //   ForgeState.Project.removeFromOpenFileList({editorFile: res});
        // }
      break;
      default:
        ForgeState.tabManager.addTab(new TabBinaryViewerState({editorFile: res}));
        // NotificationManager.Notify(NotificationManager.Types.WARNING, `File Type: (${ext}) not yet supported`);
        // console.warn('FileTypeManager.onOpenResource', 'Unknown FileType', ext, res);

        // if(ForgeState.Project instanceof Project){
        //   ForgeState.Project.removeFromOpenFileList({editorFile: res});
        // }
      break;
    }

  }

}
