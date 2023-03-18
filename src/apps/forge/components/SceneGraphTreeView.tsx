import React, { useState } from "react";
import { SceneGraphNode, SceneGraphNodeEventListenerTypes } from "../SceneGraphNode";
import { useEffectOnce } from "../helpers/UseEffectOnce";
import { SceneGraphTreeViewManager } from "../managers/SceneGraphTreeViewManager";

export const SceneGraphTreeView = function (props: any) {
  const manager: SceneGraphTreeViewManager = props.manager;
  return (
<ul className="tree css-treeview js" style={{ height: '350px', overflow: 'auto'}}>
    {
      manager.parentNodes.map( (node: SceneGraphNode) => {
        return (
          <SceneGraphTreeViewNode manager={manager} key={node.id} node={node} />
        )
      })
    }
    </ul>
  );
}

export const SceneGraphTreeViewNode = function (props: any) {
  const manager: SceneGraphTreeViewManager = props.manager;
  const node: SceneGraphNode = props.node;
  const [nodes, setNodes] = useState<SceneGraphNode[]>([...node.nodes]);
  const [openState, setOpenState] = useState<boolean>(node.open);
  const [render, rerender] = useState<boolean>(false);

  const onNameChange = () => {
    rerender(!render);
  };

  const onExpandStateChange = () => {
    setOpenState(node.open);
  };

  const onNodesChange = () => {
    setNodes([...node.nodes]);
  }

  useEffectOnce( () => {
    node.addEventListener<SceneGraphNodeEventListenerTypes>('onNameChange', onNameChange);
    node.addEventListener<SceneGraphNodeEventListenerTypes>('onExpandStateChange', onExpandStateChange);
    node.addEventListener<SceneGraphNodeEventListenerTypes>('onNodesChange', onNodesChange);
    return () => {
      node.removeEventListener<SceneGraphNodeEventListenerTypes>('onNameChange', onNameChange);
      node.removeEventListener<SceneGraphNodeEventListenerTypes>('onExpandStateChange', onExpandStateChange);
      node.removeEventListener<SceneGraphNodeEventListenerTypes>('onNodesChange', onNodesChange);
    }
  });

  const onClickNode = (e: React.MouseEvent<HTMLLIElement>, node: SceneGraphNode) => {
    e.stopPropagation();
    if(typeof node.onClick === 'function'){
      node.onClick(node);
    }
  };

  const onChangeCheckbox = (e: React.ChangeEvent<HTMLInputElement>, node: SceneGraphNode) => {
    setOpenState(!openState);
  };

  const onLabelClick = (e: React.MouseEvent<HTMLLabelElement>, node: SceneGraphNode) => {
    setOpenState(!openState);
  }

  if(nodes.length){
    return (
      <li onClick={(e) => onClickNode(e, props.node)}>
        <input type="checkbox" checked={!openState} onChange={(e) => onChangeCheckbox(e, props.node)} />
        <label onClick={(e) => onLabelClick(e, props.node)}>
          {node.icon?.length ? <i className={node.icon}></i> : <></>}
          {node.name}
        </label>
        <ul>
          {
            (openState) ? (
              nodes.map( (child: SceneGraphNode) => (
                <SceneGraphTreeViewNode key={child.id} node={child} />
              ))
            ) : (<></>)
          }
        </ul>
      </li>
    );
  }else{
    return (
      <li className="link" data-path={node.data.path} onClick={(e) => onClickNode(e, props.node)}>
        {node.icon?.length ? <i className={node.icon}></i> : <></>}
        {node.name}
      </li>
    );
  }
}
