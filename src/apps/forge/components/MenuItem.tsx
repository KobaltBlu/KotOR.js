import React, { ComponentProps, ReactEventHandler } from "react";
import { Container, Dropdown, Nav, NavDropdown, Navbar } from 'react-bootstrap';

export const MenuItem = function(props: any){
  const item = props.item;
  const parent = props.parent;
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
            <MenuItem key={(`menu-item-proto-${child.id}`)} item={child} parent={item}></MenuItem>
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
