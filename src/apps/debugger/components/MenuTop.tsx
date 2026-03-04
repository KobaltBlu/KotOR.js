import React, { useState } from "react";
import { Container, Nav, Navbar } from 'react-bootstrap';

import { MenuItem } from "@/apps/debugger/components/MenuItem";
import { useEffectOnce } from "@/apps/debugger/helpers/UseEffectOnce";
import { MenuTopItem } from "@/apps/debugger/MenuTopItem";
import { MenuTopState } from "@/apps/debugger/states/MenuTopState";


/** MenuTop manages its own state from MenuTopState; no required props. */
export type MenuTopProps = Record<string, never>;

export const MenuTop = function(_props: MenuTopProps) {

  const [items, setItems] = useState<MenuTopItem[]>([]);
  const [_render, _setRerender] = useState<boolean>(false);

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
            {items.map((item, _i: number) =>
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
