/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ResourceTypes } from "../resource/ResourceTypes";
import { EditorFile } from "./EditorFile";
import { Forge } from "./Forge";
import { NotificationManager } from "./NotificationManager";
import { Project } from "./Project";
import { 
  DLGEditorTab, ImageViewerTab, LIPEditorTab, MODEditorTab, ModelViewerTab, MovieViewerTab,
  ScriptEditorTab, TextEditorTab, TwoDAEditorTab, UTCEditorTab, UTDEditorTab, UTPEditorTab,
  WalkmeshViewerTab
} from "./tabs";

/* @file
 * The FileTypeManage class. This class was oringially designed to handle file loading inside KotOR Forge and isn't suitable for use inside the game engine
 */

export class FileTypeManager {

  static onOpenFile(file: any){
    FileTypeManager.onOpenResource(new EditorFile({path: file.path}));
  }

  static onOpenResource(res: any){

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
        let textTab = Forge.tabManager.AddTab(new TextEditorTab(res));
      break;
      case '2da':
        let twodaTab = Forge.tabManager.AddTab(new TwoDAEditorTab(res));
      break;
      case 'dlg':
        let newDLGTab = Forge.tabManager.AddTab(new DLGEditorTab(res));
      break;
      case 'lip':
        let lipTab = Forge.tabManager.AddTab(new LIPEditorTab(res));
      break;
      case 'erf':
      case 'mod':
      case 'sav':
        let erfTab = Forge.tabManager.AddTab(new MODEditorTab(res));
      break;
      case 'mdl':
      case 'mdx':
        let modelTab = Forge.tabManager.AddTab(new ModelViewerTab(res));
      break;
      case 'dwk':
      case 'pwk':
      case 'wok':
        let walkmeshTab = Forge.tabManager.AddTab(new WalkmeshViewerTab(res));
      break;
      case 'nss':
        let nssTab = Forge.tabManager.AddTab(new ScriptEditorTab(res));
      break;
      case 'ncs':
        let ncsTab = Forge.tabManager.AddTab(new ScriptEditorTab(res));
      break;
      case 'tpc':
      case 'tga':
        let tgaTab = Forge.tabManager.AddTab(new ImageViewerTab(res));
      break;
      case 'utc':
        let newUTCTab = Forge.tabManager.AddTab(new UTCEditorTab(res));
      break;
      case 'utd':
        let newUTDTab = Forge.tabManager.AddTab(new UTDEditorTab(res));
      break;
      case 'utp':
        let newUTPTab = Forge.tabManager.AddTab(new UTPEditorTab(res));
      break;
      case 'bik': 
        let newBIKTab = Forge.tabManager.AddTab(new MovieViewerTab(res));
      break;
      case 'wav':
      case 'mp3':
        Forge.inlineAudioPlayer.OpenAudio(res);

        if(Forge.Project instanceof Project){
          Forge.Project.removeFromOpenFileList(res);
        }
      break;
      default:
        NotificationManager.Notify(NotificationManager.Types.WARNING, `File Type: (${ext}) not yet supported`);
        console.warn('FileTypeManager.onOpenResource', 'Unknown FileType', ext, res);
        
        if(Forge.Project instanceof Project){
          Forge.Project.removeFromOpenFileList(res);
        }
      break;
    }

  }

}
