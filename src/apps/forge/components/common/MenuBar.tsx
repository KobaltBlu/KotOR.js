import React, { useState, useRef, useEffect, useCallback } from "react";

export interface MenuItem {
  label?: string;
  shortcut?: string;
  onClick?: () => void;
  children?: MenuItem[];
  disabled?: boolean;
  separator?: boolean;
  checked?: boolean;
}

interface MenuBarProps {
  items: MenuItem[];
}

const SUBMENU_CLOSE_DELAY_MS = 220;

export const MenuBar: React.FC<MenuBarProps> = ({ items }) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /** Clears pending nested-submenu close; must run when entering any row or flyout that keeps that path open. */
  const submenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingSubmenuClose = useCallback(() => {
    if (submenuCloseTimerRef.current !== null) {
      clearTimeout(submenuCloseTimerRef.current);
      submenuCloseTimerRef.current = null;
    }
  }, []);

  const scheduleSubmenuClose = useCallback(
    (path: string) => {
      cancelPendingSubmenuClose();
      submenuCloseTimerRef.current = setTimeout(() => {
        submenuCloseTimerRef.current = null;
        setOpenSubmenu((prev) => (prev === path ? null : prev));
      }, SUBMENU_CLOSE_DELAY_MS);
    },
    [cancelPendingSubmenuClose],
  );

  useEffect(() => {
    return () => cancelPendingSubmenuClose();
  }, [cancelPendingSubmenuClose]);

  const handleMenuClick = useCallback((label?: string) => {
    setOpenMenu((prev) => (prev === label ? null : label ?? null));
    setOpenSubmenu(null);
    cancelPendingSubmenuClose();
  }, [cancelPendingSubmenuClose]);

  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.children) {
      return; // Don't close menu if it has children
    }
    if (item.onClick) {
      item.onClick();
    }
    setOpenMenu(null);
    setOpenSubmenu(null);
    cancelPendingSubmenuClose();
  }, [cancelPendingSubmenuClose]);

  const closeAllMenus = useCallback(() => {
    cancelPendingSubmenuClose();
    setOpenMenu(null);
    setOpenSubmenu(null);
  }, [cancelPendingSubmenuClose]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeAllMenus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeAllMenus]);

  const renderMenuItem = (item: MenuItem, index: number, parentPath: string = '') => {
    const itemPath = `${parentPath}-${index}`;
    const hasChildren = item.children && item.children.length > 0;
    const isSubmenuOpen = openSubmenu === itemPath;

    if (item.separator) {
      return (
        <div
          key={itemPath}
          style={{
            height: '1px',
            backgroundColor: '#555',
            margin: '2px 0',
          }}
        />
      );
    }

    return (
      <div
        key={itemPath}
        style={{
          position: 'relative',
        }}
        onMouseEnter={() => {
          if (hasChildren) {
            cancelPendingSubmenuClose();
            setOpenSubmenu(itemPath);
          }
        }}
        onMouseLeave={() => {
          if (hasChildren) {
            scheduleSubmenuClose(itemPath);
          }
        }}
      >
        <div
          onClick={() => handleItemClick(item)}
          style={{
            padding: '4px 24px 4px 20px',
            cursor: item.disabled ? 'not-allowed' : 'pointer',
            backgroundColor: isSubmenuOpen ? '#2a5a7a' : 'transparent',
            color: item.disabled ? '#666' : '#ccc',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            if (!item.disabled) {
              e.currentTarget.style.backgroundColor = '#2a5a7a';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSubmenuOpen) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {item.checked && (
              <span style={{ fontSize: '12px', color: '#4EC9B0' }}>✓</span>
            )}
            <span>{item.label}</span>
          </span>
          {hasChildren ? (
            <span style={{ marginLeft: '20px', fontSize: '10px' }}>▶</span>
          ) : item.shortcut ? (
            <span style={{ marginLeft: '24px', fontSize: '11px', color: '#888' }}>{item.shortcut}</span>
          ) : null}
        </div>
        {hasChildren && isSubmenuOpen && (
          <div
            style={{
              position: 'absolute',
              left: '100%',
              top: 0,
              backgroundColor: '#2d2d2d',
              border: '1px solid #555',
              borderLeft: 'none',
              boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.5)',
              minWidth: '150px',
              zIndex: 1000,
            }}
            onMouseEnter={() => {
              cancelPendingSubmenuClose();
              setOpenSubmenu(itemPath);
            }}
            onMouseLeave={() => scheduleSubmenuClose(itemPath)}
          >
            {(item.children ?? []).map((child, childIndex) => renderMenuItem(child, childIndex, itemPath))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '24px',
        backgroundColor: '#1e1e1e',
        borderBottom: '1px solid #555',
        display: 'flex',
        alignItems: 'center',
        zIndex: 100,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {items.map((item, index) => {
        const isOpen = openMenu === item.label;
        const hasChildren = item.children && item.children.length > 0;
        const handleTopClick = () => {
          if(item.disabled) return;
          if(hasChildren){
            handleMenuClick(item.label);
          }else if(item.onClick){
            item.onClick();
          }
        };
        return (
          <div
            key={index}
            style={{
              position: 'relative',
              height: '100%',
            }}
            onMouseEnter={() => cancelPendingSubmenuClose()}
            onMouseLeave={closeAllMenus}
          >
            <button
              onClick={handleTopClick}
              disabled={item.disabled}
              style={{
                height: '100%',
                padding: '0 12px',
                backgroundColor: isOpen ? '#2d2d2d' : 'transparent',
                border: 'none',
                color: item.disabled ? '#555' : '#ccc',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isOpen && !item.disabled) {
                  e.currentTarget.style.backgroundColor = '#2a2a2a';
                }
              }}
              onMouseLeave={(e) => {
                if (!isOpen) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {item.label}
            </button>
            {isOpen && hasChildren && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #555',
                  boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.5)',
                  minWidth: '150px',
                  zIndex: 1000,
                }}
              >
                {item.children!.map((child, childIndex) => renderMenuItem(child, childIndex, item.label))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

