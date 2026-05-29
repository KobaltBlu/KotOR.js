import React, { useState } from 'react';
import { Container, Nav, Navbar } from 'react-bootstrap';
import { useEffectOnce } from '@/apps/debugger/helpers/UseEffectOnce';
import { MenuItem } from '@/apps/debugger/components/MenuItem';
import { MenuTopState } from '@/apps/debugger/states/MenuTopState';
import { MenuTopItem } from '@/apps/debugger/MenuTopItem';

export const MenuTop = function (props: any) {
  const [items, setItems] = useState<MenuTopItem[]>([]);
  const [render, rerender] = useState<boolean>(false);

  useEffectOnce(() => {
    //constructor
    setItems([...MenuTopState.items]);
    // ForgeState.addEventListener('onRecentFilesUpdated', onRecentFilesUpdated);

    return () => {
      //destructor
      // ForgeState.removeEventListener('onRecentFilesUpdated', onRecentFilesUpdated);
    };
  });

  return (
    <Navbar className="top-menu" expand="lg">
      <div className="menu-accent">
        <span className="inner"></span>
      </div>
      <Container fluid>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {items.map((item, i: any) => (
              <MenuItem key={`menu-item-${item.uuid}`} item={item}></MenuItem>
            ))}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};
