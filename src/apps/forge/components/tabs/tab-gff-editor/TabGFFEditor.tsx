import React, { ChangeEvent, useEffect, useState, useCallback, memo, useMemo } from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"
import { useEffectOnce } from "../../../helpers/UseEffectOnce";

import { TabGFFEditorState, TabGFFEditorStateEventListenerTypes } from "../../../states/tabs";

import * as KotOR from "../../../KotOR";
import { Form, InputGroup } from "react-bootstrap";
import { ForgeTreeView } from "../../treeview/ForgeTreeView";
import { ListItemNode } from "../../treeview/ListItemNode";
import { useContextMenu } from "../../common/ContextMenu";
import { createGFFContextMenuItems } from "./GFFContextMenu";

export const TabGFFEditor = function(props: BaseTabProps){

  const tab: TabGFFEditorState = props.tab as TabGFFEditorState;
  const [gff, setGFF] = useState<KotOR.GFFObject>();
  const [selectedNode, setSelectedNode] = useState<KotOR.GFFField|KotOR.GFFStruct>();
  const [render, rerender] = useState<boolean>(true);

  const onEditorFileLoad = function(tab: TabGFFEditorState){
    setGFF(tab.gff);
  };

  const onNodeSelected = function(node: KotOR.GFFField|KotOR.GFFStruct){
    setSelectedNode(node);
    rerender(!render);
  };

  useEffectOnce( () => { //constructor
    tab.addEventListener<TabGFFEditorStateEventListenerTypes>('onEditorFileLoad', onEditorFileLoad);
    tab.addEventListener<TabGFFEditorStateEventListenerTypes>('onNodeSelected', onNodeSelected);

    return () => { //destructor
      tab.removeEventListener<TabGFFEditorStateEventListenerTypes>('onEditorFileLoad', onEditorFileLoad);
      tab.removeEventListener<TabGFFEditorStateEventListenerTypes>('onNodeSelected', onNodeSelected);
    };
  })

  return (
<>
  <div id="gffContainer" style={{position: 'relative', overflow: 'auto', height: '100%', width:'50%', float: 'left'}}>
    <ForgeTreeView>
      {
        (
          gff ? <GFFStructElement struct={ gff.RootNode } key={ gff.RootNode.uuid } open={true} tab={tab} depth={0} /> : <></>
        )
      }
    </ForgeTreeView>
  </div>
  <div id="gffProperties" className="container" style={{position: 'relative', overflow: 'auto', height: '100%', width:'50%', padding:'10px', float: 'left'}}>
    {(
      selectedNode ? (
        selectedNode instanceof KotOR.GFFField ?
          <GFFFieldProperties node={selectedNode} /> :
        selectedNode instanceof KotOR.GFFStruct ?
          <GFFStructProperties node={selectedNode} /> :
        <></>
      ) :
      <></>
    )}
  </div>
</>);

};

const GFFStructElement = memo(function GFFStructElement(props: any){
  const tab: TabGFFEditorState = props.tab as TabGFFEditorState;
  const [openState, setOpenState] = useState<boolean>(!!props.open);
  const struct: KotOR.GFFStruct = props.struct;
  const [render, rerender] = useState<boolean>(true);
  const depth: number = props.depth || 0;
  const { showContextMenu, ContextMenuComponent } = useContextMenu();

  const handleToggle = useCallback(() => {
    setOpenState(prev => !prev);
  }, []);

  const handleClick = useCallback(() => {
    tab.setSelectedField(struct);
  }, [tab, struct]);

  const handleDoubleClick = useCallback(() => {
    // Add double-click logic if needed
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const contextMenuItems = createGFFContextMenuItems({
      struct,
      onFieldAdded: () => rerender(!render),
      onStructCut: () => log.debug('Cut STRUCT'),
      onStructCopy: () => log.debug('Copy STRUCT'),
      onFieldPaste: () => log.debug('Paste FIELD'),
      onStructDelete: () => log.debug('Delete Struct'),
      onNew: () => log.debug('New'),
      onOpen: () => log.debug('Open'),
      onClose: () => log.debug('Close')
    });

    showContextMenu(e.clientX, e.clientY, contextMenuItems);
  }, [struct, render, showContextMenu]);

  const handleSelect = useCallback((_nodeId: string) => {
    tab.setSelectedField(struct);
  }, [tab, struct]);

  const onAddField = useCallback(() => {
    struct.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'New Field [Untitled]', 0));
    rerender(!render);
  }, [struct, render]);

  // Memoize child nodes to prevent unnecessary re-renders
  const childNodes = useMemo(() => {
    if (!openState || !struct) return null;

    const fieldNodes = struct.getFields().map((field: KotOR.GFFField) => (
      <GFFFieldElement
        field={field}
        key={field.uuid}
        tab={props.tab}
        depth={depth + 1}
      />
    ));

    const addFieldNode = (
      <li className="gff-field add" onClick={onAddField} key="add-field">
        <span className="field-icon">
          <i className="fa-solid fa-plus"></i>
        </span>
        <span className="field-label">
          <a>[Add Field]</a>
        </span>
      </li>
    );

    return [...fieldNodes, addFieldNode];
  }, [openState, struct, props.tab, depth, onAddField]);

  if(!struct) return <></>;

  const hasChildren = struct.getFields().length > 0;

  return (
    <>
      <ListItemNode
        id={struct.uuid}
        name={`[Struct ID: ${struct.getType()}]`}
        hasChildren={hasChildren}
        isExpanded={openState}
        isSelected={false}
        depth={depth}
        icon="fa-cube"
        iconType="folder"
        hasContextMenu={true}
        onToggle={handleToggle}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onSelect={handleSelect}
        dataAttributes={{
          'data-struct-id': struct.getType(),
          'data-uuid': struct.uuid
        }}
      >
        {childNodes}
      </ListItemNode>
      {ContextMenuComponent}
    </>
  );
});

