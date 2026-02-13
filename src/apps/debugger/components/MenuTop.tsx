import React, { useState } from "react";
import { Container, Nav, Navbar } from 'react-bootstrap';

import { useEffectOnce } from "../helpers/UseEffectOnce";
import { MenuTopItem } from "../MenuTopItem";
import { MenuTopState } from "../states/MenuTopState";

import { MenuItem } from "./MenuItem";

export interface MenuTopProps {
  /** Optional - MenuTop manages its own state from MenuTopState */
}

export const MenuTop = function(_props: MenuTopProps) {

  const [items, setItems] = useState<MenuTopItem[]>([]);
  const [render, rerender] = useState<boolean>(false);

  useEffectOnce( () => { //constructor
    setItems([...MenuTopState.items]);
    // ForgeState.addEventListener('onRecentFilesUpdated', onRecentFilesUpdated);

    return () => { //destructor
      // ForgeState.removeEventListener('onRecentFilesUpdated', onRecentFilesUpdated);
    }
  });

  return (
    <Navbar className="top-menu" expand="lg">
      <div className="menu-accent"><span className="inner"></span></div>
      <Container fluid>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {items.map((item, i: number) => 
              (
                <MenuItem key={(`menu-item-${item.uuid}`)} item={item}></MenuItem>
              )
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );

}
