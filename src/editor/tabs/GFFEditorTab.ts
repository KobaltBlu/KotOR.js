import { GFFDataType } from "../../enums/resource/GFFDataType";
import { TLKManager } from "../../managers/TLKManager";
import { CExoLocSubString } from "../../resource/CExoLocSubString";
import { GFFField } from "../../resource/GFFField";
import { GFFObject } from "../../resource/GFFObject";
import { GFFStruct } from "../../resource/GFFStruct";
import { EditorFile } from "../EditorFile";
import { EditorTab } from "./";
import { NotificationManager } from "../NotificationManager";

import * as path from "path";

export class GFFEditorTab extends EditorTab {
  structIndex: number;
  fieldsIndex: number;
  $gffContainer: JQuery<HTMLElement>;
  $gffProperties: JQuery<HTMLElement>;
  $gffPropertiesGroupSimple: JQuery<HTMLElement>;
  $gffPropertiesGroupVector: JQuery<HTMLElement>;
  $gffPropertiesGroupOrientation: JQuery<HTMLElement>;
  $gffPropertiesGroupCExoLocString: JQuery<HTMLElement>;
  $gffPropertiesGroupCExoLocSubString: JQuery<HTMLElement>;
  $gffPropertiesLabelTitle: JQuery<HTMLElement>;
  $gffPropertiesValueTitle: JQuery<HTMLElement>;
  $gffPropertiesStringRefValueTitle: JQuery<HTMLElement>;
  $gffPropertiesSubStringInfoTitle: JQuery<HTMLElement>;
  $gffPropertiesCExoLocSubStringTextTitle: JQuery<HTMLElement>;
  $gffPropertiesCExoLocSubStringLanguageTitle: JQuery<HTMLElement>;
  $gffPropertiesCExoLocSubStringGenderTitle: JQuery<HTMLElement>;
  $gffPropertiesVectorXTitle: JQuery<HTMLElement>;
  $gffPropertiesVectorYTitle: JQuery<HTMLElement>;
  $gffPropertiesVectorZTitle: JQuery<HTMLElement>;
  $gffPropertiesOrientationXTitle: JQuery<HTMLElement>;
  $gffPropertiesOrientationYTitle: JQuery<HTMLElement>;
  $gffPropertiesOrientationZTitle: JQuery<HTMLElement>;
  $gffPropertiesOrientationWTitle: JQuery<HTMLElement>;
  $gffPropertiesLabel: JQuery<HTMLElement>;
  $gffPropertiesValue: JQuery<HTMLElement>;
  $gffPropertiesStringRefValue: JQuery<HTMLElement>;
  $gffPropertiesSubStringInfo: JQuery<HTMLElement>;
  $gffPropertiesCExoLocSubStringTextValue: JQuery<HTMLElement>;
  $gffPropertiesCExoLocSubStringLanguageValue: JQuery<HTMLElement>;
  $gffPropertiesCExoLocSubStringGenderValue: JQuery<HTMLElement>;
  $gffPropertiesVectorXValue: JQuery<HTMLElement>;
  $gffPropertiesVectorYValue: JQuery<HTMLElement>;
  $gffPropertiesVectorZValue: JQuery<HTMLElement>;
  $gffPropertiesOrientationXValue: JQuery<HTMLElement>;
  $gffPropertiesOrientationYValue: JQuery<HTMLElement>;
  $gffPropertiesOrientationZValue: JQuery<HTMLElement>;
  $gffPropertiesOrientationWValue: JQuery<HTMLElement>;
  constructor(){
    super();

    this.structIndex = 0;
    this.fieldsIndex = 0;

    this.$gffContainer = $('<div id="gffContainer" class="css-treeview container" style="position: relative; overflow: hidden; height: 100%; width:50%; float: left;" />');
    this.$gffProperties = $('<div id="gffProperties" class="container" style="position: relative; overflow: auto; height: 100%; width:50%; padding:10px; float: left;" />');

    this.$gffPropertiesGroupSimple = $('<div />');
    this.$gffPropertiesGroupVector = $('<fieldset><legend>Vector</legend></fieldset>');
    this.$gffPropertiesGroupOrientation = $('<fieldset><legend>Orientation</legend></fieldset>');
    this.$gffPropertiesGroupCExoLocString = $('<fieldset><legend>CExoLocString</legend></fieldset>');
    this.$gffPropertiesGroupCExoLocSubString = $('<fieldset><legend>Sub String</legend></fieldset>');

    this.$gffPropertiesLabelTitle = $('<label>Label</label>');
    this.$gffPropertiesValueTitle = $('<label>Value</label>');
    this.$gffPropertiesStringRefValueTitle = $('<label>ResRef</label>');
    this.$gffPropertiesSubStringInfoTitle = $('<label>CEXOLocStringValue</label>');
    //CExoLocSubString Titles
    this.$gffPropertiesCExoLocSubStringTextTitle = $('<label>Text</label>');
    this.$gffPropertiesCExoLocSubStringLanguageTitle = $('<label>Language</label>');
    this.$gffPropertiesCExoLocSubStringGenderTitle = $('<label>Gender</label>');
    //Vector Titles
    this.$gffPropertiesVectorXTitle = $('<label>X</label>');
    this.$gffPropertiesVectorYTitle = $('<label>Y</label>');
    this.$gffPropertiesVectorZTitle = $('<label>Z</label>');
    //Orientation Titles
    this.$gffPropertiesOrientationXTitle = $('<label>X</label>');
    this.$gffPropertiesOrientationYTitle = $('<label>Y</label>');
    this.$gffPropertiesOrientationZTitle = $('<label>Z</label>');
    this.$gffPropertiesOrientationWTitle = $('<label>W</label>');

    this.$gffPropertiesLabel = $('<input type="text" disabled/>');
    this.$gffPropertiesValue = $('<input type="text" disabled/>');
    this.$gffPropertiesStringRefValue = $('<input type="number" />');
    this.$gffPropertiesSubStringInfo = $('<textarea disabled style="min-height: 250px;"/>');

    //CExoLocSubString
    this.$gffPropertiesCExoLocSubStringTextValue = $('<textarea disabled style="min-height: 250px;"/>');
    this.$gffPropertiesCExoLocSubStringLanguageValue = $('<select disabled/>')
    .append('<option value="0">Male</option>')
    .append('<option value="1">Female</option>');
    this.$gffPropertiesCExoLocSubStringGenderValue = $('<select disabled/>')
    .append('<option value="0">English</option>')
    .append('<option value="1">French</option>')
    .append('<option value="2">German</option>')
    .append('<option value="3">Italian</option>')
    .append('<option value="4">Spanish</option>')
    .append('<option value="5">Polish</option>')
    .append('<option value="128">Korean</option>')
    .append('<option value="129">Chinese Traditional</option>')
    .append('<option value="130">Chinese Simplified</option>')
    .append('<option value="131">Japanese</option>');

    //Vector Inputs
    this.$gffPropertiesVectorXValue = $('<input type="text" disabled/>');
    this.$gffPropertiesVectorYValue = $('<input type="text" disabled/>');
    this.$gffPropertiesVectorZValue = $('<input type="text" disabled/>');

    //Orientation Inputs
    this.$gffPropertiesOrientationXValue = $('<input type="text" disabled/>');
    this.$gffPropertiesOrientationYValue = $('<input type="text" disabled/>');
    this.$gffPropertiesOrientationZValue = $('<input type="text" disabled/>');
    this.$gffPropertiesOrientationWValue = $('<input type="text" disabled/>');

    //Append properties & labels to groups
    this.$gffPropertiesGroupSimple.append(this.$gffPropertiesValueTitle).append(this.$gffPropertiesValue);
    this.$gffPropertiesGroupCExoLocString.append(this.$gffPropertiesStringRefValueTitle).append(this.$gffPropertiesStringRefValue)
    .append(this.$gffPropertiesSubStringInfoTitle).append(this.$gffPropertiesSubStringInfo);
    this.$gffPropertiesGroupCExoLocSubString.append(this.$gffPropertiesCExoLocSubStringLanguageTitle)
    .append(this.$gffPropertiesCExoLocSubStringLanguageValue)
    .append('<br>')
    .append(this.$gffPropertiesCExoLocSubStringGenderTitle)
    .append(this.$gffPropertiesCExoLocSubStringGenderValue)
    .append('<br>')
    .append(this.$gffPropertiesCExoLocSubStringTextTitle)
    .append(this.$gffPropertiesCExoLocSubStringTextValue);

    this.$gffPropertiesGroupVector.append(this.$gffPropertiesVectorXTitle)
    .append(this.$gffPropertiesVectorXValue)
    .append('<br>')
    .append(this.$gffPropertiesVectorYTitle)
    .append(this.$gffPropertiesVectorYValue)
    .append('<br>')
    .append(this.$gffPropertiesVectorZTitle)
    .append(this.$gffPropertiesVectorZValue);

    this.$gffPropertiesGroupOrientation.append(this.$gffPropertiesOrientationXTitle)
    .append(this.$gffPropertiesOrientationXValue)
    .append('<br>')
    .append(this.$gffPropertiesOrientationYTitle)
    .append(this.$gffPropertiesOrientationYValue)
    .append('<br>')
    .append(this.$gffPropertiesOrientationZTitle)
    .append(this.$gffPropertiesOrientationZValue)
    .append('<br>')
    .append(this.$gffPropertiesOrientationWTitle)
    .append(this.$gffPropertiesOrientationWValue);


    //Append groups to the main properties div
    this.$gffProperties.append(this.$gffPropertiesLabelTitle).append(this.$gffPropertiesLabel)
    .append(this.$gffPropertiesGroupSimple)
    .append(this.$gffPropertiesGroupCExoLocString)
    .append(this.$gffPropertiesGroupVector)
    .append(this.$gffPropertiesGroupOrientation)
    .append(this.$gffPropertiesGroupCExoLocSubString);

    this.$tabContent.append(this.$gffContainer).append(this.$gffProperties);



  }

