class ProjectExplorerTab extends EditorTab {
  constructor(){
    super({closeable: false});

    this.$tabName.text("Project");

    this.$scrollContainer = $(`<div class="scroll-container" style="width:100%; overflow: auto;" />`);
    this.$treeView = $('<ul class="tree css-treeview js" />');

    this.$scrollContainer.append(this.$treeView);
    this.$tabContent.append(this.$scrollContainer);

    this.nodeList = [];
    this.treeIndex = 0;
    this.$treeView.html('');

  }

  //let folder = {name: folder_name, type: 'group', nodeList: []};
  //let index = targetFolder.nodeList.push({name: parts[i].trim(), type: 'group', nodeList: []}) - 1;

  initialize(){

    this.nodeList = [];

    this.bpCreatures = {name: 'Blueprint Creatures', type: 'group', nodeList: []}
    this.bpDoors = {name: 'Blueprint Doors', type: 'group', nodeList: []}
    this.bpEncounters = {name: 'Blueprint Encounters', type: 'group', nodeList: []}
    this.bpItems = {name: 'Blueprint Items', type: 'group', nodeList: []}
    this.bpMerchants = {name: 'Blueprint Merchants', type: 'group', nodeList: []}
    this.bpPlaceables = {name: 'Blueprint Placeables', type: 'group', nodeList: []}
    this.bpSounds = {name: 'Blueprint Sounds', type: 'group', nodeList: []}
    this.bpTriggers = {name: 'Blueprint Triggers', type: 'group', nodeList: []}
    this.bpWaypoints = {name: 'Blueprint Waypoints', type: 'group', nodeList: []}
    this.bpSoundsets = {name: 'Blueprint Soundsets', type: 'group', nodeList: []}
    this.dialogs = {name: 'Blueprint Creatures', type: 'group', nodeList: []}
    this.otherFiles = {name: 'Other Files', type: 'group', nodeList: []}

      this.scriptsSource = {name: 'Scripts Source', type: 'group', nodeList: []}
      this.scriptsCompiled = {name: 'Scripts Compiled', type: 'group', nodeList: []}
    this.scripts = {name: 'Scripts', type: 'group', nodeList: [this.scriptsSource, this.scriptsCompiled]}

    this.nodeList.push(
      this.bpCreatures,
      this.bpDoors,
      this.bpEncounters,
      this.bpItems,
      this.bpMerchants,
      this.bpPlaceables,
      this.bpSounds,
      this.bpSoundsets,
      this.bpTriggers,
      this.bpWaypoints,
      this.dialogs,
      this.scripts,
      //this.scriptsSource,
      //this.scriptsCompiled,
      this.otherFiles
    );

    this.module_filetypes = ['.ifo', '.are', '.git', '.lyt', '.vis', '.pth'];

    let file = null;
    for(let i = 0, len = Global.Project.files.length; i < len; i++){
      file = Global.Project.files[i];
      if(file.type == 'resource'){
        switch(file.ext){
          case 'utc':
            this.bpCreatures.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;
          case 'utd':
            this.bpDoors.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;
          case 'ute':
            this.bpEncounters.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;
          case 'uti':
            this.bpItems.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;
          case 'utm':
            this.bpMerchants.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;
          case 'utp':
            this.bpPlaceables.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;
          case 'uts':
            this.bpSounds.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;
          case 'utt':
            this.bpTriggers.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;
          case 'utw':
            this.bpWaypoints.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;
          case 'ssf':
            this.bpSoundsets.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;
          case 'nss':
            this.scriptsSource.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;
          case 'ncs':
            this.scriptsCompiled.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;
          case 'dlg':
            this.dialogs.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;

          //Store module files in the root
          case 'ifo':
          case 'are':
          case 'git':
          case 'lyt':
          case 'pth':
          case 'vis':
            this.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;

          default:
            this.otherFiles.nodeList.push({name: file.filename, type: 'resource', data: {path: file.path}, nodeList: [] });
          break;
        }
      }
    }


    this.$treeView.html(this.buildNodeList(this.nodeList));
    $('li.link', this.$treeView).on('click', (e) => {
      e.preventDefault();

      let resref = e.target.dataset.resref;
      let reskey = parseInt(e.target.dataset.resid);
      let type = e.target.dataset.type;
      let archive = e.target.dataset.archive;

      // console.log(e.target.dataset);

      FileTypeManager.onOpenResource(
        new EditorFile({
          path: e.target.dataset.path
        })
      );

    });


  }

  buildNodeList(nodeList = [], canOrphan = false){

    let str = '';
    if(nodeList instanceof Array){
      for(let i = 0; i < nodeList.length; i++){
        str += this.buildNodeList(nodeList[i], canOrphan);
      }
    }else{

      let node = nodeList;
      if(node.type == 'group'){
        if(node.nodeList.length == 1 && canOrphan){
          for(let i = 0; i < node.nodeList.length; i++){
            str += this.buildNodeList(node.nodeList[i], false);
          }
        }else{
          str += '<li><input type="checkbox" checked id="list-'+this.treeIndex+'"><label for="list-'+(this.treeIndex++)+'">'+node.name+'</label><span></span><ul>';
          for(let i = 0; i < node.nodeList.length; i++){
            str += this.buildNodeList(node.nodeList[i], true);
          }
          str += '</ul></li>';
        }
      }else{
        str += '<li class="link" data-path="'+node.data.path+'">'+node.name+'</li>';
      }

    }

    return str;

  }

}

module.exports = ProjectExplorerTab;