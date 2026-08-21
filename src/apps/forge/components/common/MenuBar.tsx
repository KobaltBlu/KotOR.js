import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { ForgeMenuItem } from "@/apps/forge/components/common/forgeMenuItem";

export type { ForgeMenuItem } from "@/apps/forge/components/common/forgeMenuItem";

/** @deprecated Use ForgeMenuItem */
export type MenuItem = ForgeMenuItem;

interface MenuBarProps {
  items: ForgeMenuItem[];
  variant?: "flow" | "overlay";
  className?: string;
}

interface FlyoutPlacement {
  top: number;
  left: number;
  maxHeight: number;
}

const SUBMENU_CLOSE_DELAY_MS = 220;
const MENU_EDGE_PAD_PX = 4;
const MENU_MIN_HEIGHT_PX = 96;

function isSelectable(item: ForgeMenuItem | undefined): boolean {
  if (!item) {
    return false;
  }
  if (item.separator || item.header || item.disabled) {
    return false;
  }
  return true;
}

function isPathOpen(openSubmenu: string | null, itemPath: string): boolean {
  if (!openSubmenu) {
    return false;
  }
  return openSubmenu === itemPath || openSubmenu.startsWith(`${itemPath}-`);
}

/** Bottom edge of the nearest height-clipped ancestor (tab pane) or the viewport. */
function resolveMenuClipBottom(from: HTMLElement): number {
  let clipBottom = window.innerHeight;
  let el: HTMLElement | null = from.parentElement;
  while (el && el !== document.documentElement) {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    const clips =
      overflowY === "hidden" ||
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflowY === "clip" ||
      el.classList.contains("tab-pane") ||
      el.classList.contains("tab-pane-content");
    if (clips) {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) {
        clipBottom = Math.min(clipBottom, rect.bottom);
      }
    }
    el = el.parentElement;
  }
  return clipBottom;
}

function clearMenuMaxHeights(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(".forge-menu__scroller").forEach((scroller) => {
    scroller.style.removeProperty("max-height");
  });
}

function applyMenuMaxHeights(root: HTMLElement) {
  const clipBottom = resolveMenuClipBottom(root);
  root.querySelectorAll<HTMLElement>(".forge-menu").forEach((menu) => {
    const scroller = menu.querySelector<HTMLElement>(":scope > .forge-menu__scroller");
    if (!scroller) {
      return;
    }
    const top = menu.getBoundingClientRect().top;
    const available = Math.floor(clipBottom - top - MENU_EDGE_PAD_PX);
    scroller.style.maxHeight = `${Math.max(MENU_MIN_HEIGHT_PX, available)}px`;
  });
}

function measureFlyoutPlacement(
  trigger: HTMLElement,
  clipFrom: HTMLElement,
): FlyoutPlacement {
  const rect = trigger.getBoundingClientRect();
  const clipBottom = resolveMenuClipBottom(clipFrom);
  const clipRight = window.innerWidth;
  const maxHeight = Math.max(MENU_MIN_HEIGHT_PX, Math.floor(clipBottom - rect.top - MENU_EDGE_PAD_PX));
  let left = Math.floor(rect.right - 1);
  // Prefer opening to the right; flip if it would leave the viewport.
  if (left + 180 > clipRight - MENU_EDGE_PAD_PX) {
    left = Math.max(MENU_EDGE_PAD_PX, Math.floor(rect.left - 180 + 1));
  }
  return {
    top: Math.floor(rect.top),
    left,
    maxHeight,
  };
}