  OpenFile(file: EditorFile){
    if(typeof file !== 'undefined'){
      //sessionStorage.setItem(KEY_FILE, JSON.stringify(file));
      this.tabLoader.Show();
      this.tabLoader.SetMessage("Loading GFF File");
      this.$tabName.text(file.path.split(path.sep).pop());
      this.gff = new GFFObject(file.path, () => {
        this.tabLoader.SetMessage("Building Editor Tree");
        //Fade out the loading screen because the app is ready

        this.$gffContainer.html('');
        let $scrollContainer = $('<div style="height: 100%;" />');
        let $rootUL = $('<ul class="gff-struct gff-root-struct" />');
        this.$gffContainer.append($scrollContainer);
        $scrollContainer.append($rootUL);
        this.$gffContainer.css({'overflow': 'auto'});
        this.parseStruct(this.gff.RootNode, $rootUL, true);
        this.tabLoader.SetMessage("Loading Complete");
        this.tabLoader.Dismiss();
        this.$gffProperties.children().hide();
      });
    }else{
      this.tabLoader.Dismiss();
    }
  }

  parseStruct(struct: GFFStruct, $parent: any, isRoot = false){
    let self = this;//Need to use this for the time being to pass this to ContextMenus

    let $struct = $('<li class="gff-struct" />');

    if(isRoot)
      $struct.addClass('gff-root-struct');

    $struct.append('<input class="node-toggle" type="checkbox" id="struct-'+this.structIndex+'" /><label for="struct-'+this.structIndex+'"></label><span>[Struct ID: '+struct.GetType()+']</span>');

    let $fields = $('<ul class="gff-fields strt" />');

    $struct.append($fields);
    this.structIndex++;
    $.each(struct.GetFields(), (i, field) => {
      this.parseField(field, $fields);
    });

    // let menu = new Menu();
    // menu.append(new MenuItem({label: 'Add BYTE', click() {
    //   let newField = new GFFField(GFFDataType.BYTE, 'New BYTE');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add CHAR', click() {
    //   let newField = new GFFField(GFFDataType.CHAR, 'New CHAR');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add WORD', click() {
    //   let newField = new GFFField(GFFDataType.WORD, 'New WORD');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add SHORT', click() {
    //   let newField = new GFFField(GFFDataType.SHORT, 'New SHORT');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add DWORD', click() {
    //   let newField = new GFFField(GFFDataType.DWORD, 'New DWORD');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add INT', click() {
    //   let newField = new GFFField(GFFDataType.INT, 'New INT');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add DWORD64', click() {
    //   let newField = new GFFField(GFFDataType.DWORD64, 'New DWORD64');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add INT64', click() {
    //   let newField = new GFFField(GFFDataType.INT64, 'New INT64');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add FLOAT', click() {
    //   let newField = new GFFField(GFFDataType.FLOAT, 'New FLOAT');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add DOUBLE', click() {
    //   let newField = new GFFField(GFFDataType.DOUBLE, 'New DOUBLE');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add CEXOSTRING', click() {
    //   let newField = new GFFField(GFFDataType.CEXOSTRING, 'New CEXOSTRING');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add RESREF', click() {
    //   let newField = new GFFField(GFFDataType.RESREF, 'New RESREF');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add CEXOLOCSTRING', click() {
    //   let newField = new GFFField(GFFDataType.CEXOLOCSTRING, 'New CEXOLOCSTRING');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add BINARY', click() {
    //   let newField = new GFFField(GFFDataType.VOID, 'New BINARY');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add STRUCT', click() {
    //   let newField = new GFFField(GFFDataType.STRUCT, 'New STRUCT');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add LIST', click() {
    //   let newField = new GFFField(GFFDataType.LIST, 'New LIST');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add ORIENTATION', click() {
    //   let newField = new GFFField(GFFDataType.ORIENTATION, 'New ORIENTATION');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add VECTOR', click() {
    //   let newField = new GFFField(GFFDataType.VECTOR, 'New VECTOR');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({label: 'Add STRREF', click() {
    //   let newField = new GFFField(GFFDataType.STRREF, 'New STRREF');
    //   struct.AddField(newField);
    //   self.parseField(newField, $fields);
    // }}));
    // menu.append(new MenuItem({type: 'separator'}));
    // //Clipboard
    // menu.append(new MenuItem({label: 'Paste FIELD', click(){
    //     if(Clipboard == null){
    //       alert('There is nothing in the clipboard');
    //       return;
    //     }

    //     if(Clipboard instanceof GFFField){
    //       let newField = Clipboard;
    //       //newField.bind(Clipboard);
    //       console.log(Clipboard);
    //       struct.AddField(newField);
    //       self.parseField(newField, $fields);
    //       Clipboard = null;
    //     }

    //   }
    // }));
    // menu.append(new MenuItem({type: 'separator'}));
    // menu.append(new MenuItem({label: 'Delete STRUCT', click(){
    //     if(struct == gff.RootNode){
    //       alert('You can\'t delete the Root Node');
    //       return;
    //     }
    //     gff.DeleteStruct(struct);
    //     $struct.remove();
    //     self.UpdatePropertiesWindow(null);
    //     console.log(struct);
    //   }
    // }));

    $struct.contextmenu((e: any) => {
      e.preventDefault();
      // menu.popup(remote.getCurrentWindow());
      return false;
    }).on('click', (e: any) => {
      e.stopPropagation();
      $('.gff-field, .gff-struct').removeClass('selected');
      $struct.addClass('selected');
      this.UpdatePropertiesWindow(null);
    });

    $parent.append($struct);

  }

