import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useRef, useState } from "react";
import "@/apps/forge/styles/UI3DToolPalette.scss";

/**
 * Sub-tool definition for tools that have a submenu
 */
export interface SubTool {
  /** Unique identifier for the sub-tool */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon to display */
  icon?: IconDefinition;
  /** Optional icon color */
  iconColor?: string;
  /** Optional tooltip text */
  title?: string;
  /** Click handler */
  onClick: () => void;
  /** Whether the sub-tool is disabled */
  disabled?: boolean;
}

/**
 * Tool definition for the tool palette
 */
export interface Tool {
  /** Unique identifier for the tool */
  id: string;
  /** Display label (used for tooltip) */
  label: string;
  /** Icon to display */
  icon: IconDefinition;
  /** Icon color */
  iconColor?: string;
  /** Whether this tool is currently active/selected */
  active?: boolean;
  /** Click handler - called when tool is clicked directly (if no subTools) */
  onClick?: () => void;
  /** Optional sub-tools for this tool (creates a submenu) */
  subTools?: SubTool[];
  /** Optional tooltip text */
  title?: string;
  /** Whether the tool is disabled */
  disabled?: boolean;
}

/**
 * Props for the UI3DToolPalette component
 */
export interface UI3DToolPaletteProps {
  /** Array of tools to display */
  tools: Tool[];
  /** Optional active tool ID (for controlled component) */
  activeToolId?: string;
  /** Optional callback when active tool changes */
  onToolChange?: (toolId: string) => void;
  /** Optional custom className */
  className?: string;
  /** Optional custom style */
  style?: React.CSSProperties;
}

/**
 * UI3DToolPalette - A sophisticated tool palette component with support for tools and sub-tools
 */
export const UI3DToolPalette: React.FC<UI3DToolPaletteProps> = ({
  tools,
  activeToolId,
  onToolChange,
  className = '',
  style = {}
}) => {
  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);
  const submenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const toolRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  // Close submenu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openSubmenuId === null) return;

      const submenuElement = submenuRefs.current.get(openSubmenuId);
      const toolElement = toolRefs.current.get(openSubmenuId);

      if (
        submenuElement &&
        !submenuElement.contains(event.target as Node) &&
        toolElement &&
        !toolElement.contains(event.target as Node)
      ) {
        setOpenSubmenuId(null);
      }
    };

    if (openSubmenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openSubmenuId]);

  const handleToolClick = (tool: Tool, e: React.MouseEvent) => {
    e.stopPropagation();

    if (tool.disabled) return;

    // If tool has sub-tools, toggle submenu
    if (tool.subTools && tool.subTools.length > 0) {
      setOpenSubmenuId(openSubmenuId === tool.id ? null : tool.id);
    } else if (tool.onClick) {
      // If no sub-tools, call onClick directly
      tool.onClick();
      if (onToolChange) {
        onToolChange(tool.id);
      }
    }
  };

  const handleSubToolClick = (tool: Tool, subTool: SubTool, e: React.MouseEvent) => {
    e.stopPropagation();

    if (subTool.disabled) return;

    subTool.onClick();
    setOpenSubmenuId(null);

    // Also trigger tool change if callback provided
    if (onToolChange) {
      onToolChange(tool.id);
    }
  };

  const isToolActive = (tool: Tool): boolean => {
    if (activeToolId !== undefined) {
      return activeToolId === tool.id;
    }
    return tool.active || false;
  };

  return (
    <div className={`UI3DToolPalette ${className}`} style={{ marginTop: '25px', ...style }}>
      <ul>
        {tools.map((tool) => {
          const hasSubTools = tool.subTools && tool.subTools.length > 0;
          const isActive = isToolActive(tool);
          const isSubmenuOpen = openSubmenuId === tool.id;

          return (
            <li
              key={tool.id}
              ref={(el) => {
                if (el) toolRefs.current.set(tool.id, el);
                else toolRefs.current.delete(tool.id);
              }}
              className={`
                ${isActive ? 'selected' : ''}
                ${hasSubTools ? 'tool-palette-item-with-submenu' : ''}
                ${isSubmenuOpen ? 'submenu-open' : ''}
                ${tool.disabled ? 'disabled' : ''}
              `.trim().replace(/\s+/g, ' ')}
              onClick={(e) => handleToolClick(tool, e)}
            >
              <a title={tool.title || tool.label}>
                <span className="fa-layers fa-fw">
                  <FontAwesomeIcon
                    icon={tool.icon}
                    size='lg'
                    color={tool.iconColor || 'white'}
                  />
                </span>
              </a>
              {hasSubTools && isSubmenuOpen && (
                <div
                  ref={(el) => {
                    if (el) submenuRefs.current.set(tool.id, el);
                    else submenuRefs.current.delete(tool.id);
                  }}
                  className="tool-palette-submenu"
                >
                  {tool.subTools!.map((subTool) => (
                    <div
                      key={subTool.id}
                      className={`tool-palette-submenu-item ${subTool.disabled ? 'disabled' : ''}`}
                      onClick={(e) => handleSubToolClick(tool, subTool, e)}
                    >
                      {subTool.icon && (
                        <span className="tool-palette-submenu-icon">
                          <FontAwesomeIcon
                            icon={subTool.icon}
                            size="sm"
                            color={subTool.iconColor || '#fff'}
                          />
                        </span>
                      )}
                      <span>{subTool.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
