import React, { useState, useCallback, memo } from "react";
import "@/apps/forge/components/treeview/ForgeTreeView.scss";

export interface ListItemNodeProps {
  // Core node data
  id: string;
  name: string;
  hasChildren?: boolean;
  isExpanded?: boolean;
  isSelected?: boolean;
  isFocused?: boolean;
  isLoading?: boolean;
  hasContextMenu?: boolean;
  depth?: number;
  
  // Visual properties
  icon?: string;
  iconType?: 'folder' | 'file' | 'expanded';
  fileType?: string;
  
  // Event handlers
  onToggle?: () => void;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  onSelect?: (nodeId: string) => void;
  
  // Data attributes for external use
  dataAttributes?: Record<string, any>;
  
  // Children
  children?: React.ReactNode;
}

export const ListItemNode = memo(function ListItemNode(props: ListItemNodeProps) {
  const {
    id,
    name,
    hasChildren = false,
    isExpanded = false,
    isSelected = false,
    isFocused = false,
    isLoading = false,
    hasContextMenu = false,
    depth = 0,
    icon,
    iconType = 'file',
    fileType,
    onToggle,
    onClick,
    onDoubleClick,
    onContextMenu,
    onSelect,
    dataAttributes = {},
    children
  } = props;

  const [isHovered, setIsHovered] = useState(false);

  // Get file extension for icon styling
  const getFileExtension = (name: string): string => {
    if (!name) return '';
    const parts = name.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  // Get file type class for styling
  const getFileTypeClass = (name: string): string => {
    if (!name) return 'file';
    const ext = getFileExtension(name);
    if (ext) {
      return `file-${ext}`;
    }
    return 'file';
  };

  // Get icon for the node
  const getIcon = (): string => {
    if (icon) {
      return icon;
    }

    if (iconType === 'folder') {
      return isExpanded ? 'fa-folder-open' : 'fa-folder';
    }

    if (!name) return 'fa-file';
    const ext = getFileExtension(name);
    switch (ext) {
      case 'ts': return 'fa-file-code';
      case 'tsx': return 'fa-file-code';
      case 'js': return 'fa-file-code';
      case 'jsx': return 'fa-file-code';
      case 'css': return 'fa-file-code';
      case 'scss': return 'fa-file-code';
      case 'html': return 'fa-file-code';
      case 'json': return 'fa-file-code';
      case 'md': return 'fa-file-lines';
      case 'png': return 'fa-file-image';
      case 'jpg': return 'fa-file-image';
      case 'jpeg': return 'fa-file-image';
      case 'gif': return 'fa-file-image';
      case 'svg': return 'fa-file-image';
      case 'ico': return 'fa-file-image';
      case 'wav': return 'fa-file-audio';
      case 'mp3': return 'fa-file-audio';
      case 'ogg': return 'fa-file-audio';
      case 'nss': return 'fa-file-code';
      case 'ncs': return 'fa-file-code';
      case 'dlg': return 'fa-file-code';
      case 'utc': return 'fa-file-code';
      case 'utd': return 'fa-file-code';
      case 'ute': return 'fa-file-code';
      case 'uti': return 'fa-file-code';
      case 'utm': return 'fa-file-code';
      case 'utp': return 'fa-file-code';
      case 'uts': return 'fa-file-code';
      case 'utt': return 'fa-file-code';
      case 'utw': return 'fa-file-code';
      case 'bic': return 'fa-file-code';
      case 'bik': return 'fa-file-video';
      case 'tga': return 'fa-file-image';
      case 'dds': return 'fa-file-image';
      case 'tpc': return 'fa-file-image';
      case 'erf': return 'fa-file-archive';
      case 'rim': return 'fa-file-archive';
      case 'mod': return 'fa-file-archive';
      case 'hak': return 'fa-file-archive';
      case 'nwm': return 'fa-file-archive';
      default: return 'fa-file';
    }
  };

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren && onToggle) {
      onToggle();
    }
  }, [hasChildren, onToggle]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
    // if (onSelect) {
    //   onSelect(id);
    // }
  }, [id, onClick, onSelect]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDoubleClick) {
      onDoubleClick();
    }
  }, [onDoubleClick]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(e);
    }
  }, [onContextMenu]);

  const fileTypeClass = getFileTypeClass(name);
  const iconClass = getIcon();

  return (
    <li
      className={`tree-item ${fileTypeClass} ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      {...dataAttributes}
    >
      {/* Node content wrapper - arrow, icon, and label */}
      <div
        className="tree-node-content"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        tabIndex={0}
      >
        {/* Expand/Collapse Arrow for folders */}
        {hasChildren && (
          <span
            className={`tree-arrow ${isExpanded ? 'expanded' : ''}`}
            onClick={handleToggle}
            role="button"
            tabIndex={-1}
            title={isExpanded ? 'Collapse' : 'Expand'}
          />
        )}
        
        {/* Icon */}
        <span className={`tree-icon ${iconType}`}>
          <i className={`fa-solid ${iconClass}`} />
        </span>
        
        {/* Label */}
        <span className="tree-label" title={name}>
          {name}
        </span>
      </div>
      
      {/* Children - flows to next line */}
      {hasChildren && children && (
        <ul className={`tree-children ${isExpanded ? 'expanded' : ''}`}>
          {children}
        </ul>
      )}
    </li>
  );
});
