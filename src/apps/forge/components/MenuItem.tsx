import React, { useState } from "react";
import { Dropdown, Nav, NavDropdown } from 'react-bootstrap';
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";

export const MenuItem = function (props: any) {
  const item = props.item;
  const parent = props.parent;

  const [render, rerender] = useState<boolean>(false);

  const onRebuild = () => {
    rerender(!render);
    if (parent) parent.rebuild();
  };

  useEffectOnce(() => {
    //constructor
    item.addEventListener('onRebuild', onRebuild);
    return () => {
      //deconstructor
      item.removeEventListener('onRebuild', onRebuild);
    };
  });

  const onClick = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if (typeof item.onClick === 'function') {
      item.onClick(e, item);
    }
  };

  const renderItemName = () => {
    return (
      <span className="dropdown-item-name-wrapper">
        <span className="dropdown-item-name">{item.checked ? "✓ " : ""}{item.name}</span>
      </span>
    );
  };

  if(item.type === 'separator' || item.type === 'sep'){
    return (
      <Dropdown.Divider></Dropdown.Divider>
    );
  }else if(item.type === 'title'){
    return (
      <Dropdown.Header className="forge-menu-title">{item.name}</Dropdown.Header>
    );
  }else if(item.items.length){
    return (
      <NavDropdown
        title={item.name}
        drop={parent ? 'end' : 'down'}
        className={parent ? 'forge-menu-submenu' : 'forge-menu-root-item'}
      >
        {item.items.map((child: any, i: any) => 
          (
            <MenuItem key={(`menu-item-${child.uuid}`)} item={child} parent={item}></MenuItem>
          )
        )}
      </NavDropdown>
    );
  }else if(parent){
    return (
      <NavDropdown.Item onClick={onClick}>{renderItemName()}</NavDropdown.Item>
    );
  }else{
    return (
      <Nav.Link onClick={onClick}>{renderItemName()}</Nav.Link>
    );
  }
};