export const MenuBar: React.FC<MenuBarProps> = ({ items, variant = "overlay", className = "" }) => {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [flyoutPlacements, setFlyoutPlacements] = useState<Record<string, FlyoutPlacement>>({});
  const menuRef = useRef<HTMLDivElement>(null);
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
        setOpenSubmenu((prev) => (prev === path || prev?.startsWith(`${path}-`) ? null : prev));
      }, SUBMENU_CLOSE_DELAY_MS);
    },
    [cancelPendingSubmenuClose],
  );

  const closeAllMenus = useCallback(() => {
    cancelPendingSubmenuClose();
    setOpenMenu(null);
    setOpenSubmenu(null);
    setActivePath(null);
    setFlyoutPlacements({});
  }, [cancelPendingSubmenuClose]);

  useEffect(() => {
    return () => cancelPendingSubmenuClose();
  }, [cancelPendingSubmenuClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeAllMenus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeAllMenus]);

  const syncFlyoutPlacements = useCallback(() => {
    const root = menuRef.current;
    if (!root || openSubmenu === null) {
      setFlyoutPlacements({});
      return;
    }

    const next: Record<string, FlyoutPlacement> = {};
    const parts = openSubmenu.split("-");
    // Rebuild every ancestor path: "0-3-1" → "0-3", "0-3-1"
    for (let depth = 2; depth <= parts.length; depth++) {
      const path = parts.slice(0, depth).join("-");
      const trigger = root.querySelector<HTMLElement>(`[data-menu-path="${path}"]`);
      if (trigger) {
        next[path] = measureFlyoutPlacement(trigger, root);
      }
    }
    setFlyoutPlacements((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length === nextKeys.length) {
        let same = true;
        for (const key of nextKeys) {
          const a = prev[key];
          const b = next[key];
          if (!a || !b || a.top !== b.top || a.left !== b.left || a.maxHeight !== b.maxHeight) {
            same = false;
            break;
          }
        }
        if (same) {
          return prev;
        }
      }
      return next;
    });
  }, [openSubmenu]);

  useLayoutEffect(() => {
    const root = menuRef.current;
    if (!root) {
      return;
    }
    if (openMenu === null) {
      clearMenuMaxHeights(root);
      setFlyoutPlacements({});
      return;
    }

    applyMenuMaxHeights(root);
    syncFlyoutPlacements();
    // Parent flyouts must mount before nested triggers exist; remeasure next frame.
    const raf = window.requestAnimationFrame(() => {
      applyMenuMaxHeights(root);
      syncFlyoutPlacements();
    });

    const onResize = () => {
      applyMenuMaxHeights(root);
      syncFlyoutPlacements();
    };
    window.addEventListener("resize", onResize);

    const scrollers = Array.from(root.querySelectorAll<HTMLElement>(".forge-menu__scroller"));
    for (const scroller of scrollers) {
      scroller.addEventListener("scroll", syncFlyoutPlacements, { passive: true });
    }

    const clipParent = root.parentElement;
    let ro: ResizeObserver | undefined;
    if (clipParent && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onResize);
      ro.observe(clipParent);
      let ancestor: HTMLElement | null = clipParent.parentElement;
      while (ancestor && ancestor !== document.body) {
        const style = window.getComputedStyle(ancestor);
        if (
          style.overflowY === "hidden" ||
          style.overflowY === "auto" ||
          style.overflowY === "scroll" ||
          ancestor.classList.contains("tab-pane")
        ) {
          ro.observe(ancestor);
          break;
        }
        ancestor = ancestor.parentElement;
      }
    }

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      for (const scroller of scrollers) {
        scroller.removeEventListener("scroll", syncFlyoutPlacements);
      }
      ro?.disconnect();
    };
  }, [openMenu, openSubmenu, items, syncFlyoutPlacements]);

  const selectableTopIndexes = items
    .map((item, index) => (item.disabled || (!item.children?.length && !item.onClick) ? -1 : index))
    .filter((index) => index >= 0);

  const activateLeaf = useCallback(
    (item: ForgeMenuItem) => {
      if (item.disabled || item.separator || item.header) {
        return;
      }
      if (item.children?.length) {
        return;
      }
      if (item.onClick) {
        item.onClick();
      }
      closeAllMenus();
    },
    [closeAllMenus],
  );

  const openTopByOffset = useCallback(
    (delta: number) => {
      if (!selectableTopIndexes.length) {
        return;
      }
      const current = openMenu ?? selectableTopIndexes[0];
      const pos = selectableTopIndexes.indexOf(current);
      const nextPos = (pos + delta + selectableTopIndexes.length) % selectableTopIndexes.length;
      const next = selectableTopIndexes[nextPos];
      setOpenMenu(next);
      setOpenSubmenu(null);
      const children = items[next]?.children || [];
      const first = children.findIndex(isSelectable);
      setActivePath(first >= 0 ? `${next}-${first}` : `${next}`);
    },
    [items, openMenu, selectableTopIndexes],
  );

  useEffect(() => {
    if (openMenu === null) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAllMenus();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        openTopByOffset(1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        openTopByOffset(-1);
        return;
      }
      const top = items[openMenu];
      const children = top?.children || [];
      const selectable = children
        .map((child, index) => (isSelectable(child) ? index : -1))
        .filter((index) => index >= 0);
      if (!selectable.length) {
        return;
      }
      const currentChild = activePath?.startsWith(`${openMenu}-`)
        ? parseInt(activePath.slice(String(openMenu).length + 1), 10)
        : selectable[0];
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const pos = selectable.indexOf(currentChild);
        const next = selectable[(pos + 1) % selectable.length];
        setActivePath(`${openMenu}-${next}`);
        const child = children[next];
        if (child?.children?.length) {
          setOpenSubmenu(`${openMenu}-${next}`);
        }
        requestAnimationFrame(() => {
          menuRef.current
            ?.querySelector(`.forge-menu__item.is-open`)
            ?.scrollIntoView({ block: "nearest" });
        });
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        const pos = selectable.indexOf(currentChild);
        const next = selectable[(pos - 1 + selectable.length) % selectable.length];
        setActivePath(`${openMenu}-${next}`);
        requestAnimationFrame(() => {
          menuRef.current
            ?.querySelector(`.forge-menu__item.is-open`)
            ?.scrollIntoView({ block: "nearest" });
        });
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const child = Number.isFinite(currentChild) ? children[currentChild] : undefined;
        if (child?.children?.length) {
          setOpenSubmenu(`${openMenu}-${currentChild}`);
          return;
        }
        if (child) {
          activateLeaf(child);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openMenu, activePath, items, closeAllMenus, openTopByOffset, activateLeaf]);

  const renderMenuItemRow = (item: ForgeMenuItem, index: number, parentPath: string) => {
    const itemPath = `${parentPath}-${index}`;
    const hasChildren = !!(item.children && item.children.length > 0);
    const submenuOpen = isPathOpen(openSubmenu, itemPath);
    const isActive = activePath === itemPath;

    if (item.separator) {
      return <div key={itemPath} className="forge-menu__separator" role="separator" />;
    }

    if (item.header) {
      return (
        <div key={itemPath} className="forge-menu__header">
          {item.label}
        </div>
      );
    }

    const mark = item.radio
      ? (item.checked ? <span className="forge-menu__check" aria-hidden="true">●</span> : null)
      : (item.checked ? <span className="forge-menu__check" aria-hidden="true">✓</span> : null);

    return (
      <div
        key={itemPath}
        data-menu-path={itemPath}
        onMouseEnter={() => {
          setActivePath(itemPath);
          if (hasChildren) {
            cancelPendingSubmenuClose();
            setOpenSubmenu(itemPath);
          } else {
            cancelPendingSubmenuClose();
            setOpenSubmenu(parentPath.includes("-") ? parentPath : null);
          }
        }}
        onMouseLeave={() => {
          if (hasChildren) {
            scheduleSubmenuClose(itemPath);
          }
        }}
      >
        <div
          className={`forge-menu__item ${item.disabled ? "is-disabled" : ""} ${submenuOpen || isActive ? "is-open" : ""}`}
          role="menuitem"
          aria-disabled={item.disabled || undefined}
          aria-haspopup={hasChildren || undefined}
          aria-expanded={hasChildren ? submenuOpen : undefined}
          aria-checked={item.checked === undefined ? undefined : item.checked}
          onClick={() => {
            if (item.disabled) {
              return;
            }
            if (hasChildren) {
              setOpenSubmenu(itemPath);
              return;
            }
            activateLeaf(item);
          }}
        >
          {mark}
          <span className="forge-menu__label">{item.label}</span>
          {item.detail ? <span className="forge-menu__detail">{item.detail}</span> : null}
          {hasChildren ? (
            <span className="forge-menu__arrow">▶</span>
          ) : item.shortcut ? (
            <span className="forge-menu__shortcut">{item.shortcut}</span>
          ) : null}
        </div>
      </div>
    );
  };

  const renderMenuPanel = (
    panelItems: ForgeMenuItem[],
    parentPath: string,
    panelClassName = "",
    placement?: FlyoutPlacement,
  ) => {
    const openChild = panelItems.findIndex((_, childIndex) => {
      const childPath = `${parentPath}-${childIndex}`;
      return isPathOpen(openSubmenu, childPath);
    });
    const openChildItem = openChild >= 0 ? panelItems[openChild] : undefined;
    const openChildPath = openChild >= 0 ? `${parentPath}-${openChild}` : null;
    const childPlacement = openChildPath ? flyoutPlacements[openChildPath] : undefined;

    return (
      <div
        className={`forge-menu ${panelClassName}`.trim()}
        role="menu"
        style={
          placement
            ? {
                position: "fixed",
                top: placement.top,
                left: placement.left,
                maxHeight: undefined,
              }
            : undefined
        }
        onMouseEnter={() => {
          if (parentPath.includes("-")) {
            cancelPendingSubmenuClose();
            setOpenSubmenu(parentPath);
          }
        }}
        onMouseLeave={() => {
          if (parentPath.includes("-")) {
            scheduleSubmenuClose(parentPath);
          }
        }}
      >
        <div
          className="forge-menu__scroller"
          style={placement ? { maxHeight: placement.maxHeight } : undefined}
        >
          {panelItems.map((child, childIndex) => renderMenuItemRow(child, childIndex, parentPath))}
        </div>
        {openChildItem?.children?.length && openChildPath && childPlacement
          ? renderMenuPanel(
            openChildItem.children,
            openChildPath,
            "forge-menu--flyout",
            childPlacement,
          )
          : null}
      </div>
    );
  };

  const variantClass = variant === "overlay" ? "forge-overlay-menubar" : "";

  return (
    <div
      ref={menuRef}
      className={`forge-menubar ${variantClass} ${className}`.trim()}
      role="menubar"
    >
      {items.map((item, index) => {
        const isOpen = openMenu === index;
        const hasChildren = !!(item.children && item.children.length > 0);
        const handleTopClick = () => {
          if (item.disabled) {
            return;
          }
          if (hasChildren) {
            setOpenMenu((prev) => (prev === index ? null : index));
            setOpenSubmenu(null);
            cancelPendingSubmenuClose();
            const first = (item.children || []).findIndex(isSelectable);
            setActivePath(first >= 0 ? `${index}-${first}` : `${index}`);
          } else if (item.onClick) {
            item.onClick();
            closeAllMenus();
          }
        };
        return (
          <div
            key={item.id || `${item.label || "item"}-${index}`}
            className="forge-menubar__item"
            onMouseEnter={() => {
              cancelPendingSubmenuClose();
              if (openMenu !== null && !item.disabled && hasChildren) {
                setOpenMenu(index);
                setOpenSubmenu(null);
                const first = (item.children || []).findIndex(isSelectable);
                setActivePath(first >= 0 ? `${index}-${first}` : `${index}`);
              }
            }}
          >
            <button
              type="button"
              onClick={handleTopClick}
              disabled={item.disabled}
              aria-haspopup={hasChildren || undefined}
              aria-expanded={hasChildren ? isOpen : undefined}
              className={`forge-menubar__label ${isOpen ? "is-open" : ""}`}
            >
              {item.label}
            </button>
            {isOpen && hasChildren
              ? renderMenuPanel(item.children!, String(index))
              : null}
          </div>
        );
      })}
    </div>
  );
};
