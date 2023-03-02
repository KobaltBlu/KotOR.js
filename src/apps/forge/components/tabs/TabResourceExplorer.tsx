import React, {forwardRef, useImperativeHandle, useState} from "react";
import { FileBrowserNode, TabResourceExplorerState } from "../../states/tabs";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { FileTypeManager } from "../../FileTypeManager";
import { EditorFile } from "../../EditorFile";
import { Form, ProgressBar } from "react-bootstrap";

export interface ResourceListNodeProps {
  node: FileBrowserNode;
  depth?: number;
  children?: any;
}

export const ResourceListNode = function(props: ResourceListNodeProps){
  const node = props.node;
  const [openState, setOpenState] = useState<boolean>(node.open);

  const onClickNode = (e: React.MouseEvent<HTMLLIElement>, node: FileBrowserNode) => {
    e.stopPropagation();
    if(node.type == 'resource'){
      console.log('resource', node);
      // let resref = e.target.dataset.resref;
      // let reskey = parseInt(e.target.dataset.resid);
      // let type = e.target.dataset.type;
      // let archive = e.target.dataset.archive;

      FileTypeManager.onOpenResource(
        new EditorFile({
          path: node.data.path,
          useGameFileSystem: true,
        })
      );
    }
  };

  const onChangeCheckbox = (e: React.ChangeEvent<HTMLInputElement>, node: FileBrowserNode) => {
    setOpenState(!openState);
  };

  const onLabelClick = (e: React.MouseEvent<HTMLLabelElement>, node: FileBrowserNode) => {
    setOpenState(!openState);
  }

  if(node.nodes.length){
    return (
      <li onClick={(e) => onClickNode(e, props.node)}>
        <input type="checkbox" checked={!openState} onChange={(e) => onChangeCheckbox(e, props.node)} />
        <label onClick={(e) => onLabelClick(e, props.node)}>{node.name}</label>
        <ul>
          {
            (openState) ? (
              node.nodes.map( (child: FileBrowserNode) => (
                <ResourceListNode key={child.id} node={child} />
              ))
            ) : (<></>)
          }
        </ul>
      </li>
    );
  }else{
    return (
      <li className="link" data-path={node.data.path} onDoubleClick={(e) => onClickNode(e, props.node)}>
        {node.name}
      </li>
    );
  }
}

export interface TabResourceExplorerProps extends BaseTabProps {
  tab: TabResourceExplorerState;
  nodes: FileBrowserNode[];
}

export const TabResourceExplorer = function(props: TabResourceExplorerProps){
  const [resourceList, setResourceList] = useState<FileBrowserNode[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  let searchQuery = '';
  let searchDelay: any;

  useEffectOnce(() => {
    const tab = props.tab as TabResourceExplorerState;
    if(tab){
      tab.onReload = () => {
        setResourceList(TabResourceExplorerState.Resources);
      }
    }
  });

  const onSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearTimeout(searchDelay);
    searchQuery = e.target.value.trim();
    setLoading(true);
    searchDelay = setTimeout(() => {
      console.log('TimeOut');
      search(searchQuery)
    }, 500);
  }

  const search = (value: string) => {
    if(!!value.length){
      setResourceList(
        TabResourceExplorerState.Resources.map( n => n.searchFor(value) ).flat()
      );
      setLoading(false);
    }else{
      setResourceList(TabResourceExplorerState.Resources);
      setLoading(false);
    }
  }

  //
  
  return (
    <div className="flex-vertical" style={{
      position: 'absolute',
      top: '0px',
      bottom: '0px',
      left: '0px',
      right: '0px',
    }}>
      <Form className="d-flex align-items-start" style={{
        padding: '5px 0',
      }}>
        <span style={{padding: '5px'}}>
          <i className="fa-solid fa-magnifying-glass"></i>
        </span>
        <Form.Control
          type="search"
          placeholder="Search"
          className="me-2"
          aria-label="Search"
          onChange={onSearchInput}
        />
      </Form>
      
      <div style={{
        display: `${!!loading ? 'block' : 'none'}`, 
        padding: '5px',
        width: '100%', 
        height: '100px',
      }}>
        <div style={{}}>
          <ProgressBar striped animated={true} now={100} label={`Searching...`} style={{
            minWidth: '100%',
            minHeight: '25px',
          }}/>
        </div>
      </div>
      <div className="scroll-container" style={{ 
        display: `${!loading ? 'block' : 'none'}`, 
        width:'100%', 
        overflow: 'auto',
      }}>
        <ul className="tree css-treeview js">
          {
            resourceList.map( (node: FileBrowserNode) => {
              return (
                <ResourceListNode key={node.id} node={node} depth={0} />
              )
            })
          }
        </ul>
      </div>
    </div>
  );

};
