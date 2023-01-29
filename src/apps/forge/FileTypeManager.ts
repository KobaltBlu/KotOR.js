/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ResourceTypes } from "../../resource/ResourceTypes";
import { EditorFile } from "./EditorFile";
import { Project } from "./Project";
import { EditorFileOptions } from "./interfaces/EditorFileOptions";
import { AudioPlayerState } from "./states/AudioPlayerState";
import { ForgeState } from "./states/ForgeState";
import { TabImageViewerState } from "./states/tabs/TabImageViewerState";
import { TabLIPEditorState } from "./states/tabs/TabLIPEditorState";
import { TabTwoDAEditorState } from "./states/tabs/TabTwoDAEditorState";

/* @file
 * The FileTypeManage class. This class was oringially designed to handle file loading inside KotOR Forge and isn't suitable for use inside the game engine
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
    res.updateOpenedFiles();

    console.log('FileTypeManager.onOpenResource', res, ext);

    switch(ext){
      case 'lyt':
      case 'vis':
      case 'txi':
      case 'txt':
        // ForgeState.tabManager.addTab(new TabTextEditorState({editorFile: res}));
      break;
      case '2da':
        ForgeState.tabManager.addTab(new TabTwoDAEditorState({editorFile: res}));
      break;
      case 'dlg':
        // ForgeState.tabManager.addTab(new TabDLGEditorState({editorFile: res}));
      break;
      case 'lip':
        ForgeState.tabManager.addTab(new TabLIPEditorState({editorFile: res}));
      break;
      case 'erf':
      case 'mod':
      case 'sav':
        // ForgeState.tabManager.addTab(new TabMODEditorState({editorFile: res}));
      break;
      case 'mdl':
      case 'mdx':
        // ForgeState.tabManager.addTab(new TabModelViewerState({editorFile: res}));
      break;
      case 'dwk':
      case 'pwk':
      case 'wok':
        // ForgeState.tabManager.addTab(new TabWalkmeshViewerState({editorFile: res}));
      break;
      case 'nss':
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
        // ForgeState.tabManager.addTab(new TabUTCEditorState({editorFile: res}));
      break;
      case 'utd':
        // ForgeState.tabManager.addTab(new TabUTDEditorState({editorFile: res}));
      break;
      case 'utp':
        // ForgeState.tabManager.addTab(new TabUTPEditorState({editorFile: res}));
      break;
      case 'gui': 
      case 'utt': 
      case 'uts': 
      case 'utw': 
      case 'ute': 
        // ForgeState.tabManager.addTab(new TabGFFEditorState({editorFile: res}));
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
