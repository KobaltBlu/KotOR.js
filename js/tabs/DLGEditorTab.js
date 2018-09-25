class DLGEditorTab extends EditorTab {
  constructor(args = {}){
    super({
      toolbar: {
        items: [
          {name: 'File', items: [
            {name: 'Open File', onClick: () => {

            }},
            {name: 'Save File', onClick: () => {

              if(this.gff != null){
                if(this.gff.path == null){
                  let savePath = dialog.showSaveDialog({
                    title: 'Save DLG',
                    defaultPath: path.join(app.getAppPath(), this.gff.file + '.' + this.gff.FileType.substr(0, 3).toLowerCase()) ,
                    filters: [
                      {name: 'DLG', extensions: ['dlg']}
                  ]});

                  console.log(savePath);

                  if(savePath != null){

                    let fileInfo = path.parse(savePath);

                    this.gff.path = fileInfo.dir;
                    this.gff.file = fileName.name;
                    this.gff.Save();

                  }

                }else{
                  this.gff.Save();
                }

              }else{
                alert('Nothing to save');
              }


            }},
            {name: 'Save File As', onClick: () => {

              if(this.gff != null){
                let savePath = dialog.showSaveDialog({
                  title: 'Save DLG',
                  defaultPath: path.join(app.getAppPath(), this.gff.file + '.' + this.gff.FileType.substr(0, 3).toLowerCase()) ,
                  filters: [
                    {name: 'DLG', extensions: ['dlg']}
                ]});

                console.log(savePath);

                if(savePath != null){

                  let fileInfo = path.parse(savePath);

                  this.gff.path = fileInfo.dir;
                  this.gff.file = fileName.name;
                  this.gff.Save();

                }

              }else{
                alert('Nothing to save');
              }


            }}
          ]}
        ]
      }
    });

    this.args = $.extend({
      gff: null,
      file: null
    }, args);

    this.gff = this.args.gff;
    this.treeIndex = 0;

    this.singleInstance = false;
    this.$tabName.text("Dialog Editor");
    console.log(this.id);
    let id = this.id;
    TemplateEngine.GetTemplateAsync('templates/editor-dlg.html', {tabId: id}, (tpl) => {
      this.$tabContent.append(tpl);

      this.$dialogPanes = $(this.ElementId('#dialog-panes'), this.$tabContent);
      this.$nodeTreeContainer = $(this.ElementId('#node-tree-container'), this.$tabContent);
      this.$nodePropsContainer = $(this.ElementId('#node-properties-container'), this.$tabContent);

      this.$nodeTreeRootNode = $('<ul class="tree css-treeview" />');

      this.$nodeTreeContainer.append(this.$nodeTreeRootNode);


      this.$dialogPanes.layout({
        applyDefaultStyles: false,
        'onopen': (pane) => {
        },
        'onclose': (pane) => {
        },
        'onresize': (pane) => {
        },
        'south': {
          size: 200
        }
      });

      this.$tabContent.css({overflow: 'hidden'});

      if(this.gff != null)
        this.PopulateFields();

      if(this.args.file != null)
        this.OpenFile(this.args.file);



    });

  }

  GetResourceID(){
    if(this.gff != null)
      return this.gff.resourceID;

    return null;
  }

  ElementId(str){
    return str+'-'+this.id;
  }

  OpenFile(_file){

    console.log('Model Loading', _file);

    let info = Utility.filePathInfo(_file);
    let file = path.parse(info.path);

    console.log(file, info);

    if(info.location == 'local'){

      fs.readFile(info.path, (err, buffer) => {
        if (err) throw err;

        try{
          this.gff = new GFFObject(buffer, (gff) => {
            this.gff = gff;
            console.log(this.gff.RootNode);
            this.PopulateFields();
          });
        }
        catch (e) {
          console.log(e);
          this.Remove();
        }

      });

    }else if(info.location == 'archive'){

      switch(info.archive.type){
        case 'bif':
          Global.kotorBIF[info.archive.name].GetResourceData(Global.kotorBIF[info.archive.name].GetResourceByLabel(info.file.name, ResourceTypes['dlg']), (buffer) => {
            try{
              console.log(buffer);
              this.gff = new GFFObject(buffer, (gff) => {
                this.gff = gff;
                console.log(this.gff.RootNode);
                this.PopulateFields();
              });
            }
            catch (e) {
              console.log(e);
              this.Remove();
            }
          }, (e) => {
            throw 'Resource not found in BIF archive '+info.archive.name;
            this.Remove();
          });
        break;
      }

    }

    this.fileType = info.file.ext;
    this.location = info.location;

  }

  PopulateFields() {

    console.log(this.gff);

    this.entryNodes = this.gff.GetFieldByLabel('EntryList').GetChildStructs();
    this.replyNodes = this.gff.GetFieldByLabel('ReplyList').GetChildStructs();
    this.startingNodes = this.gff.GetFieldByLabel('StartingList').GetChildStructs();

    console.log('PopulateFields', this.entryNodes, this.replyNodes, this.startingNodes)

    let rootNode = this.CreateSubTree('Root');
    this.$nodeTreeRootNode.append(rootNode.tree);

    console.log(rootNode);

    for(let i = 0; i < this.startingNodes.length; i++){
      this.ParseDialogStringNode(rootNode.ul, this.startingNodes[i]);
    }

  }

  ParseDialogStringNode($parent, node){
    let entryNodeIndex = node.GetFieldByLabel('Index').Value;
    let entryNode = this.entryNodes[entryNodeIndex];
    let replies = entryNode.GetFieldByLabel('RepliesList').GetChildStructs();

    let text = ipcRenderer.sendSync('TLKGetStringById',entryNode.GetFieldByLabel('Text').GetCExoLocString().RESREF).Value;

    let treeNode = this.CreateSubTree('['+entryNode.GetFieldByLabel('Speaker').Value +'] - '+ text);
    $parent.append(treeNode.tree);

    treeNode.tree.addClass('entrynode');

    for(let i = 0; i < replies.length; i++){
      this.ParseDialogReplyNode(treeNode.ul, replies[i]);
    }
  }

  ParseDialogReplyNode($parent, node){

    let replyNodeIndex = node.GetFieldByLabel('Index').Value;
    let replyNodeIsChild = node.GetFieldByLabel('IsChild').Value;
    let replyNode = this.replyNodes[replyNodeIndex];

    console.log('ParseDialogReplyNode', replyNodeIndex, replyNodeIsChild, replyNode, node);

    let entries = replyNode.GetFieldByLabel('EntriesList').GetChildStructs();
    let locString = replyNode.GetFieldByLabel('Text').GetCExoLocString();
    let text = '[CONTINUE]';

    if(locString.RESREF != -1){
      text = ipcRenderer.sendSync('TLKGetStringById',locString.RESREF).Value;
    }else if(locString.strings.length){
      text = locString.GetString().getString();
    }else if(entries.length){
      text = '[CONTINUE]';
    }else{
      text = '[END DIALOGUE]';
    }

    let treeNode = this.CreateSubTree(text);
    $parent.append(treeNode.tree);

    treeNode.tree.addClass( replyNodeIsChild ? 'linknode' : 'replynode' );

    console.log(treeNode);

    if(!replyNodeIsChild){
      for(let i = 0; i < entries.length; i++){
        this.ParseDialogEntryNode(treeNode.ul, entries[i]);
      }
    }

  }

  ParseDialogEntryNode($parent, node){

    let entryNodeIndex = node.GetFieldByLabel('Index').Value;
    let entryNodeIsChild = node.GetFieldByLabel('IsChild').Value;
    let entryNode = this.entryNodes[entryNodeIndex];
    let replies = entryNode.GetFieldByLabel('RepliesList').GetChildStructs();

    let text = ipcRenderer.sendSync('TLKGetStringById',entryNode.GetFieldByLabel('Text').GetCExoLocString().RESREF).Value;

    let treeNode = this.CreateSubTree('['+entryNode.GetFieldByLabel('Speaker').Value +'] - '+ text);
    $parent.append(treeNode.tree);

    treeNode.tree.addClass( entryNodeIsChild ? 'linknode' : 'entrynode' );

    console.log(treeNode);

    if(!entryNodeIsChild){
      for(let i = 0; i < replies.length; i++){
        this.ParseDialogReplyNode(treeNode.ul, replies[i]);
      }
    }

  }

  CreateSubTree(name){
    let $sub = $('<li><input class="node-toggle" type="checkbox" checked id="dialog-'+this.id+'-tree-'+(this.treeIndex)+'" /><label for="dialog-'+this.id+'-tree-'+(this.treeIndex++)+'">'+name+'</label><span></span><ul></ul></li>');

    return {
      'tree': $sub,
      'ul': $('ul', $sub),
      'index': this.treeIndex
    };
  }

}

module.exports = DLGEditorTab;
