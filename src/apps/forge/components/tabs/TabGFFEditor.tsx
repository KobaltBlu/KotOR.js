import React, { ChangeEvent, useEffect, useState } from "react"
import { BaseTabProps } from "../../interfaces/BaseTabProps"
import { useEffectOnce } from "../../helpers/UseEffectOnce";

import { TabGFFEditorState, TabGFFEditorStateEventListenerTypes } from "../../states/tabs";

import * as KotOR from "../../KotOR";
import { Form, InputGroup } from "react-bootstrap";

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
  <div id="gffContainer" className="css-treeview container" style={{position: 'relative', overflow: 'auto', height: '100%', width:'50%', float: 'left'}}>
    {
      (
        gff ? <GFFStructElement struct={ gff.RootNode } key={ gff.RootNode.uuid } open={true} tab={tab}  /> : <></>
      )
    }
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

const GFFStructElement = function(props: any){
  const tab: TabGFFEditorState = props.tab as TabGFFEditorState;
  const [openState, setOpenState] = useState<boolean>(!!props.open);
  const struct: KotOR.GFFStruct = props.struct;
  const [render, rerender] = useState<boolean>(true);

  const onChangeCheckbox = (e: React.ChangeEvent<HTMLInputElement>, struct: KotOR.GFFStruct) => {
    setOpenState(!openState);
  };

  const onLabelClick = (e: React.MouseEvent<HTMLLabelElement>, struct: KotOR.GFFStruct) => {
    setOpenState(!openState);
    tab.setSelectedField(struct);
  }

  const onAddField = function(){
    struct.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'New Field [Untitled]', 0));
    rerender(!render);
  };

  if(struct){
    return (
      <li className="gff-struct">
        <input className="node-toggle" type="checkbox" onChange={(e) => onChangeCheckbox(e, props.struct)} />
        <label onClick={(e) => onLabelClick(e, props.struct)}>
          <span>[Struct ID: {struct.getType()}]</span>
        </label>
        <ul className="gff-fields strt">
        {
          struct.getFields().map( (field: KotOR.GFFField) => {
            return <GFFFieldElement field={ field } key={ field.uuid } tab={props.tab} />
          })
        }
        {( 
          <li className="gff-field add" onClick={(e) => onAddField()}>
            <span className="field-icon">
              <i className="fa-solid fa-plus"></i>
            </span>
            <span className="field-label">
              <a>[Add Field]</a>
            </span>
          </li> 
        )}
        </ul>
      </li>
    );
  }

  return <></>;
}

const GFFFieldElement = function(props: any){
  const tab: TabGFFEditorState = props.tab as TabGFFEditorState;
  const [openState, setOpenState] = useState<boolean>(!!props.open);
  const [render, rerender] = useState<boolean>(true);

  const field: KotOR.GFFField = props.field;

  if(field){
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

    const onChangeCheckbox = (e: React.ChangeEvent<HTMLInputElement>, field: KotOR.GFFField) => {
      setOpenState(!openState);
    };

    const onLabelClick = (e: React.MouseEvent<HTMLLabelElement>, field: KotOR.GFFField) => {
      setOpenState(!openState);
      tab.setSelectedField(field);
    }

    const onAddStruct = function(){
      if(field.getType() == KotOR.GFFDataType.LIST){
        const struct = new KotOR.GFFStruct(-1);
        field.addChildStruct(struct);
        rerender(!render);
      }
    };

    return (
      <li className="gff-field">
        <input type="checkbox" checked={!openState} onChange={(e) => onChangeCheckbox(e, props.field)}/>
        <label className={ !is_list ? `single` : `list` } onClick={(e) => onLabelClick(e, props.field)}>
          <span>
            <span className="field-label">{field.getLabel()}</span>&nbsp;
            <span className={`field-type ${KotOR.GFFDataType[field.getType()]}`}>{`[${ KotOR.GFFObject.TypeValueToString( field.getType() ) }]`}</span>&nbsp;
            <span className="field-value">{field_value}</span>
          </span>
        </label>
        <ul className="gff-fields hasList">
          {
            field.getChildStructs().map( 
              (struct: KotOR.GFFStruct) => {
                return <GFFStructElement struct={ struct } key={ struct.uuid } tab={props.tab} />
              }
            )
          }
          {( field.getType() == KotOR.GFFDataType.LIST ? ( 
          <li className="gff-struct add" onClick={ (e) => onAddStruct() }>
            <span className="struct-icon">
              <i className="fa-solid fa-plus"></i>
            </span>
            <span className="struct-label">
              <a>[Add Struct]</a>
            </span>
          </li> ) : <></> )}
        </ul>
      </li>
    );
  }
  return <></>;
}

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