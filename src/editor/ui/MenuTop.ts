import { AudioEngine } from "../../audio/AudioEngine";
import { ResourceTypes } from "../../resource/ResourceTypes";
import { ConfigClient } from "../../utility/ConfigClient";
import { EditorFile } from "../EditorFile";
import { FileTypeManager } from "../FileTypeManager";
import { Forge } from "../Forge";
import { Project } from "../Project";
import { LIPEditorTab, QuickStartTab, ScriptEditorTab, UTCEditorTab, UTDEditorTab, UTPEditorTab } from "../tabs";
import { NewProjectWizard } from "../wizards";

export class MenuTop {
  
  options: any = {
    title: 'KotOR Forge',
    items: [
      {name: 'File', items: [
        {name: 'Open Project', onClick: async () => {
          // let payload = await dialog.showOpenDialog({
          //   properties: ['openFile', 'createDirectory'],
          //   filters: [
          //     {name: 'KForge Project', extensions: ['json']}
          // ]});
          // if(!payload.canceled && payload.filePaths.length){
          //   Forge.Project = new Project( path.dirname(payload.filePaths[0]) );
          //   Forge.Project.Open(() => {
          //     Forge.loader.SetMessage("Loading Complete");
          //     //Fade out the loading screen because the app is ready
          //     Forge.loader.Dismiss();
          //   });
          // }
        }},
        {name: 'New Project', onClick: () => {
          let newProjectWizard = new NewProjectWizard();
          newProjectWizard.Show();
        }},
        {name: 'Save Project'},
        {name: 'Close Project', onClick: () => {
          Forge.Project = undefined as any;
          for(let i = 0; i < Forge.tabManager.tabs.length; i++){
            Forge.tabManager.tabs[i].Remove();
          }
          Forge.tabManager.AddTab(new QuickStartTab());
        }},
        {type: 'separator'},
        {name: 'Change Game', onClick: async function(){
          
          // let game_choice = await dialog.showMessageBox({
          //   type: 'info',
          //   title: 'Switch Game?',
          //   message: 'Choose which game you would like to switch to.',
          //   buttons: compatible_profiles.map( (p) => p.name ),
          //   defaultId: 0,
          //   cancelId: -1,
          // });

          // let profile = compatible_profiles[game_choice.response];

          // if(isProfileSupported(profile)){

          //   if(GameKey != getProfileGameKey(profile)){
          //     GameKey = getProfileGameKey(profile);
          //     app_profile = ConfigClient.get(['Profiles', profile.key]);
          //     Config.set(['Editor', 'profile'], profile.key);
          //     initialize();
          //   }

          // }

          // console.log(game_choice.response);

        }},
        {type: 'separator'},
        {name: 'New', items: [
          {type: 'title', name: 'Engine Resource'},
          {name: 'Lip Sync File', onClick: function(){
            Forge.tabManager.AddTab(new LIPEditorTab(new EditorFile({ resref: 'new_lip', reskey: ResourceTypes.lip })));
          }},
          {name: 'NW Script Source File', onClick: function(){
            Forge.tabManager.AddTab(new ScriptEditorTab(new EditorFile({ resref: 'untitled', reskey: ResourceTypes.nss })));
          }},
          {type: 'title', name: 'Blueprints'},
          {name: '.UTC - Creature', onClick: function(){
            Forge.tabManager.AddTab(new UTCEditorTab(new EditorFile({ resref: 'new_creature', reskey: ResourceTypes.utc })));
          }},
          {name: '.UTD - Door', onClick: function(){
            Forge.tabManager.AddTab(new UTDEditorTab(new EditorFile({ resref: 'new_door', reskey: ResourceTypes.utd })));
          }},
          {name: '.UTP - Placeable', onClick: function(){
            Forge.tabManager.AddTab(new UTPEditorTab(new EditorFile({ resref: 'new_placeable', reskey: ResourceTypes.utp })));
          }},
          {name: '.UTS - Sound', onClick: function(){
            // Forge.tabManager.AddTab(new UTPEditorTab(new EditorFile({ resref: 'new_sound', reskey: ResourceTypes.uts })));
          }},
          {name: '.UTM - Store', onClick: function(){
            // Forge.tabManager.AddTab(new UTPEditorTab(new EditorFile({ resref: 'new_store', reskey: ResourceTypes.utm })));
          }},
          {name: '.UTT - Trigger', onClick: function(){
            // Forge.tabManager.AddTab(new UTPEditorTab(new EditorFile({ resref: 'new_trigger', reskey: ResourceTypes.utt })));
          }},
          {name: '.UTW - Waypoint', onClick: function(){
            // Forge.tabManager.AddTab(new UTPEditorTab(new EditorFile({ resref: 'new_waypoint', reskey: ResourceTypes.utw })));
          }},
        ]},
        {name: 'Open File', onClick: function(){
          // dialog.showOpenDialog(
          //   {
          //     title: 'Open File',
          //     filters: [
          //       {name: 'All Supported Formats', extensions: ['tpc', 'tga', 'wav', 'mp3', 'bik', 'gff', 'utc', 'utd', 'utp', 'utm', 'uts', 'utt', 'utw', 'lip', 'mod', 'nss', 'ncs', 'erf', 'rim', 'git', 'are', 'ifo', 'mdl', 'mdx', 'wok', 'pwk', 'dwk', 'lyt', 'vis', 'pth']},
          //       {name: 'TPC Image', extensions: ['tpc']},
          //       {name: 'TGA Image', extensions: ['tga']},
          //       {name: 'GFF', extensions: ['gff']},
          //       {name: 'Creature Template', extensions: ['utc']},
          //       {name: 'Door Template', extensions: ['utd']},
          //       {name: 'Placeable Template', extensions: ['utp']},
          //       {name: 'Merchant Template', extensions: ['utm']},
          //       {name: 'Sound Template', extensions: ['uts']},
          //       {name: 'Trigger Template', extensions: ['utt']},
          //       {name: 'Waypoint Template', extensions: ['utw']},
          //       {name: 'LIP Animation', extensions: ['lip']},
          //       {name: 'Audio File', extensions: ['wav', 'mp3']},
          //       {name: 'Video File', extensions: ['bik']},
          //       {name: 'MOD File', extensions: ['mod']},
          //       {name: 'ERF File', extensions: ['erf']},
          //       {name: 'RIM File', extensions: ['rim']},
          //       {name: 'Model File', extensions: ['mdl', 'mdx', 'wok', 'pwk', 'dwk']},
          //       {name: 'Module File', extensions: ['git', 'ifo']},
          //       {name: 'Area File', extensions: ['are']},
          //       {name: 'Path File', extensions: ['pth']},
          //       {name: 'Script Source File', extensions: ['ncs']},
          //       {name: 'Script Compiled File', extensions: ['nss']},
          //       {name: 'VIS File', extensions: ['vis']},
          //       {name: 'Layout File', extensions: ['lyt']},
          //       {name: 'All Formats', extensions: ['*']},
          //     ],
          //     properties: ['createDirectory'],
          //   }
          // ).then(result => {
          //   if(!result.canceled){
          //     if(result.filePaths.length){
          //       let filename = result.filePaths[0].split(path.sep).pop();
          //       let fileParts = filename.split('.');

          //       FileTypeManager.onOpenFile({path: result.filePaths[0], filename: filename, name: fileParts[0], ext: fileParts[1]});
          //     }
          //   }
          //   console.log(result.canceled);
          //   console.log(result.filePaths);
          // });
        }},
        {name: 'Save File', accelerator: 'Ctrl+S', onClick: function(){

          // if(Forge.tabManager.currentTab instanceof EditorTab){
          //   try{
          //     Forge.tabManager.currentTab.Save();
          //   }catch(e){
          //     console.error(e);
          //   }
          // }

        }},
        {name: 'Compile File', accelerator: 'Ctrl+Shift+C', onClick: function(){

          // if(Forge.tabManager.currentTab instanceof EditorTab){
          //   try{
          //     Forge.tabManager.currentTab.Compile();
          //   }catch(e){
          //     console.error(e);
          //   }
          // }

        }},
        {name: 'Save File As', accelerator: 'Ctrl+Shift+S', onClick: function(){

          // if(Forge.tabManager.currentTab instanceof EditorTab){
          //   try{
          //     Forge.tabManager.currentTab.SaveAs();
          //   }catch(e){
          //     console.error(e);
          //   }
          // }

        }},
        {name: 'Save All Files'},
        {name: 'Close File'},
        {type: 'separator'},
        {name: 'Recent Projects', type: 'title'},
        {type: 'separator'},
        {name: 'Exit', onClick: function(){
          (window as any).canUnload = true;
          window.close();
        }}
      ]},
      {name: 'Project', items: [
        {name: 'Open Module Editor', onClick: () => {
          if(Forge.Project instanceof Project){
            Forge.Project.openModuleEditor();
          }else{
            alert('Open or start a new project to use this feature');
          }
        }}
      ]},
      {name: 'View', items: [
        {name: 'Left Pane Toggle', onClick: () => {
          //@ts-expect-error
          $('#container').layout().toggle('west');
        }},
        /*{name: 'Right Pane Toggle', onClick: () => {
          $('#container').layout().toggle('east');
        }},
        {name: 'Audio Player Toggle', onClick: () => {
          if(inlineAudioPlayer.IsVisible()){
            inlineAudioPlayer.Hide();
          }else{
            inlineAudioPlayer.Show();
          }
        }},*/
        {name: 'Audio Toggle Mute', onClick: () => {
          AudioEngine.ToggleMute();
        }}
      ]},
      /*{name: 'Settings', onClick: function(){
        let configWizard = new ConfigWizard();
      }}*/
    ]
  };

