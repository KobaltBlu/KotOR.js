/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The FileTypeManage class. This class was oringially designed to handle file loading inside KotOR Forge and isn't suitable for use inside the game engine
 */

class FileTypeManager {

  static onOpenFile(file){
    FileTypeManager.onOpenResource(new EditorFile({path: file.path}));
  }

  static onOpenResource(res){

    let ext = 'NA';

    if(typeof res === 'string'){
      res = new EditorFile({path: res});
      ext = ResourceTypes.getKeyByValue(res.reskey);
    }else{
      ext = ResourceTypes.getKeyByValue(res.reskey);
    }

    let recent_files = Config.getRecentFiles();

    //Update the opened files list
    if(res.getPath()){
      let index = recent_files.indexOf(res.getPath());
      if (index >= 0) {
        recent_files.splice(index, 1);
      }

      //Append this file to the beginning of the list
      recent_files.unshift(res.getPath());
      Config.save(null, true); //Save the configuration silently

      //Notify the project we have opened a new file
      if(Global.Project instanceof Project){
        Global.Project.addToOpenFileList(res);
      }
    }

    console.log('FileTypeManager.onOpenResource', res, ext);

    switch(ext){
      case 'lyt':
      case 'vis':
      case 'txi':
      case 'txt':
        let textTab = tabManager.AddTab(new TextEditorTab(res));
      break;
      case '2da':
        let twodaTab = tabManager.AddTab(new TwoDAEditorTab(res));
      break;
      case 'dlg':
        let newDLGTab = tabManager.AddTab(new DLGEditorTab(res));
      break;
      case 'lip':
        let lipTab = tabManager.AddTab(new LIPEditorTab(res));
      break;
      case 'erf':
      case 'mod':
      case 'sav':
        let erfTab = tabManager.AddTab(new MODEditorTab(res));
      break;
      case 'mdl':
      case 'mdx':
        let modelTab = tabManager.AddTab(new ModelViewerTab(res));
      break;
      case 'dwk':
      case 'pwk':
      case 'wok':
        let walkmeshTab = tabManager.AddTab(new WalkmeshViewerTab(res));
      break;
      case 'nss':
        let nssTab = tabManager.AddTab(new ScriptEditorTab(res));
      break;
      case 'ncs':
        let ncsTab = tabManager.AddTab(new ScriptEditorTab(res));
      break;
      case 'tpc':
      case 'tga':
        let tgaTab = tabManager.AddTab(new ImageViewerTab(res));
      break;
      case 'utc':
        let newUTCTab = tabManager.AddTab(new UTCEditorTab(res));
      break;
      case 'utd':
        let newUTDTab = tabManager.AddTab(new UTDEditorTab(res));
      break;
      case 'utp':
        let newUTPTab = tabManager.AddTab(new UTPEditorTab(res));
      break;
      case 'bik':
        let newBIKTab = tabManager.AddTab(new MovieViewerTab(res));
      break;
      case 'wav':
      case 'mp3':
        inlineAudioPlayer.OpenAudio(res);

        if(Global.Project instanceof Project){
          Global.Project.removeFromOpenFileList(res);
        }
      break;
      default:
        NotificationManager.Notify(NotificationManager.Types.WARNING, `File Type: (${ext}) not yet supported`);
        console.warn('FileTypeManager.onOpenResource', 'Unknown FileType', ext, res);
        
        if(Global.Project instanceof Project){
          Global.Project.removeFromOpenFileList(res);
        }
      break;
    }

  }

}

module.exports = FileTypeManager;
