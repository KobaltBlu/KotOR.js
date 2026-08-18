/**
 * Settings dialog: category sidebar, search, instant-apply panes.
 *
 * @file ModalSettings.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { KeyboardEvent, useMemo, useState } from "react";
import { ForgeButton, ForgeDialog, ForgeInput } from "@/apps/forge/components/ui";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ModalSettingsState } from "@/apps/forge/components/modal/ModalSettingsState";
import {
  SettingsSearchContext,
  SETTINGS_PAGE_GROUPS,
  getSettingsPageGroup,
  getSettingsPages,
  pageMatchesQuery,
} from "@/apps/forge/settings/settingsRegistry";
import "@/apps/forge/settings/registerForgeSettingsPages";

export function ModalSettings() {
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("general");

  const handleClose = () => {
    setShow(false);
    setQuery("");
  };
  const handleShow = (pageId?: string) => {
    if (typeof pageId === "string" && pageId) {
      setActiveId(pageId);
    }
    setShow(true);
  };

  useEffectOnce(() => {
    ModalSettingsState.AddEventListener("onShow", handleShow);
    ModalSettingsState.AddEventListener("onHide", handleClose);
    return () => {
      ModalSettingsState.RemoveEventListener("onShow", handleShow);
      ModalSettingsState.RemoveEventListener("onHide", handleClose);
    };
  });

  const pages = getSettingsPages();
  const visiblePages = useMemo(
    () => pages.filter((page) => pageMatchesQuery(page, query)),
    [pages, query],
  );

  const selected = visiblePages.find((page) => page.id === activeId) || visiblePages[0];

  const onCategoryKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!visiblePages.length) return;
    const currentIndex = Math.max(0, visiblePages.findIndex((page) => page.id === selected?.id));
    let nextIndex = currentIndex;
    if (e.key === "ArrowDown") {
      nextIndex = Math.min(visiblePages.length - 1, currentIndex + 1);
    } else if (e.key === "ArrowUp") {
      nextIndex = Math.max(0, currentIndex - 1);
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = visiblePages.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    setActiveId(visiblePages[nextIndex].id);
  };

  return (
    <ForgeDialog
      show={show}
      onHide={handleClose}
      size="xl"
      className="forge-settings-dialog"
      keyboard={true}
    >
      <ForgeDialog.Header closeButton>
        <div className="forge-settings__headline">
          <ForgeDialog.Title>Settings</ForgeDialog.Title>
          <ForgeInput
            type="search"
            placeholder="Search settings"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search settings"
            className="forge-settings__search"
          />
        </div>
      </ForgeDialog.Header>
      <ForgeDialog.Body className="forge-settings__body">
        <SettingsSearchContext.Provider value={query}>
          <div
            className="forge-settings__nav"
            role="tablist"
            aria-label="Settings categories"
            tabIndex={0}
            onKeyDown={onCategoryKeyDown}
          >
            {SETTINGS_PAGE_GROUPS.map((group) => {
              const groupPages = visiblePages.filter((page) => getSettingsPageGroup(page) === group.id);
              if (!groupPages.length) {
                return null;
              }
              return (
                <div key={group.id} className="forge-settings__nav-group">
                  <div className="forge-settings__nav-group-label">{group.label}</div>
                  {groupPages.map((page) => {
                    const selectedPage = selected?.id === page.id;
                    return (
                      <button
                        key={page.id}
                        type="button"
                        role="tab"
                        aria-selected={selectedPage}
                        className={`forge-settings__nav-item${selectedPage ? " is-active" : ""}`}
                        onClick={() => setActiveId(page.id)}
                      >
                        <span className={page.icon} aria-hidden="true" />
                        <span>{page.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="forge-settings__pane" role="tabpanel">
            {selected ? selected.render() : (
              <p className="forge-settings-page__empty">No settings match this search.</p>
            )}
          </div>
        </SettingsSearchContext.Provider>
      </ForgeDialog.Body>
      <ForgeDialog.Footer>
        <ForgeButton onClick={handleClose}>Close</ForgeButton>
      </ForgeDialog.Footer>
    </ForgeDialog>
  );
}
