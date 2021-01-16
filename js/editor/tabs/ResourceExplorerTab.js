class ResourceExplorerTab extends EditorTab {
  constructor(){
    super({closeable: false});

    this.$tabName.text("Game");

    this.$scrollContainer = $(`<div class="scroll-container" style="width:100%; overflow: auto;" />`);
    this.$treeView = $('<ul class="tree css-treeview js" />');

    this.$scrollContainer.append(this.$treeView);
    this.$tabContent.append(this.$scrollContainer);

  }

  initialize( onComplete = null ){

    this.treeIndex = 0;
    this.nodeList = [];

    let bifs = [];
    for(let bif in Global.kotorBIF){
      if(Global.kotorBIF.hasOwnProperty(bif))
        bifs.push(Global.kotorBIF[bif]);
    }
    
    let bifLoader = new AsyncLoop({
      array: bifs,
      onLoop: (bif, asyncLoop) => {
        let name = bif.file.split('\\').pop().split('.')[0];
        let subTypes = {};

        let node = {
          name: name,
          type: 'group',
          nodeList: []
        };

        this.nodeList.push(node)

        for(let i = 0; i < bif.resources.length; i++){
          let resource = bif.resources[i];
          let resref = Global.kotorKEY.GetFileLabel(resource.ID);
          
          if(subTypes[resource.ResType] == undefined){
            subTypes[resource.ResType] = {
              name: ResourceTypes.getKeyByValue(resource.ResType),
              type: 'group',
              nodeList: []
            }
            node.nodeList.push(subTypes[resource.ResType]);
          }

          subTypes[resource.ResType].nodeList.push({
            name: resref+'.'+ResourceTypes.getKeyByValue(resource.ResType),
            type: 'resource',
            data: {
              path: bif.file+'?'+resref+'.'+ResourceTypes.getKeyByValue(resource.ResType),
            },
            nodeList: []
          });
          
        }

        asyncLoop.next();
      }
    });
    bifLoader.iterate(() => {

      this.loadFolderForFileBrowser('StreamWaves', () => {

        this.loadFolderForFileBrowser('StreamSounds', () => {

          this.loadFolderForFileBrowser('StreamMusic', () => {

            this.loadFolderForFileBrowser('StreamVoice', () => {

              this.$treeView.html(this.buildNodeList(this.nodeList));

              $('li.link', this.$treeView).on('click', (e) => {
                e.preventDefault();
          
                let resref = e.target.dataset.resref;
                let reskey = parseInt(e.target.dataset.resid);
                let type = e.target.dataset.type;
                let archive = e.target.dataset.archive;
          
                console.log(e.target.dataset);
          
                FileTypeManager.onOpenResource(
                  new EditorFile({
                    path: e.target.dataset.path
                  })
                );
          
              });

              if(typeof onComplete === 'function')
                onComplete();

            });

          });

        });

      });

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

  loadFolderForFileBrowser(folder_name = '', onComplete = null ){
    //Load StreamWaves
    recursive(path.join(app_profile.directory, folder_name), (err, files) => {

      if(err){
        if(typeof onComplete === 'function')
          onComplete();
        return;
      }

      let folder = {name: folder_name, type: 'group', nodeList: []};
      folder.nodeList._indexes = {};
      let substr_len = (path.join(app_profile.directory, folder_name)+path.sep).length;

      for(let i = 0; i < files.length; i++){
        let file = files[i].substr(substr_len);
        let parts = file.split(path.sep);
        
        let newfile = parts.pop();
        let targetFolder = folder;
        
        for(let i = 0; i < parts.length; i++){
          if(typeof targetFolder.nodeList._indexes[parts[i]] === 'undefined'){
            //Push the new folder and get the index
            let index = targetFolder.nodeList.push({name: parts[i].trim(), type: 'group', nodeList: []}) - 1;
            targetFolder.nodeList._indexes[parts[i]] = index;
            targetFolder = targetFolder.nodeList[index];
            targetFolder.nodeList._indexes = {};
          }else{
            let index = targetFolder.nodeList._indexes[parts[i]];
            targetFolder = targetFolder.nodeList[index];
          }
        }

        targetFolder.nodeList.push({name: newfile.trim(), type: 'resource', data: {path: files[i]}, nodeList: [] });

        /*targetFolder.nodeList.sort( (a, b) => {
          return a.type == 'group' ? 0 : 1;
        });*/
        
      }

      folder.nodeList.sort( (a, b) => {
        let compareType = a.type == 'group' && b.type != 'group' ? -1 : 1;
        let compareName = a.name.localeCompare(b.name);

        return compareType || compareName;
      });

      this.nodeList.push(folder);

      if(typeof onComplete === 'function')
        onComplete();

    });

  }

}

module.exports = ResourceExplorerTab;