  parseField(field: any, $parent: any){
    let self = this;//Need to use this for the time being to pass this to ContextMenus
    let $field = $('<li class="gff-field" />');

    field.$label = null;
    let $fields = $('<ul class="gff-fields hasList">');
    let _hasList = false;

    //Create the Label element
    field.$label = $('<label for="fields-'+this.fieldsIndex+'"></label><span><span class="field-label">'+field.Label+'</span> <span class="field-type">['+GFFObject.TypeValueToString(field.GetType())+']</span> <span class="field-value"></span></span>');

    $field.on('onSubStringAdded', () => {
      console.log($(this));
      let SubString = field.GetCExoLocString().GetStrings()[field.GetCExoLocString().GetStrings().length-1];
      let $SubString = $('<li class="gff-field gff-substring"><label>'+SubString.getString()+'</label></li>');
      // let substringmenu = new Menu();
      // substringmenu.append(new MenuItem({label: 'Delete String', click() {
      //   let index = field.GetCExoLocString().GetStrings().indexOf(SubString);
      //   field.GetCExoLocString().GetStrings().splice(index, 1);
      //   $SubString.remove();
      //   this.UpdatePropertiesWindow(null);
      // }}));
      //Context Menu
      $SubString.on('click', (e: any) => {
        e.stopPropagation();
        $('.gff-field, .gff-struct').removeClass('selected');
        $SubString.addClass('selected');
        this.UpdatePropertiesWindow(SubString);
      }).contextmenu((e: any) => {
        e.preventDefault();
        $SubString.trigger('click');
        // substringmenu.popup(remote.getCurrentWindow());
        return false;
      });

      $fields.append($SubString);
    });

    // let menu = new Menu();
    // menu.append(new MenuItem({label: 'Cut FIELD', click() { console.log(typeof field); }}));
    // menu.append(new MenuItem({label: 'Copy FIELD', click() { Clipboard = field; NotificationManager.Notify(NotificationManager.Types.SUCCESS, 'Field Copied'); }}));
    // if(field.GetType() == GFFDataType.CEXOLOCSTRING){
    //   menu.append(new MenuItem({label: 'Add String', click() {
    //     field.GetCExoLocString().AddSubString(new CExoLocSubString(0, 'New String'));
    //     $field.trigger('onSubStringAdded');
    //   }}));
    // }
    // if(field.GetType() == GFFDataType.LIST){
    //   menu.append(new MenuItem({label: 'Add STRUCT', click() {
    //     let newStruct = new GFFStruct();
    //     field.AddChildStructs(newStruct);
    //     self.parseStruct(newStruct, $fields);
    //   }}));
    // }
    // menu.append(new MenuItem({type: 'separator'}));
    // menu.append(new MenuItem({label: 'Delete FIELD', click() {
    //   $field.remove();
    //   gff.DeleteField(field, null);
    //   self.UpdatePropertiesWindow(null);
    //   console.log(field);
    // }}));

    $field.contextmenu((e: any) => {
      e.preventDefault();
      $field.trigger('click');
      // menu.popup(remote.getCurrentWindow());
      return false;
    });

    $field.append('<input type="checkbox" id="fields-'+this.fieldsIndex+'" />');
    this.fieldsIndex++;

    $field.append(field.$label);
    $field.append($fields);

    $field.on('click', (e: any) => {
      e.stopPropagation();
      $('.gff-field, .gff-struct').removeClass('selected');
      $(this).addClass('selected');
      this.UpdatePropertiesWindow(field);
    });

    $.each(field.GetChildStructs(), (i, struct) => {
      this.parseStruct(struct, $fields);
    });

    this.UpdateFieldValue(field);

    $parent.append($field);

  }

