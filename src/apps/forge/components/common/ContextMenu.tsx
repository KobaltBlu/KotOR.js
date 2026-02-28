import React, { useEffect, useRef, useState } from 'react';
import "@/apps/forge/components/common/ContextMenu.scss";

export interface ContextMenuItem {
  id: string;
  label?: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
  theme?: 'light' | 'dark' | 'auto';
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ 
  items, 
  onClose, 
  className = '', 
  style = {},
  theme = 'auto'
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [_hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Theme detection
  const getThemeClass = () => {
    if (theme === 'auto') {
      // Check if dark mode is preferred or if body has dark class
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const hasDarkClass = document.body.classList.contains('dark-theme') || 
                          document.documentElement.classList.contains('dark-theme');
      return hasDarkClass || prefersDark ? 'dark-theme' : 'light-theme';
    }
    return theme === 'dark' ? 'dark-theme' : 'light-theme';
  };

  // Show animation on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Calculate adjusted position to keep menu in viewport
  useEffect(() => {
    if (!menuRef.current) return;

    // Use requestAnimationFrame to ensure the element is rendered
    const adjustPosition = () => {
      const menu = menuRef.current;
      if (!menu) return;

      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Parse position values, handling both numbers and strings
      const parsePosition = (value: string | number | undefined): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };
      
      let adjustedX = parsePosition(style.left);
      let adjustedY = parsePosition(style.top);

      // Adjust horizontal position if menu would overflow right edge
      if (rect.right > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10; // 10px margin from edge
      }

      // Adjust vertical position if menu would overflow bottom edge
      if (rect.bottom > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10; // 10px margin from edge
      }

      // Ensure menu doesn't go off the left or top edges
      adjustedX = Math.max(10, adjustedX);
      adjustedY = Math.max(10, adjustedY);

      // Only update if position actually changed
      const originalX = parsePosition(style.left);
      const originalY = parsePosition(style.top);
      if (adjustedX !== originalX || adjustedY !== originalY) {
        setAdjustedPosition({ x: adjustedX, y: adjustedY });
      }
    };

    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(adjustPosition);
  }, [style.left, style.top]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose?.();
        setHoveredSubmenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
        setHoveredSubmenu(null);
      }
    };

    // Add event listeners after a short delay to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled && item.onClick) {
      item.onClick();
      onClose?.();
      setHoveredSubmenu(null);
    }
  };

  const defaultStyle: React.CSSProperties = {
    ...style,
    ...(adjustedPosition && {
      left: adjustedPosition.x,
      top: adjustedPosition.y
    })
  };

  const themeClass = getThemeClass();
  const animationClass = isVisible ? 'context-menu-enter-active' : 'context-menu-enter';

  return (
    <div 
      ref={menuRef}
      className={`context-menu ${themeClass} ${animationClass} ${className}`}
      style={defaultStyle}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return (
            <div 
              key={`separator-${index}`}
              className="context-menu-separator"
            />
          );
        }

        return (
          <div
            key={item.id}
            className={`context-menu-item ${item.disabled ? 'disabled' : ''} ${item.submenu ? 'has-submenu' : ''}`}
            onMouseEnter={() => {
              setHoveredItem(item.id);
              if (item.submenu && item.submenu.length > 0) {
                setHoveredSubmenu(item.id);
              }
            }}
            onMouseLeave={() => {
              setHoveredItem(null);
              // Don't clear submenu immediately to allow mouse movement
            }}
            onClick={() => {
              // Only handle click if no submenu
              if (!item.submenu || item.submenu.length === 0) {
                handleItemClick(item);
              }
            }}
            tabIndex={item.disabled ? -1 : 0}
          >
            <span>{item.label || ''}</span>
            {item.shortcut && (
              <span className="shortcut">
                {item.shortcut}
              </span>
            )}
            {item.submenu && item.submenu.length > 0 && (
              <span className="submenu-arrow">▶</span>
            )}
            {hoveredSubmenu === item.id && item.submenu && item.submenu.length > 0 && (
              <div 
                className="context-menu-submenu"
                onMouseEnter={() => setHoveredSubmenu(item.id)}
                onMouseLeave={() => setHoveredSubmenu(null)}
              >
                {item.submenu.map((subItem, subIndex) => {
                  if (subItem.separator) {
                    return (
                      <div 
                        key={`sub-separator-${subIndex}`}
                        className="context-menu-separator"
                      />
                    );
                  }
                  return (
                    <div
                      key={subItem.id}
                      className={`context-menu-item ${subItem.disabled ? 'disabled' : ''}`}
                      onMouseEnter={() => setHoveredItem(subItem.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => handleItemClick(subItem)}
                      tabIndex={subItem.disabled ? -1 : 0}
                    >
                      <span>{subItem.label || ''}</span>
                      {subItem.shortcut && (
                        <span className="shortcut">
                          {subItem.shortcut}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Hook for managing context menu state
export const useContextMenu = (theme: 'light' | 'dark' | 'auto' = 'auto') => {
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
  }>({
    visible: false,
    x: 0,
    y: 0,
    items: []
  })

  const showContextMenu = (x: number, y: number, items: ContextMenuItem[]) => {
    setContextMenu({
      visible: true,
      x,
      y,
      items
    });
  };

  const hideContextMenu = () => {
    setContextMenu(prev => ({
      ...prev,
      visible: false,
    }));
  };

  const ContextMenuComponent = (
    contextMenu.visible ? (
      <ContextMenu
        items={contextMenu.items}
        onClose={hideContextMenu}
        theme={theme}
        style={{
          top: contextMenu.y,
          left: contextMenu.x
        }}
      />
    ) : null
  );

  return {
    showContextMenu,
    hideContextMenu,
    ContextMenuComponent
  };
};
