import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEffectOnce } from "../helpers/UseEffectOnce";
import { CameraView, UI3DRenderer } from "../UI3DRenderer";

export interface UI3DRendererViewProps {
  context: UI3DRenderer;
  children?: any;
  onMouseWheel?: Function;
  menuItems?: MenuItem[];
  showMenuBar?: boolean;
}

export interface MenuItem {
  label?: string;
  onClick?: () => void;
  children?: MenuItem[];
  disabled?: boolean;
  separator?: boolean;
}

interface MenuBarProps {
  items: MenuItem[];
}

const MenuBar: React.FC<MenuBarProps> = ({ items }) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMenuClick = useCallback((label: string) => {
    setOpenMenu(openMenu === label ? null : label);
    setOpenSubmenu(null);
  }, [openMenu]);

  const handleSubmenuClick = useCallback((label: string) => {
    setOpenSubmenu(openSubmenu === label ? null : label);
  }, [openSubmenu]);

  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.children) {
      return; // Don't close menu if it has children
    }
    if (item.onClick) {
      item.onClick();
    }
    setOpenMenu(null);
    setOpenSubmenu(null);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
        setOpenSubmenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
            setOpenSubmenu(itemPath);
          }
        }}
        onMouseLeave={() => {
          if (hasChildren) {
            // Delay closing to allow moving to submenu
            setTimeout(() => {
              if (openSubmenu === itemPath) {
                setOpenSubmenu(null);
              }
            }, 100);
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
          <span>{item.label}</span>
          {hasChildren && (
            <span style={{ marginLeft: '20px', fontSize: '10px' }}>▶</span>
          )}
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
            onMouseEnter={() => setOpenSubmenu(itemPath)}
            onMouseLeave={() => setOpenSubmenu(null)}
          >
            {item.children!.map((child, childIndex) => renderMenuItem(child, childIndex, itemPath))}
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
        return (
          <div
            key={index}
            style={{
              position: 'relative',
              height: '100%',
            }}
          >
            <button
              onClick={() => handleMenuClick(item.label)}
              style={{
                height: '100%',
                padding: '0 12px',
                backgroundColor: isOpen ? '#2d2d2d' : 'transparent',
                border: 'none',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isOpen) {
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
            {isOpen && item.children && (
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
                onMouseLeave={() => {
                  setOpenMenu(null);
                  setOpenSubmenu(null);
                }}
              >
                {item.children.map((child, childIndex) => renderMenuItem(child, childIndex, item.label))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const UI3DRendererView = function(props: UI3DRendererViewProps){
  const canvasRef: React.RefObject<HTMLCanvasElement> = useRef<HTMLCanvasElement>() as any;
  const context = props.context;

  useEffectOnce(() => {
    if(!(props.context instanceof UI3DRenderer)){
      props.context = new UI3DRenderer(canvasRef.current as any);
    }
    return () => {
      if(props.context){
        // props.context.destroy();
      }
    }
  });

  useEffect( () => {
    props.context.setCanvas(canvasRef.current as any);
    if(canvasRef.current){
      canvasRef.current.dataset.uuid = crypto.randomUUID();
    }
  }, [canvasRef.current]);

  // Default menu items if none provided
  const defaultMenuItems: MenuItem[] = [
    {
      label: 'View',
      children: [
        {
          label: 'Camera',
          children: [
            { label: 'Fit Camera to Scene', onClick: () => context.fitCameraToScene() },
            { separator: true },
            { label: 'Top View', onClick: () => context.reorientCamera(CameraView.Top) },
            { label: 'Bottom View', onClick: () => context.reorientCamera(CameraView.Bottom) },
            { label: 'Left View', onClick: () => context.reorientCamera(CameraView.Left) },
            { label: 'Right View', onClick: () => context.reorientCamera(CameraView.Right) },
            { label: 'Front View', onClick: () => context.reorientCamera(CameraView.Front) },
            { label: 'Back View', onClick: () => context.reorientCamera(CameraView.Back) },
            { label: 'Isometric View', onClick: () => context.reorientCamera(CameraView.Orthogonal) },
            { label: 'Default View', onClick: () => context.reorientCamera(CameraView.Default) },
          ],
        },
      ],
    }
  ];

  const menuItems = props.menuItems || defaultMenuItems;

  return (
    <div className="UI3DRendererView-container" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,}}>
      {props.showMenuBar && <MenuBar items={menuItems} />}
      <canvas 
        ref={canvasRef} 
        className="UI3DRendererView-canvas" 
        tabIndex={1} 
        style={{ 
          position: 'absolute',
          top: props.showMenuBar ? '24px' : 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: 'calc(100% - ' + (props.showMenuBar ? '24px' : '0') + ')',
        }} 
      />
      {props.children}
    </div>
  );

}