  UpdateFieldLabel(field: any){
    $('span.field-label', field.$label).text(field.Label);
  }

  UpdateFieldValue(field: any){
    let $value = $('span.field-value', field.$label);

    switch(field.GetType()){
      case GFFDataType.BYTE:
      case GFFDataType.CHAR:
      case GFFDataType.WORD:
      case GFFDataType.SHORT:
      case GFFDataType.DWORD:
      case GFFDataType.INT:
      case GFFDataType.DWORD64:
      case GFFDataType.DOUBLE:
      case GFFDataType.FLOAT:
      case GFFDataType.RESREF:
      case GFFDataType.CEXOSTRING:
        $value.text('Value: '+field.GetValue());
      break;
      case GFFDataType.LIST:
        $value.text('Structs: '+field.GetChildStructs().length);
      break;
      case GFFDataType.STRUCT:
        $value.text('');
      break;
      default:
        $value.text('');
      break;
    }

  }

  UpdatePropertiesWindow(field: any){


    this.$gffPropertiesLabelTitle.hide();
    this.$gffPropertiesLabel.hide();
    this.$gffPropertiesGroupSimple.hide();
    this.$gffPropertiesGroupVector.hide();
    this.$gffPropertiesGroupOrientation.hide();
    this.$gffPropertiesGroupCExoLocString.hide();
    this.$gffPropertiesGroupCExoLocSubString.hide();

    //Reset the fields of any previous settings
    this.$gffPropertiesLabel.prop('maxlength', '16').prop("disabled", false).off('input');
    this.$gffPropertiesValue.val('').attr('type', 'text').prop('maxlength', '').prop('min', '').removeAttr('step').prop('max', '').prop("disabled", true).off('input');
    this.$gffPropertiesStringRefValue.val('').prop("disabled", true).off('input');
    this.$gffPropertiesSubStringInfo.val('').prop("disabled", true).off('input');

    this.$gffPropertiesCExoLocSubStringTextValue.val('').prop("disabled", true).off('input');
    this.$gffPropertiesCExoLocSubStringGenderValue.val('').prop("disabled", true).off('input');
    this.$gffPropertiesCExoLocSubStringLanguageValue.val('').prop("disabled", true).off('input');

    this.$gffPropertiesVectorXValue.val('').prop('disabled', true).off('input');
    this.$gffPropertiesVectorYValue.val('').prop('disabled', true).off('input');
    this.$gffPropertiesVectorZValue.val('').prop('disabled', true).off('input');

    this.$gffPropertiesOrientationXValue.val('').prop('disabled', true).off('input');
    this.$gffPropertiesOrientationYValue.val('').prop('disabled', true).off('input');
    this.$gffPropertiesOrientationZValue.val('').prop('disabled', true).off('input');
    this.$gffPropertiesOrientationWValue.val('').prop('disabled', true).off('input');

    if(field != null){

      if(field instanceof CExoLocSubString){

        this.$gffPropertiesGroupCExoLocSubString.show();
        this.$gffPropertiesCExoLocSubStringTextValue.val(field.getString()).on('input', () => {
          field.setString(this.$gffPropertiesCExoLocSubStringTextValue.val()?.toString() as string);
        }).prop("disabled", false);

      }else if(field instanceof GFFField){
        this.$gffPropertiesLabelTitle.show();
        this.$gffPropertiesLabel.show();

        this.$gffPropertiesLabel.val(field.Label).on('input', () => {
          if(this.$gffPropertiesLabel.val() != ""){
            field.Label = this.$gffPropertiesLabel.val()?.toString() as string;
            this.UpdateFieldLabel(field);
          }
        });

        //Set Value Input properties
        switch(field.GetType()){
          case GFFDataType.BYTE:
            this.$gffPropertiesValue.attr('type', 'number').attr('min', '0').attr('max', '255');
            break;
          case GFFDataType.CHAR:
            this.$gffPropertiesValue.attr('type', 'text').attr('maxlength', 1);
            break;
          case GFFDataType.WORD:
            this.$gffPropertiesValue.attr('type', 'number').attr('min', '0').attr('max', '65535');
            break;
          case GFFDataType.SHORT:
            this.$gffPropertiesValue.attr('type', 'number').attr('min', '-32768').attr('max', '32767');
            break;
          case GFFDataType.DWORD:
            this.$gffPropertiesValue.attr('type', 'number').attr('min', '0').attr('max', '4294967296');
            break;
          case GFFDataType.INT:
            this.$gffPropertiesValue.attr('type', 'number').attr('min', '-2147483648').attr('max', '2147483647');
            break;
          case GFFDataType.INT64:
            this.$gffPropertiesValue.attr('type', 'number').attr('min', '–9223372036854775808').attr('max', '9223372036854775807');
            break;
          case GFFDataType.DWORD64:
            this.$gffPropertiesValue.attr('type', 'number').attr('min', '0').attr('max', '18446744073709551616');
            break;
          case GFFDataType.DOUBLE:
            this.$gffPropertiesValue.attr('type', 'number').attr('step', 'any');
            break;
          case GFFDataType.FLOAT:
            console.log('float');
            this.$gffPropertiesValue.attr('type', 'number').attr('step', 'any');
            break;
          case GFFDataType.RESREF:
            console.log('resref');
            this.$gffPropertiesValue.attr('type', 'text').attr('maxlength', 16);
            break;
          case GFFDataType.CEXOSTRING:
            this.$gffPropertiesValue.attr('type', 'text');
            break;
          }

        switch(field.GetType()){
          case GFFDataType.BYTE:
          case GFFDataType.CHAR:
          case GFFDataType.WORD:
          case GFFDataType.SHORT:
          case GFFDataType.DWORD:
          case GFFDataType.INT:
          case GFFDataType.INT64:
          case GFFDataType.DWORD64:
          case GFFDataType.DOUBLE:
          case GFFDataType.FLOAT:
          case GFFDataType.RESREF:
          case GFFDataType.CEXOSTRING:
            this.$gffPropertiesValue.val(field.GetValue()).on('input', () => {
              field.SetValue($(this).val());
              this.UpdateFieldValue(field);
              this.UpdatePropertiesWindow(field);
            });
            this.$gffPropertiesValue.prop("disabled", false);
            this.$gffPropertiesGroupSimple.show();
          break;
          case GFFDataType.CEXOLOCSTRING:
            //console.log(field.GetCExoLocString());
            this.$gffPropertiesStringRefValue.attr('type', 'number').attr('min', '-1').attr('max', '99999999999').val(field.GetCExoLocString().RESREF).on('input', () => {
              if($(this).val() == '-'){
                $(this).val('-1');
              }
              field.GetCExoLocString().RESREF = parseInt((isNaN(parseInt($(this).val()?.toString() as string)) ? '-1' : parseInt($(this).val()?.toString() as string)).toString());
              this.UpdateFieldValue(field);
              this.UpdatePropertiesWindow(field);
              //console.log($(this).val());
            });

            if(field.GetCExoLocString().RESREF != -1){
              this.$gffPropertiesSubStringInfo.val(TLKManager.TLKStrings[field.GetCExoLocString().RESREF].Value);
              this.$gffPropertiesStringRefValue.prop("disabled", false);
              this.$gffPropertiesSubStringInfo.prop("disabled", true);
            }else {
              if(field.GetCExoLocString().GetStrings().length)
                this.$gffPropertiesSubStringInfo.val(field.GetCExoLocString().GetStrings()[0].getString());
              else{
                field.GetCExoLocString().AddSubString(new CExoLocSubString(0, ''));
              }

              this.$gffPropertiesStringRefValue.prop("disabled", true);
              this.$gffPropertiesSubStringInfo.prop("disabled", true).on('input', () => {
                field.GetCExoLocString().GetStrings()[0].setString($(this).val()?.toString() as string);
                this.UpdatePropertiesWindow(field);
              });
            }

            this.$gffPropertiesGroupCExoLocString.show();

          break;
          case GFFDataType.VECTOR:
            this.$gffPropertiesGroupVector.show();

            this.$gffPropertiesVectorXValue.val(field.GetVector().x).prop('disabled', false);
            this.$gffPropertiesVectorYValue.val(field.GetVector().y).prop('disabled', false);
            this.$gffPropertiesVectorZValue.val(field.GetVector().z).prop('disabled', false);
          break;
          case GFFDataType.ORIENTATION:
            this.$gffPropertiesGroupOrientation.show();

            this.$gffPropertiesOrientationXValue.val(field.GetOrientation().x).prop('disabled', false);
            this.$gffPropertiesOrientationYValue.val(field.GetOrientation().y).prop('disabled', false);
            this.$gffPropertiesOrientationZValue.val(field.GetOrientation().z).prop('disabled', false);
            this.$gffPropertiesOrientationWValue.val(field.GetOrientation().w).prop('disabled', false);

          break;
        }

      }

    }

  }

}
