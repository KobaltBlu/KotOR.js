import React, { useState } from "react"
import { BaseTabProps } from "../../interfaces/BaseTabProps"
import { useEffectOnce } from "../../helpers/UseEffectOnce";

import { TabGFFEditorState, TabGFFEditorStateEventListenerTypes } from "../../states/tabs/TabGFFEditorState";

import * as KotOR from "../../KotOR";
import { Form, InputGroup } from "react-bootstrap";

export const TabGFFEditor = function(props: BaseTabProps){

  const tab: TabGFFEditorState = props.tab as TabGFFEditorState;
  const [gff, setGFF] = useState<KotOR.GFFObject>();
  const [selectedNode, setSelectedNode] = useState<KotOR.GFFField|KotOR.GFFStruct>();

  const onEditorFileLoad = function(tab: TabGFFEditorState){
    setGFF(tab.gff);
  };

  const onNodeSelected = function(node: KotOR.GFFField|KotOR.GFFStruct){
    setSelectedNode(node);
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
  <div id="gffContainer" className="css-treeview container" style={{position: 'relative', overflow: 'hidden', height: '100%', width:'50%', float: 'left'}}>
    {
      (
        gff ? <GFFStructElement struct={ gff.RootNode } key={ gff.RootNode.uuid } open={true} tab={tab}  /> : <></>
      )
    }
  </div>
  <div id="gffProperties" className="container" style={{position: 'relative', overflow: 'auto', height: '100%', width:'50%', padding:'10px', float: 'left'}}>
    {(
      selectedNode ? (
        <GFFNodeProperties node={selectedNode} />
      ) : 
      <></>
    )}
  </div>
</>);

};

const GFFStructElement = function(props: any){
  const tab: TabGFFEditorState = props.tab as TabGFFEditorState;
  const [openState, setOpenState] = useState<boolean>(!!props.open);

  const onChangeCheckbox = (e: React.ChangeEvent<HTMLInputElement>, struct: KotOR.GFFStruct) => {
    setOpenState(!openState);
  };

  const onLabelClick = (e: React.MouseEvent<HTMLLabelElement>, struct: KotOR.GFFStruct) => {
    setOpenState(!openState);
    tab.setSelectedField(struct);
  }

  const struct: KotOR.GFFStruct = props.struct;
  if(struct){
    return (
      <li className="gff-struct">
        <input className="node-toggle" type="checkbox" onChange={(e) => onChangeCheckbox(e, props.struct)} />
        <label onClick={(e) => onLabelClick(e, props.struct)}>
          <span>[Struct ID: {struct.GetType()}]</span>
        </label>
        <ul className="gff-fields strt">
        {
          struct.GetFields().map( (field: KotOR.GFFField) => {
            return <GFFFieldElement field={ field } key={ field.uuid } tab={props.tab} />
          })
        }
        </ul>
      </li>
    );
  }

  return <></>;
}

const GFFFieldElement = function(props: any){
  const tab: TabGFFEditorState = props.tab as TabGFFEditorState;
  const [openState, setOpenState] = useState<boolean>(!!props.open);
  const field: KotOR.GFFField = props.field;
  if(field){
    let is_list = false;
    let field_value = '';
    switch(field.GetType()){
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
        field_value = `Value: ${field.GetValue()}`;
      break;
      case KotOR.GFFDataType.LIST:
        field_value = `Structs: ${field.GetChildStructs().length}`;
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

    const onChangeCheckbox = (e: React.ChangeEvent<HTMLInputElement>, field: KotOR.GFFField) => {
      setOpenState(!openState);
    };

    const onLabelClick = (e: React.MouseEvent<HTMLLabelElement>, field: KotOR.GFFField) => {
      setOpenState(!openState);
      tab.setSelectedField(field);
    }

    return (
      <li className="gff-field">
        <input type="checkbox" checked={!openState} onChange={(e) => onChangeCheckbox(e, props.field)}/>
        <label className={ !is_list ? `single` : `list` } onClick={(e) => onLabelClick(e, props.field)}>
          <span>
            <span className="field-label">{field.GetLabel()}</span>&nbsp;
            <span className="field-type">{`[${ KotOR.GFFObject.TypeValueToString( field.GetType() ) }]`}</span>&nbsp;
            <span className="field-value">{field_value}</span>
          </span>
        </label>
        <ul className="gff-fields hasList">
          {
            field.GetChildStructs().map( 
              (struct: KotOR.GFFStruct) => {
                return <GFFStructElement struct={ struct } key={ struct.uuid } tab={props.tab} />
              }
            )
          }
        </ul>
      </li>
    );
  }
  return <></>;
}

const GFFNodeProperties = function(props: any){
  const node: KotOR.GFFField|KotOR.GFFStruct = props.node;

  if(node instanceof KotOR.GFFStruct){
    return (
      <></>
    )
  }else if(node instanceof KotOR.GFFField){
    switch(node.GetType()){
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
        return (
          <fieldset>
            <legend>[{KotOR.GFFDataType[node.GetType()]}] - {node.GetLabel()}</legend>
            <InputGroup>
              <InputGroup.Text>Value</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="text"
                value={node.GetValue()}
              />
            </InputGroup>
          </fieldset>
        );
      break;
      case KotOR.GFFDataType.LIST:
        return (
          <fieldset>
            <legend>[{KotOR.GFFDataType[node.GetType()]}]</legend>
          </fieldset>
        );
      break;
      case KotOR.GFFDataType.STRUCT:
        return (
          <fieldset>
            <legend>[{KotOR.GFFDataType[node.GetType()]}]</legend>
          </fieldset>
        );
      break;
      case KotOR.GFFDataType.VECTOR:
        return (
          <fieldset>
            <legend>[{KotOR.GFFDataType[node.GetType()]}]</legend>
            <InputGroup>
              <InputGroup.Text>X</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={node.GetVector().x}
              />
            </InputGroup>
            <InputGroup>
              <InputGroup.Text>Y</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={node.GetVector().y}
              />
            </InputGroup>
            <InputGroup>
              <InputGroup.Text>Z</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={node.GetVector().z}
              />
            </InputGroup>
          </fieldset>
        );
      break;
      case KotOR.GFFDataType.ORIENTATION:
        return (
          <fieldset>
            <legend>[{KotOR.GFFDataType[node.GetType()]}]</legend>
            <InputGroup>
              <InputGroup.Text>X</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={node.GetOrientation().x}
              />
            </InputGroup>
            <InputGroup>
              <InputGroup.Text>Y</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={node.GetOrientation().y}
              />
            </InputGroup>
            <InputGroup>
              <InputGroup.Text>Z</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={node.GetOrientation().z}
              />
            </InputGroup>
            <InputGroup>
              <InputGroup.Text>W</InputGroup.Text>
              <Form.Control
                placeholder=""
                aria-label=""
                aria-describedby="basic-addon1"
                type="number"
                value={node.GetOrientation().w}
              />
            </InputGroup>
          </fieldset>
        );
      break;
      default:
        return (
          <><b>Invalid Field Type: {node.GetType()}</b></>
        );
      break;
    }
  }

  return <></>
}