  BuildTopMenu() {

    let $newMenu = $(`<nav class="top-menu navbar navbar-default" role="navigation">
      <div class="menu-accent"><span class="inner"></span></div>
      <b id="app-title"></b>
      <div class="navbar-header">
        <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
          <span class="icon-bar"></span>
          <span class="icon-bar"></span>
          <span class="icon-bar"></span>
        </button>
      </div>
      <div class="navbar-collapse collapse">
        <ul id="topmenu-left" class="nav navbar-nav navbar-left">
        </ul>
        <ul id="topmenu-right" class="nav navbar-nav navbar-right">
          <li><a href="#" id="devtools-toggle"><span class="glyphicon glyphicon-cog"></span></a></li>
          <li><a href="#" id="minimize-toggle"><span class="glyphicon glyphicon-minus"></span></a></li>
          <li><a href="#" id="maximize-toggle"><span class="glyphicon glyphicon-resize-full"></span></a></li>
          <li><a href="#" id="close-toggle"><span class="glyphicon glyphicon-remove"></span></a></li>
        </ul>
      </div>
    </nav>`);

    // if (typeof global.TopMenu.title == 'undefined') {
    //   global.TopMenu.title = 'KotOR Modding Suite';
    // }

    // Object.defineProperty(global.TopMenu, 'windowTitle', {
    //   get: function() {
    //     return windowTitle;
    //   },
    //   set: function(windowTitle) {
    //     $('b#app-title', $newMenu).text(windowTitle);
    //   }
    // });

    $('body').prepend($newMenu);

    $('b#app-title', $newMenu).text(this.options.title);

    this.options.items.forEach( (item: any, i: any) => {
      this.BuildMenuItem(item, null)
    });

  }

