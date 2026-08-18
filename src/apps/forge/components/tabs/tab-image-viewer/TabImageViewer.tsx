/**
 * Layered image editor chrome: tools, canvas, layers / encode / TXI.
 *
 * @file TabImageViewer.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useCallback, useEffect, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { MenuBar, type MenuItem } from "@/apps/forge/components/common/MenuBar";
import { executeCommand, isCommandEnabled } from "@/apps/forge/commands/forgeCommands";
import { formatKeybinding } from "@/apps/forge/commands/forgeKeybindings";
import { IMAGE_TOOLS, type ImageToolId } from "@/apps/forge/image";
import { TabImageViewerState } from "@/apps/forge/states/tabs/TabImageViewerState";
import { ImageToolRail } from "@/apps/forge/components/tabs/tab-image-viewer/ImageToolRail";
import { ImageToolOptions } from "@/apps/forge/components/tabs/tab-image-viewer/ImageToolOptions";
import { ImageCanvas } from "@/apps/forge/components/tabs/tab-image-viewer/ImageCanvas";
import { ImageEastDock } from "@/apps/forge/components/tabs/tab-image-viewer/ImageEastDock";
import { ImageStatusBar } from "@/apps/forge/components/tabs/tab-image-viewer/ImageStatusBar";

import "@/apps/forge/components/tabs/tab-image-viewer/TabImageViewer.scss";

function promptSize(label: string, width: number, height: number): { width: number; height: number } | undefined {
  const next = window.prompt(label, `${width}x${height}`);
  if (!next) return undefined;
  const match = /^(\d+)\s*[x×,]\s*(\d+)$/i.exec(next.trim());
  if (!match) return undefined;
  return { width: Number(match[1]), height: Number(match[2]) };
}

export const TabImageViewer = function (props: BaseTabProps) {
  const tab = props.tab as TabImageViewerState;
  const [version, setVersion] = useState(0);
  const [txiPreview, setTxiPreview] = useState(tab.document.txiText);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffectOnce(() => {
    tab.addEventListener("onEditorFileLoad", bump);
    tab.addEventListener("onEditorFileChange", bump);
    tab.addEventListener("onUndoApplied", bump);
    tab.addEventListener("onRedoApplied", bump);
    return () => {
      tab.removeEventListener("onEditorFileLoad", bump);
      tab.removeEventListener("onEditorFileChange", bump);
      tab.removeEventListener("onUndoApplied", bump);
      tab.removeEventListener("onRedoApplied", bump);
    };
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setTxiPreview(tab.document.txiText), 250);
    return () => window.clearTimeout(timer);
  }, [tab.document.txiText, version]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable || target.closest(".monaco-editor"))) {
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          tab.deselect();
        }
        if (e.key.toLowerCase() === "a") {
          e.preventDefault();
          tab.selectAll();
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        tab.deleteSelection();
        return;
      }
      const map: Record<string, ImageToolId> = {
        v: "move",
        m: "marquee",
        c: "crop",
        b: "brush",
        e: "eraser",
        g: "fill",
        i: "eyedropper",
      };
      const tool = map[e.key.toLowerCase()];
      if (tool && IMAGE_TOOLS.some((item) => item.id === tool)) {
        tab.setTool(tool);
      }
    };
    tab.addEventListener("onKeyDown", onKey);
    return () => tab.removeEventListener("onKeyDown", onKey);
  }, [tab]);

  void version;

  const menuItems: MenuItem[] = [
    {
      label: "File",
      children: [
        { label: "Save", shortcut: formatKeybinding("Mod+S"), onClick: () => { void executeCommand("forge.file.save"); }, disabled: !isCommandEnabled("forge.file.save") },
        { label: "Save As...", shortcut: formatKeybinding("Mod+Shift+S"), onClick: () => { void executeCommand("forge.file.saveAs"); }, disabled: !isCommandEnabled("forge.file.saveAs") },
        { separator: true },
        { label: "Export TGA", onClick: () => { void tab.exportAs("tga"); } },
        { label: "Export PNG", onClick: () => { void tab.exportAs("png"); } },
        { label: "Export JPG", onClick: () => { void tab.exportAs("jpg"); } },
        { label: "Export TPC", onClick: () => { void tab.exportAs("tpc"); } },
        { label: "Export PSD", onClick: () => { void tab.exportAs("psd"); } },
      ],
    },
    {
      label: "Edit",
      children: [
        { label: "Undo", shortcut: formatKeybinding("Mod+Z"), onClick: () => { void executeCommand("forge.edit.undo"); }, disabled: !isCommandEnabled("forge.edit.undo") },
        { label: "Redo", shortcut: formatKeybinding("Mod+Y"), onClick: () => { void executeCommand("forge.edit.redo"); }, disabled: !isCommandEnabled("forge.edit.redo") },
        { separator: true },
        { label: "Clear selected", onClick: () => tab.deleteSelection() },
      ],
    },
    {
      label: "Image",
      children: [
        { label: "Flip Horizontal", onClick: () => tab.flipH() },
        { label: "Flip Vertical", onClick: () => tab.flipV() },
        { label: "Rotate 90°", onClick: () => tab.rotate90() },
        { label: "Rotate 180°", onClick: () => tab.rotate180() },
        { separator: true },
        {
          label: "Image Size...",
          onClick: () => {
            const size = promptSize("Image size (WxH)", tab.document.width, tab.document.height);
            if (size) tab.resize(size.width, size.height);
          },
        },
        {
          label: "Canvas Size...",
          onClick: () => {
            const size = promptSize("Canvas size (WxH)", tab.document.width, tab.document.height);
            if (size) tab.canvasResize(size.width, size.height);
          },
        },
        { separator: true },
        { label: "Invert", onClick: () => tab.invert() },
        { label: "Desaturate", onClick: () => tab.desaturate() },
      ],
    },
    {
      label: "Layer",
      children: [
        { label: "New Layer", onClick: () => tab.newLayer() },
        { label: "Duplicate Layer", onClick: () => tab.duplicateActiveLayer() },
        { label: "Delete Layer", onClick: () => tab.deleteActiveLayer() },
        { label: "Merge Down", onClick: () => tab.mergeActiveDown() },
        { label: "Flatten Image", onClick: () => tab.flatten() },
      ],
    },
    {
      label: "Select",
      children: [
        { label: "All", shortcut: formatKeybinding("Mod+A"), onClick: () => tab.selectAll() },
        { label: "Deselect", shortcut: formatKeybinding("Mod+D"), onClick: () => tab.deselect() },
        { label: "Invert", onClick: () => tab.invertSelection() },
      ],
    },
    {
      label: "View",
      children: [
        { label: "2D", onClick: () => { tab.preview3D = false; tab.notifyUi(); }, checked: !tab.preview3D },
        { label: "3D", onClick: () => { tab.preview3D = true; tab.notifyUi(); }, checked: tab.preview3D },
        { separator: true },
        { label: "Zoom In", onClick: () => { tab.canvasScale = Math.min(16, tab.canvasScale + 0.25); tab.notifyUi(); } },
        { label: "Zoom Out", onClick: () => { tab.canvasScale = Math.max(0.1, tab.canvasScale - 0.25); tab.notifyUi(); } },
        { label: "100%", onClick: () => { tab.canvasScale = 1; tab.notifyUi(); } },
        { separator: true },
        { label: "RGB", onClick: () => { tab.viewChannel = "rgba"; tab.notifyUi(); }, checked: tab.viewChannel === "rgba" },
        { label: "Red", onClick: () => { tab.viewChannel = "r"; tab.notifyUi(); }, checked: tab.viewChannel === "r" },
        { label: "Green", onClick: () => { tab.viewChannel = "g"; tab.notifyUi(); }, checked: tab.viewChannel === "g" },
        { label: "Blue", onClick: () => { tab.viewChannel = "b"; tab.notifyUi(); }, checked: tab.viewChannel === "b" },
        { label: "Alpha", onClick: () => { tab.viewChannel = "a"; tab.notifyUi(); }, checked: tab.viewChannel === "a" },
      ],
    },
  ];

  return (
    <div className="tab-image-editor">
      <MenuBar items={menuItems} />
      <div className="tab-image-editor__body">
        <LayoutContainerProvider>
          <LayoutContainer
            westContent={<ImageToolRail tab={tab} />}
            westSize={52}
            northContent={<ImageToolOptions tab={tab} />}
            northSize={36}
            eastContent={<ImageEastDock tab={tab} />}
            eastSize={300}
            southContent={<ImageStatusBar tab={tab} />}
            southSize={28}
          >
            <ImageCanvas tab={tab} txiPreview={txiPreview} />
          </LayoutContainer>
        </LayoutContainerProvider>
      </div>
    </div>
  );
};
