/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ResourceTypes } from "../../resource/ResourceTypes";
import { EditorFile } from "./EditorFile";
import { Project } from "./Project";
import { EditorFileOptions } from "./interfaces/EditorFileOptions";
import { AudioPlayerState } from "./states/AudioPlayerState";
import { ForgeState } from "./states/ForgeState";
import { TabImageViewerState } from "./states/tabs/TabImageViewerState";

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
        // let textTab = Forge.tabManager.addTab(new TextEditorTab(res));
      break;
      case '2da':
        // let twodaTab = Forge.tabManager.addTab(new TwoDAEditorTab(res));
      break;
      case 'dlg':
        // let newDLGTab = Forge.tabManager.addTab(new DLGEditorTab(res));
      break;
      case 'lip':
        // let lipTab = Forge.tabManager.addTab(new LIPEditorTab(res));
      break;
      case 'erf':
      case 'mod':
      case 'sav':
        // let erfTab = Forge.tabManager.addTab(new MODEditorTab(res));
      break;
      case 'mdl':
      case 'mdx':
        // let modelTab = Forge.tabManager.addTab(new ModelViewerTab(res));
      break;
      case 'dwk':
      case 'pwk':
      case 'wok':
        // let walkmeshTab = Forge.tabManager.addTab(new WalkmeshViewerTab(res));
      break;
      case 'nss':
        // let nssTab = Forge.tabManager.addTab(new ScriptEditorTab(res));
      break;
      case 'ncs':
        // let ncsTab = Forge.tabManager.addTab(new ScriptEditorTab(res));
      break;
      case 'tpc':
      case 'tga':
        ForgeState.tabManager.addTab(new TabImageViewerState({editorFile: res}));
      break;
      case 'utc':
        // let newUTCTab = Forge.tabManager.addTab(new UTCEditorTab(res));
      break;
      case 'utd':
        // let newUTDTab = Forge.tabManager.addTab(new UTDEditorTab(res));
      break;
      case 'utp':
        // let newUTPTab = Forge.tabManager.addTab(new UTPEditorTab(res));
      break;
      case 'gui': 
      case 'utt': 
      case 'uts': 
      case 'utw': 
      case 'ute': 
        // let newGFFTab = Forge.tabManager.addTab(new GFFEditorTab(res));
      break;
      case 'bik': 
        // let newBIKTab = Forge.tabManager.addTab(new MovieViewerTab(res));
      break;
      case 'wav':
      case 'mp3':
        console.log('audio file', res);
        AudioPlayerState.OpenAudio(res);
        // Forge.inlineAudioPlayer.OpenAudio(res);

        // if(Forge.Project instanceof Project){
        //   Forge.Project.removeFromOpenFileList(res);
        // }
      break;
      default:
        // NotificationManager.Notify(NotificationManager.Types.WARNING, `File Type: (${ext}) not yet supported`);
        // console.warn('FileTypeManager.onOpenResource', 'Unknown FileType', ext, res);
        
        // if(Forge.Project instanceof Project){
        //   Forge.Project.removeFromOpenFileList(res);
        // }
      break;
    }

  }

}
