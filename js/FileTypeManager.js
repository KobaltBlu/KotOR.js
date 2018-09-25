/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The FileTypeManage class. This class was oringially designed to handle file loading inside KotOR Forge and isn't suitable for use inside the game engine
 */

class FileTypeManager {

  static onOpenFile(file){
    FileTypeManager.onOpenResource(file.path);
    /*let pathInfo = Utility.filePathInfo(file.path);
    let ext = pathInfo.file.ext;

    let pjIndex = Config.options.recent_files.indexOf(file.path);
    if (pjIndex > -1) {
      Config.options.recent_files.splice(pjIndex, 1);
    }

    //Append this file to the beginning of the list
    Config.options.recent_files.unshift(file.path);
    Config.Save(null, true); //Save the configuration silently

    switch(ext){
      case '2da':
        let twodaTab = tabManager.AddTab(new TwoDAEditorTab(file.path));
      break;
      case 'mdl':
      case 'mdx':
        let modelTab = tabManager.AddTab(new ModelViewerTab(file.path));
      break;
      case 'nss':
        let nssTab = tabManager.AddTab(new ScriptEditorTab());
        nssTab.OpenFile(file.path);
      break;
      case 'ncs':
        let ncsTab = tabManager.AddTab(new ScriptEditorTab());
        ncsTab.OpenFile(file.path);
      break;
      case 'tpc':
        let tpcTab = tabManager.AddTab(new ImageViewerTab(file.path));
      break;
      case 'tga':
        let tgaTab = tabManager.AddTab(new ImageViewerTab(file.path));
      break;
      case 'utc':
        let newUTCTab = tabManager.AddTab(new UTCEditorTab({file: file}));
        //newUTCTab.OpenFile(file);
      break;
      case 'wav':
      let wave = new AudioFile(file.path, () => {
        inlineAudioPlayer.OpenAudio(wave);
      });

      break;
      default:
        let newGffTab = tabManager.AddTab(new GFFEditorTab());
        newGffTab.OpenFile(file);
      break;
    }*/
  }

  static onOpenResource(res){

    let pathInfo = Utility.filePathInfo(res);

    let pjIndex = Config.options.recent_files.indexOf(res);
    if (pjIndex > -1) {
      Config.options.recent_files.splice(pjIndex, 1);
    }

    //Append this file to the beginning of the list
    Config.options.recent_files.unshift(res);
    Config.Save(null, true); //Save the configuration silently

    //if(pathInfo.location == 'archive'){
      switch(pathInfo.file.ext){
        case '2da':
          let twodaTab = tabManager.AddTab(new TwoDAEditorTab(res));
        break;
        case 'dlg':
          let newDLGTab = tabManager.AddTab(new DLGEditorTab({file: res}));
        //  newUTCTab.OpenFile(file);
        break;
        case 'mdl':
        case 'mdx':
          let modelTab = tabManager.AddTab(new ModelViewerTab(res));
        break;
        case 'nss':
          let nssTab = tabManager.AddTab(new ScriptEditorTab());
          nssTab.OpenFile(res);
        break;
        case 'ncs':
          let ncsTab = tabManager.AddTab(new ScriptEditorTab());
          ncsTab.OpenFile(res);
        break;
        case 'tpc':
          let tpcTab = tabManager.AddTab(new ImageViewerTab(res));
        break;
        case 'tga':
          let tgaTab = tabManager.AddTab(new ImageViewerTab(res));
        break;
        case 'utc':
          let newUTCTab = tabManager.AddTab(new UTCEditorTab({file: res}));
        //  newUTCTab.OpenFile(file);
        break;
        case 'wav':
        case 'mp3':
          inlineAudioPlayer.OpenAudio(new AudioFile(res));
        break;
        default:
          console.log('Unknown', res, ResKey);
        break;
      }
    /*}else{
      console.log('Unknown ResKey', res);
    }*/
  }

}

module.exports = FileTypeManager;
