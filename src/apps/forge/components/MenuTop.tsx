import React, { useState, useCallback, useMemo, memo } from "react";
import { Container, Nav, Navbar } from 'react-bootstrap';
import { useEffectOnce } from "../helpers/UseEffectOnce";
import { MenuItem } from "./MenuItem";
import { MenuTopState } from "../states/MenuTopState";
import { MenuTopItem } from "../MenuTopItem";
import { ForgeState } from "../states/ForgeState";
import { AudioPlayer } from "./AudioPlayer";
import { FileTypeManager } from "../FileTypeManager";

export interface MenuTopProps {
  className?: string;
}

export const MenuTop = memo(function MenuTop(props: MenuTopProps = {}) {
  const { className = '' } = props;

  const [items, setItems] = useState<MenuTopItem[]>([]);

  // Memoize the recent files update logic
  const updateRecentFilesMenuItem = useCallback(() => {
    MenuTopState.menuItemRecentFiles.items = [];
    
    ForgeState.recentFiles.forEach((file) => {
      MenuTopState.menuItemRecentFiles.items.push(
        new MenuTopItem({
          name: `${file.getFilename()} ${file.getPrettyPath()}`,
          onClick: (menuItem: MenuTopItem) => {
            FileTypeManager.onOpenResource(file);
          }
        })
      );
    });
    
    MenuTopState.menuItemRecentFiles.rebuild();
  }, []);

  // Memoize the event handler
  const onRecentFilesUpdated = useCallback(() => {
    updateRecentFilesMenuItem();
  }, [updateRecentFilesMenuItem]);

  const onMenuTopItemsUpdated = useCallback(() => {
    setItems([...MenuTopState.items]);
  }, []);

  // Component lifecycle
  useEffectOnce(() => {
    setItems([...MenuTopState.items]);
    ForgeState.addEventListener('onRecentFilesUpdated', onRecentFilesUpdated);
    MenuTopState.addEventListener('onMenuTopItemsUpdated', onMenuTopItemsUpdated);
    updateRecentFilesMenuItem();

    return () => {
      ForgeState.removeEventListener('onRecentFilesUpdated', onRecentFilesUpdated);
      MenuTopState.removeEventListener('onMenuTopItemsUpdated', onMenuTopItemsUpdated);
    };
  });

  // Memoize menu items rendering
  const menuItems = useMemo(() => (
    items.map((item) => (
      <MenuItem 
        key={`menu-item-${item.uuid}`} 
        item={item}
      />
    ))
  ), [items]);

  return (
    <Navbar className={`top-menu ${className}`.trim()} expand="lg">
      <div className="menu-accent">
        <span className="inner" />
      </div>
      <Container fluid>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {menuItems}
            <AudioPlayer />
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
});
