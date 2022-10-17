import { EditorTab } from "../EditorTab";

export class DLGEditorTab extends EditorTab {
  constructor(file){
    super();

    this.file = null;

    if(this.file instanceof GFFObject){
      this.gff = file;
    }else{
      this.file = file;
    }
    this.treeIndex = 0;

    this.singleInstance = false;
    this.$tabName.text("Dialog Editor");
    console.log(this.id);
    let id = this.id;
    TemplateEngine.GetTemplateAsync('templates/editor-dlg.html', {tabId: id}, (tpl: string) => {
      this.$tabContent.append(tpl);

      this.$dialogPanes = $(this.ElementId('#dialog-panes'), this.$tabContent);
      this.$nodeTreeContainer = $(this.ElementId('#node-tree-container'), this.$tabContent);
      this.$nodePropsContainer = $(this.ElementId('#node-properties-container'), this.$tabContent);

      this.$nodeTreeRootNode = $('<ul class="tree css-treeview" style="margin: 10px;" />');

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

      if(this.file != null)
        this.OpenFile(this.file);



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

  OpenFile(file){

    if(file instanceof EditorFile){
      file.readFile( (buffer) => {
        try{
          new GFFObject(buffer, (gff) => {
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
    }

  }

  PopulateFields() {

    console.log(this.gff);

    this.entryNodes = this.gff.GetFieldByLabel('EntryList').GetChildStructs();
    this.replyNodes = this.gff.GetFieldByLabel('ReplyList').GetChildStructs();
    this.startingNodes = this.gff.GetFieldByLabel('StartingList').GetChildStructs();

    console.log('PopulateFields', this.entryNodes, this.replyNodes, this.startingNodes)

    let rootNode = this.CreateSubTree('Root', true);
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

    let text = entryNode.GetFieldByLabel('Text').GetCExoLocString().GetValue();

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

    //console.log('ParseDialogReplyNode', replyNodeIndex, replyNodeIsChild, replyNode, node);

    let entries = replyNode.GetFieldByLabel('EntriesList').GetChildStructs();
    let locString = replyNode.GetFieldByLabel('Text').GetCExoLocString();
    let text = '[CONTINUE]';

    if(locString.RESREF > -1){
      text = TLKManager.TLKStrings[locString.RESREF].Value;
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

    //console.log(treeNode);

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

    let textObj = entryNode.GetFieldByLabel('Text').GetCExoLocString();
    let text = textObj.GetValue();

    let treeNode = this.CreateSubTree('['+entryNode.GetFieldByLabel('Speaker').Value +'] - '+ text);
    $parent.append(treeNode.tree);

    treeNode.tree.addClass( entryNodeIsChild ? 'linknode' : 'entrynode' );

    //console.log(treeNode);

    if(!entryNodeIsChild){
      for(let i = 0; i < replies.length; i++){
        this.ParseDialogReplyNode(treeNode.ul, replies[i]);
      }
    }

  }

  CreateSubTree(name, checked = false){
    let $sub = $('<li><input class="node-toggle" type="checkbox" checked id="dialog-'+this.id+'-tree-'+(this.treeIndex)+'" /><label for="dialog-'+this.id+'-tree-'+(this.treeIndex++)+'">'+name+'</label><span></span><ul></ul></li>');
    let $checkbox = $('input[type=checkbox]', $sub);
    let $label = $('label', $sub);
    
    if(checked){
      $checkbox.prop('checked', !checked);
    }

    $label.on('click', (e: any) => {
      if (!e.ctrlKey){
        e.preventDefault();
      }
    }).on('dblclick', (e: any) => {
      $checkbox.prop("checked", !$checkbox.prop("checked"));
    });

    return {
      'tree': $sub,
      'ul': $('ul', $sub),
      'index': this.treeIndex
    };
  }

}
