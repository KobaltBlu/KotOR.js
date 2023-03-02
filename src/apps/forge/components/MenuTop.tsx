import React, { useState } from "react";
import { Container, Nav, Navbar } from 'react-bootstrap';
import { useEffectOnce } from "../helpers/UseEffectOnce";
import { MenuItem } from "./MenuItem";
import { MenuTopState } from "../states/MenuTopState";
import { MenuTopItem } from "../MenuTopItem";
import { ForgeState } from "../states/ForgeState";
import { AudioPlayer } from "./AudioPlayer";
import { FileTypeManager } from "../FileTypeManager";

export const MenuTop = function(props: any) {

  const [items, setItems] = useState<MenuTopItem[]>([]);
  const [render, rerender] = useState<boolean>(false);

  const updateRecentFilesMenuItem = () => {
    MenuTopState.menuItemRecentFiles.items = [];
    for(let i = 0; i < ForgeState.recentFiles.length; i++){
      const file = ForgeState.recentFiles[i];
      MenuTopState.menuItemRecentFiles.items.push(
        new MenuTopItem({
          name: `${file.getFilename()} ${file.getPrettyPath()}`,
          onClick: function(menuItem: MenuTopItem){
            FileTypeManager.onOpenResource(file);
          }
        })
      )
    }
    MenuTopState.menuItemRecentFiles.rebuild();
  };

  const onRecentFilesUpdated = () => {
    updateRecentFilesMenuItem();
  }

  useEffectOnce( () => { //constructor
    setItems([...MenuTopState.items]);
    ForgeState.addEventListener('onRecentFilesUpdated', onRecentFilesUpdated);

    updateRecentFilesMenuItem();

    return () => { //destructor
      ForgeState.removeEventListener('onRecentFilesUpdated', onRecentFilesUpdated);
    }
  });

  return (
    <Navbar className="top-menu" expand="lg">
      <div className="menu-accent"><span className="inner"></span></div>
      <Container fluid>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {items.map((item, i: any) => 
              (
                <MenuItem key={(`menu-item-${item.uuid}`)} item={item}></MenuItem>
              )
            )}
          <AudioPlayer></AudioPlayer>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );

}
