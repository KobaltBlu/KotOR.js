import React, { ComponentProps, ReactEventHandler, useState } from "react";
import { Container, Dropdown, Nav, NavDropdown, Navbar } from 'react-bootstrap';
import { useEffectOnce } from "../helpers/UseEffectOnce";

export const MenuItem = function(props: any){
  const item = props.item;
  const parent = props.parent;

  const [render, rerender] = useState<boolean>(false);

  const onRebuild = () => {
    rerender(!render);
    if(parent) parent.rebuild();
  };

  useEffectOnce( () => { //constructor
    item.addEventListener('onRebuild', onRebuild);
    return () => { //deconstructor
      item.removeEventListener('onRebuild', onRebuild);
    }
  });

  const onClick = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if(typeof item.onClick === 'function'){
      item.onClick(e, item);
    }
  }

  if(item.type === 'separator' || item.type === 'sep'){
    return (
      <Dropdown.Divider></Dropdown.Divider>
    );
  }else if(item.items.length){
    return (
      <NavDropdown title={item.name}>
        {item.items.map((child: any, i: any) => 
          (
            <MenuItem key={(`menu-item-${child.uuid}`)} item={child} parent={item}></MenuItem>
          )
        )}
      </NavDropdown>
    );
  }else if(parent){
    return (
      <NavDropdown.Item item={item} onClick={onClick}>{item.name}</NavDropdown.Item>
    );
  }else{
    return (
      <Nav.Link onClick={onClick}>{item.name}</Nav.Link>
    );
  }
}
