import { EditorFile } from "./EditorFile";
import { Project } from "./Project";
import { EditorFileOptions } from "./interfaces/EditorFileOptions";
import { AudioPlayerState } from "./states/AudioPlayerState";
import { ForgeState } from "./states/ForgeState";
import { TabERFEditorState, TabGFFEditorState, TabImageViewerState, TabLIPEditorState, TabModelViewerState, TabTextEditorState, TabTwoDAEditorState, TabUTCEditorState, TabUTDEditorState, TabUTPEditorState, TabWOKEditorState } from "./states/tabs";
import { ResourceTypes } from "../../KotOR";

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

    console.log('FileTypeManager.onOpenResource', res, ext);

    switch(ext){
      case 'lyt':
      case 'vis':
      case 'txi':
      case 'txt':
        ForgeState.tabManager.addTab(new TabTextEditorState({editorFile: res}));
      break;
      case '2da':
        ForgeState.tabManager.addTab(new TabTwoDAEditorState({editorFile: res}));
      break;
      case 'dlg':
        ForgeState.tabManager.addTab(new TabGFFEditorState({editorFile: res}));
        // ForgeState.tabManager.addTab(new TabDLGEditorState({editorFile: res}));
      break;
      case 'lip':
        ForgeState.tabManager.addTab(new TabLIPEditorState({editorFile: res}));
      break;
      case 'erf':
      case 'mod':
      case 'sav':
        ForgeState.tabManager.addTab(new TabERFEditorState({editorFile: res}));
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
        // ForgeState.tabManager.addTab(new TabScriptEditorState({editorFile: res}));
      break;
      case 'ncs':
        // ForgeState.tabManager.addTab(new TabScriptEditorState({editorFile: res}));
      break;
      case 'tpc':
      case 'tga':
        ForgeState.tabManager.addTab(new TabImageViewerState({editorFile: res}));
      break;
      case 'utc':
        ForgeState.tabManager.addTab(new TabUTCEditorState({editorFile: res}));
      break;
      case 'utd':
        ForgeState.tabManager.addTab(new TabUTDEditorState({editorFile: res}));
      break;
      case 'utp':
        ForgeState.tabManager.addTab(new TabUTPEditorState({editorFile: res}));
      break;
      case 'gui': 
      case 'utt': 
      case 'uts': 
      case 'utw': 
      case 'ute': 
      case 'ifo': 
      case 'are': 
      case 'git': 
        ForgeState.tabManager.addTab(new TabGFFEditorState({editorFile: res}));
      break;
      case 'bik': 
        // ForgeState.tabManager.addTab(new TabMovieViewerState({editorFile: res}));
      break;
      case 'wav':
      case 'mp3':
        console.log('audio file', res);
        AudioPlayerState.OpenAudio(res);
        // ForgeState.inlineAudioPlayer.OpenAudio({editorFile: res});

        // if(ForgeState.Project instanceof Project){
        //   ForgeState.Project.removeFromOpenFileList({editorFile: res});
        // }
      break;
      default:
        // NotificationManager.Notify(NotificationManager.Types.WARNING, `File Type: (${ext}) not yet supported`);
        // console.warn('FileTypeManager.onOpenResource', 'Unknown FileType', ext, res);
        
        // if(ForgeState.Project instanceof Project){
        //   ForgeState.Project.removeFromOpenFileList({editorFile: res});
        // }
      break;
    }

  }

}