  BuildMenuItem(item: any, $parent: any){
    let topLevel = false;
    let $item;
    if($parent == null){
      topLevel = true;
      $parent = $('#topmenu-left');
    }

    if (typeof item.type == 'undefined') {
      item.type = 'item';
    }

    if (typeof item.name == 'undefined') {
      item.name = '';
    }

    //Build Item
    if(item.type === 'separator' || item.type === 'sep')
      $item = $(`<li role="d-flex separator" class="divider" ></li>`);
    else if(item.type === 'title')
      $item = $(`<li class="title"><span class="d-flex "><span class="flex-grow-1">${item.name}</span></span></li>`);
    else
      $item = $(
      `<li class="dropdown-item">
        <a href="#">
          <span class="dropdown-item-name-wrapper d-flex">
            <span class="flex-grow-1 dropdown-item-name">${item.name}</span>
            <span class="dropdown-item-action">${item.accelerator ? item.accelerator : ''}</span>
            <span class="dropdown-item-more">
              <span class="glyphicon glyphicon-chevron-right"></span>
            </span>
          </span>
        </a>
      </li>`);

    $parent.append($item);

    //Set onClick Event
    if (typeof item.onClick !== 'undefined') {
      $item.on('click', item.onClick);
    }else{
      $item.on('click', function(e){
        e.preventDefault();
      });
    }

    //If there are child items
    if(typeof item.items !== 'undefined'){
      if(item.items.length){
        $parent = $('<ul class="dropdown-menu"/>');

        if(!topLevel){
          $parent.addClass('side');
        }

        $item.append($parent);
        $item.addClass('dropdown');
        $('a', $item).addClass('dropdown-toggle').attr('data-toggle','dropdown').attr('role','button').attr('aria-haspopup','true').attr('aria-expanded','false');
      }

      for(let i = 0; i < item.items.length; i++){
        this.BuildMenuItem(item.items[i], $parent)
      }
    }

  }

// BuildTopMenu();
}