const GFFFieldElement = memo(function GFFFieldElement(props: any){
  const tab: TabGFFEditorState = props.tab as TabGFFEditorState;
  const [openState, setOpenState] = useState<boolean>(!!props.open);
  const [render, rerender] = useState<boolean>(true);
  const field: KotOR.GFFField = props.field;
  const depth: number = props.depth || 0;

  const handleToggle = useCallback(() => {
    setOpenState(prev => !prev);
  }, []);

  const handleClick = useCallback(() => {
    tab.setSelectedField(field);
  }, [tab, field]);

  const handleDoubleClick = useCallback(() => {
    // Add double-click logic if needed
  }, []);

  const handleContextMenu = useCallback((_e: React.MouseEvent) => {
    // Add context menu logic if needed
  }, []);

  const handleSelect = useCallback((_nodeId: string) => {
    tab.setSelectedField(field);
  }, [tab, field]);

  const onAddStruct = useCallback(() => {
    if(field.getType() == KotOR.GFFDataType.LIST){
      const struct = new KotOR.GFFStruct(-1);
      field.addChildStruct(struct);
      rerender(!render);
    }
  }, [field, render]);

  if(!field) return <></>;

  let is_list = false;
  let field_value = '';
  switch(field.getType()){
    case KotOR.GFFDataType.BYTE:
    case KotOR.GFFDataType.CHAR:
    case KotOR.GFFDataType.WORD:
    case KotOR.GFFDataType.SHORT:
    case KotOR.GFFDataType.DWORD:
    case KotOR.GFFDataType.INT:
    case KotOR.GFFDataType.DWORD64:
    case KotOR.GFFDataType.DOUBLE:
    case KotOR.GFFDataType.FLOAT:
    case KotOR.GFFDataType.RESREF:
    case KotOR.GFFDataType.CEXOSTRING:
      field_value = `Value: ${field.getValue()}`;
    break;
    case KotOR.GFFDataType.LIST:
      field_value = `Structs: ${field.getChildStructs().length}`;
      is_list = true;
    break;
    case KotOR.GFFDataType.STRUCT:
      field_value = '';
      is_list = true;
    break;
    default:
      field_value = '';
    break;
  }

  // Memoize child nodes to prevent unnecessary re-renders
  const childNodes = useMemo(() => {
    if (!openState || !field) return null;

    const structNodes = field.getChildStructs().map((struct: KotOR.GFFStruct) => (
      <GFFStructElement
        struct={struct}
        key={struct.uuid}
        tab={props.tab}
        depth={depth + 1}
      />
    ));

    const addStructNode = field.getType() === KotOR.GFFDataType.LIST ? (
      <li className="gff-struct add" onClick={onAddStruct} key="add-struct">
        <span className="struct-icon">
          <i className="fa-solid fa-plus"></i>
        </span>
        <span className="struct-label">
          <a>[Add Struct]</a>
        </span>
      </li>
    ) : null;

    return addStructNode ? [...structNodes, addStructNode] : structNodes;
  }, [openState, field, props.tab, depth, onAddStruct]);

  const hasChildren = field.getChildStructs().length > 0 || field.getType() === KotOR.GFFDataType.LIST;
  const fieldName = `${field.getLabel()} [${KotOR.GFFObject.TypeValueToString(field.getType())}] ${field_value}`;

  return (
    <ListItemNode
      id={field.uuid}
      name={fieldName}
      hasChildren={hasChildren}
      isExpanded={openState}
      isSelected={false}
      depth={depth}
      icon={is_list ? "fa-list" : "fa-file"}
      iconType={is_list ? "folder" : "file"}
      onToggle={handleToggle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onSelect={handleSelect}
      dataAttributes={{
        'data-field-type': field.getType(),
        'data-field-label': field.getLabel(),
        'data-uuid': field.uuid
      }}
    >
      {childNodes}
    </ListItemNode>
  );
});

const GFFStructProperties = function(props: any){
  const node: KotOR.GFFStruct = props.node;

  return <></>;
}

const GFFFieldProperties = function(props: any){
  const node: KotOR.GFFField = props.node;

  const [value, setValue] = useState<any>( '' );
  const [valueX, setValueX] = useState<any>( 0 );
  const [valueY, setValueY] = useState<any>( 0 );
  const [valueZ, setValueZ] = useState<any>( 0 );
  const [valueW, setValueW] = useState<any>( 0 );

  const [valueStrRef, setValueStrRef] = useState<any>( -1 );

  useEffect( () => {
    if(node instanceof KotOR.GFFField){
      setValue(node.getValue());
      if(node.getType() == KotOR.GFFDataType.VECTOR){
        setValueX(node.getVector().x);
        setValueY(node.getVector().y);
        setValueZ(node.getVector().z);
      }
      
      if(node.getType() == KotOR.GFFDataType.ORIENTATION){
        setValueX(node.getOrientation().x);
        setValueY(node.getOrientation().y);
        setValueZ(node.getOrientation().z);
        setValueW(node.getOrientation().w);
      }

      if(node.getType() == KotOR.GFFDataType.CEXOLOCSTRING){
        setValueStrRef(node.getCExoLocString().getRESREF());
      }
    }
  });

  const onSimpleValueChange = function(e: ChangeEvent<HTMLInputElement>){
    let value: any = e.target.value;
    if(node.getType() == KotOR.GFFDataType.RESREF){
      value = value.substring(0, 16);
    }

    if(node.getType() == KotOR.GFFDataType.CEXOSTRING){
      value = new String(value);
    }

    if(node.getType() == KotOR.GFFDataType.FLOAT){
      value = parseFloat(value);
    }

    if(node.getType() == KotOR.GFFDataType.DOUBLE){
      value = parseFloat(value);
    }

    if(node.getType() == KotOR.GFFDataType.BYTE){
      value = parseInt(value) & 0xFF;
    }

    if(node.getType() == KotOR.GFFDataType.CHAR){
      value = parseInt(value) << 24 >> 24;
    }

    if(node.getType() == KotOR.GFFDataType.WORD){
      value = parseInt(value) & 0xFFFF;
    }

    if(node.getType() == KotOR.GFFDataType.SHORT){
      value = parseInt(value) << 16 >> 16;
    }

    if(node.getType() == KotOR.GFFDataType.DWORD){
      value = parseInt(value) & 0xFFFFFFFF;
    }

    if(node.getType() == KotOR.GFFDataType.INT){
      value = parseInt(value) << 0 >> 0;
    }

    if(node.getType() == KotOR.GFFDataType.DWORD64){
      value = value;
    }

    if(node.getType() == KotOR.GFFDataType.INT64){
      value = value;
    }

    node.setValue(value);
    setValue(node.getValue());
  }

  const onVectorValueChange = function(e: ChangeEvent<HTMLInputElement>, mode: 'x'|'y'|'z'){
    node.getVector()[mode] = parseFloat(e.target.value);
    switch(mode){
      case 'x':
        setValueX(parseFloat(e.target.value));
      break;
      case 'y':
        setValueY(parseFloat(e.target.value));
      break;
      case 'z':
        setValueZ(parseFloat(e.target.value));
      break;
    }
  }

  const onOrientationValueChange = function(e: ChangeEvent<HTMLInputElement>, mode: 'x'|'y'|'z'|'w'){
    node.getOrientation()[mode] = parseFloat(e.target.value);
    switch(mode){
      case 'x':
        setValueX(parseFloat(e.target.value));
      break;
      case 'y':
        setValueY(parseFloat(e.target.value));
      break;
      case 'z':
        setValueZ(parseFloat(e.target.value));
      break;
      case 'w':
        setValueW(parseFloat(e.target.value));
      break;
    }
  }

  if(node instanceof KotOR.GFFField){
    switch(node.getType()){
      case KotOR.GFFDataType.BYTE:
      case KotOR.GFFDataType.CHAR:
      case KotOR.GFFDataType.WORD:
      case KotOR.GFFDataType.SHORT:
      case KotOR.GFFDataType.DWORD:
      case KotOR.GFFDataType.INT:
      case KotOR.GFFDataType.DWORD64:
      case KotOR.GFFDataType.INT64:
      case KotOR.GFFDataType.DOUBLE:
      case KotOR.GFFDataType.FLOAT:
      case KotOR.GFFDataType.RESREF:
      case KotOR.GFFDataType.CEXOSTRING:
        return (
          <fieldset>
            <legend>[{KotOR.GFFDataType[node.getType()]}] - {node.getLabel()}</legend>
            <InputGroup>
              <InputGroup.Text>Value</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="text"
                value={value}
                onChange={ (e: ChangeEvent<HTMLInputElement>) => onSimpleValueChange(e) }
              />
            </InputGroup>
          </fieldset>
        );
      break;
      case KotOR.GFFDataType.LIST:
        return (
          <fieldset>
            <legend>[{KotOR.GFFDataType[node.getType()]}]</legend>
          </fieldset>
        );
      break;
      case KotOR.GFFDataType.STRUCT:
        return (
          <fieldset>
            <legend>[{KotOR.GFFDataType[node.getType()]}]</legend>
          </fieldset>
        );
      break;
      case KotOR.GFFDataType.VECTOR:
        return (
          <fieldset>
            <legend>[{KotOR.GFFDataType[node.getType()]}]</legend>
            <InputGroup>
              <InputGroup.Text>X</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={valueX}
                onChange={ (e: ChangeEvent<HTMLInputElement>) => onVectorValueChange(e, 'x') }
              />
            </InputGroup>
            <InputGroup>
              <InputGroup.Text>Y</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={valueY}
                onChange={ (e: ChangeEvent<HTMLInputElement>) => onVectorValueChange(e, 'y') }
              />
            </InputGroup>
            <InputGroup>
              <InputGroup.Text>Z</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={valueZ}
                onChange={ (e: ChangeEvent<HTMLInputElement>) => onVectorValueChange(e, 'z') }
              />
            </InputGroup>
          </fieldset>
        );
      break;
      case KotOR.GFFDataType.ORIENTATION:
        return (
          <fieldset>
            <legend>[{KotOR.GFFDataType[node.getType()]}]</legend>
            <InputGroup>
              <InputGroup.Text>X</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={valueX}
                onChange={ (e: ChangeEvent<HTMLInputElement>) => onOrientationValueChange(e, 'x') }
              />
            </InputGroup>
            <InputGroup>
              <InputGroup.Text>Y</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={valueY}
                onChange={ (e: ChangeEvent<HTMLInputElement>) => onOrientationValueChange(e, 'y') }
              />
            </InputGroup>
            <InputGroup>
              <InputGroup.Text>Z</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={valueZ}
                onChange={ (e: ChangeEvent<HTMLInputElement>) => onOrientationValueChange(e, 'z') }
              />
            </InputGroup>
            <InputGroup>
              <InputGroup.Text>W</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={valueW}
                onChange={ (e: ChangeEvent<HTMLInputElement>) => onOrientationValueChange(e, 'w') }
              />
            </InputGroup>
          </fieldset>
        );
      break;
      case KotOR.GFFDataType.CEXOLOCSTRING:
        return (
          <>
          <fieldset>
            <legend>CExoLocString</legend>
            <InputGroup>
              <InputGroup.Text>StringRef</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={valueStrRef}
                onChange={ (e: ChangeEvent<HTMLInputElement>) => console.log(e) }
              />
            </InputGroup>
            <InputGroup>
              <InputGroup.Text>Text</InputGroup.Text>
              <Form.Control
                disabled={true}
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="text"
                value={node.getCExoLocString().getValue()}
                as="textarea" rows={5}
              />
            </InputGroup>
          </fieldset>
          <fieldset>
            <legend>Sub String</legend>
          </fieldset>
          </>
        );
      break;
      default:
        return (
          <><b>Invalid Field Type: {node.getType()}</b></>
        );
      break;
    }
  }

  return <></>
}
