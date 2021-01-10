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

    //Check to see if the EditorFile has the path variable set.
    //If not it's because the file was created in memory and hasn't been saved to the HDD yet
    if(res.path && !res.archive_path){
      let pjIndex = recent_files.indexOf(res.path);
      if (pjIndex > -1) {
        recent_files.splice(pjIndex, 1);
      }

      //Append this file to the beginning of the list
      recent_files.unshift(res.path);
      Config.save(null, true); //Save the configuration silently
    }else if(res.archive_path){
      let tmp_path = res.archive_path + '?' + res.resref + '.' + res.ext;
      let pjIndex = recent_files.indexOf(tmp_path);
      if (pjIndex > -1) {
        recent_files.splice(pjIndex, 1);
      }

      //Append this file to the beginning of the list
      recent_files.unshift(tmp_path);
      Config.save(null, true); //Save the configuration silently
    }

    console.log(res, ext);

    switch(ext){
      case 'lyt':
      case 'vis':
      case 'txi':
        let textTab = tabManager.AddTab(new TextEditorTab(res));
      break;
      case '2da':
        let twodaTab = tabManager.AddTab(new TwoDAEditorTab(res));
      break;
      case 'dlg':
        let newDLGTab = tabManager.AddTab(new DLGEditorTab(res));
      //  newUTCTab.OpenFile(file);
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
      case 'nss':
        let nssTab = tabManager.AddTab(new ScriptEditorTab(res));
      break;
      case 'ncs':
        let ncsTab = tabManager.AddTab(new ScriptEditorTab(res));
      break;
      case 'tpc':
        let tpcTab = tabManager.AddTab(new ImageViewerTab(res));
      break;
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
      break;
      default:
        NotificationManager.Notify(NotificationManager.Types.WARNING, "File Type: ("+ext+") not yet supported");
        console.log('Unknown', res, ext);
      break;
    }

  }

}

module.exports = FileTypeManager;
