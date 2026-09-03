import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatDlgNodeLine, locStringIsEmpty } from "@/apps/forge/dlg/dlgLocString";
import { buildFocusNeighborhood, type DLGNeighborhoodEdge } from "@/apps/forge/dlg/dlgNeighborhood";
import type { ForgeDLG } from "@/apps/forge/dlg/ForgeDLG";
import { DLG_NEIGHBOR_CAP, type ForgeDLGLink, type ForgeDLGNode } from "@/apps/forge/dlg/ForgeDLGTypes";

/**
 * Focus-graph: selected node plus inbound/outbound neighbors only.
 *
 * @file DLGFocusGraph.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

const CARD_W = 280;
const CARD_H = 220;
const COL_GAP = 88;
const ROW_GAP = 24;

export type DLGGraphLayout = "horizontal" | "vertical";

export interface DLGFocusGraphProps {
  dlg: ForgeDLG;
  selectedId: string | undefined;
  texts: ReadonlyMap<string, string>;
  inboundTotal: (id: string) => number;
  onSelect: (id: string) => void;
  onWalkTo: (id: string, link?: ForgeDLGLink) => void;
  onAddChild: () => void;
  onReorderLink: (ownerId: string, linkId: string, direction: -1 | 1) => void;
  onUnlink: (linkId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  walkthrough: boolean;
  layout: DLGGraphLayout;
  onLayoutChange: (layout: DLGGraphLayout) => void;
}

function cardBody(node: ForgeDLGNode | undefined, texts?: ReadonlyMap<string, string>): { title: string; body: string } {
  if (!node) {
    return { title: "Broken link", body: "Target node is missing." };
  }
  const preview = formatDlgNodeLine(node, texts).replace(/\s+/g, " ").trim();
  const kind = node.kind === "entry" ? "NPC" : "PC";
  let body = preview;
  if (!body && locStringIsEmpty(node.text) && node.links.length) {
    body = "Continue";
  } else if (!body) {
    body = "End conversation";
  }
  const title = node.speaker || (node.kind === "reply" ? "Player" : kind);
  return { title, body };
}

function ActionBtn(props: {
  title: string;
  icon: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`dlg-card__act${props.danger ? " is-danger" : ""}`}
      title={props.title}
      disabled={props.disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!props.disabled) {
          props.onClick();
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <i className={`fa-solid ${props.icon}`} aria-hidden />
    </button>
  );
}

function kindName(kind: string): string {
  if (kind === "reply") {
    return "Reply";
  }
  if (kind === "start") {
    return "Start";
  }
  return "Entry";
}

function DLGNodeCard(props: {
  node: ForgeDLGNode | undefined;
  kindHint?: string;
  role?: "node" | "link";
  link?: ForgeDLGLink;
  selected?: boolean;
  shared?: number;
  condition?: string;
  texts?: ReadonlyMap<string, string>;
  canReorder?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  canUnlink?: boolean;
  canDelete?: boolean;
  onClick?: () => void;
  layout?: DLGGraphLayout;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onUnlink?: () => void;
  onDelete?: () => void;
}) {
  const copy = cardBody(props.node, props.texts);
  const kind = props.node?.kind || props.kindHint || "entry";
  const isLink = props.role === "link";
  const chips: string[] = [];
  if (props.node?.script) {
    chips.push(`do ${props.node.script}`);
  }
  if (props.node?.voResRef) {
    chips.push("VO");
  }
  if (!isLink && props.shared && props.shared > 1) {
    chips.push(`×${props.shared}`);
  }
  const hasActions = props.canReorder || props.canUnlink || props.canDelete;
  const reuse = !!props.link && (props.link.isChild > 0 || (props.shared || 0) > 1);
  return (
    <div
      className={`dlg-card dlg-card--${kind}${isLink ? " dlg-card--link" : " dlg-card--node"}${props.selected ? " is-selected" : ""}`}
      onWheel={(e) => e.stopPropagation()}
    >
      {isLink ? (
        <div className="dlg-card__linkbar">
          <span className="dlg-card__kind dlg-card__kind--link">
            <i className="fa-solid fa-link" aria-hidden /> Link
          </span>
          {props.condition ? (
            <span className="dlg-chip dlg-chip--cond" title={props.condition}>if {props.condition}</span>
          ) : null}
          {reuse ? <span className="dlg-chip" title="Points at a shared node">reuse</span> : null}
        </div>
      ) : null}
      <button type="button" className="dlg-card__hit" title={copy.body} onClick={props.onClick}>
        <div className="dlg-card__meta">
          <span className={`dlg-card__kind dlg-card__kind--${kind}`}>{kindName(kind)}</span>
          {props.node?.id ? <span className="dlg-card__id">{props.node.id}</span> : null}
        </div>
        <div className="dlg-card__title">{copy.title}</div>
        <div className="dlg-card__body">{copy.body}</div>
        {chips.length ? (
          <div className="dlg-card__chips">
            {chips.slice(0, 3).map((chip) => (
              <span key={chip} className="dlg-chip">{chip}</span>
            ))}
          </div>
        ) : null}
      </button>
      {hasActions ? (
        <div className="dlg-card__actions">
          {props.canReorder ? (
            <>
              <ActionBtn
                title={props.layout === "vertical" ? "Move left" : "Move up"}
                icon={props.layout === "vertical" ? "fa-arrow-left" : "fa-arrow-up"}
                disabled={!props.canMoveUp}
                onClick={() => props.onMoveUp?.()}
              />
              <ActionBtn
                title={props.layout === "vertical" ? "Move right" : "Move down"}
                icon={props.layout === "vertical" ? "fa-arrow-right" : "fa-arrow-down"}
                disabled={!props.canMoveDown}
                onClick={() => props.onMoveDown?.()}
              />
            </>
          ) : null}
          {props.canUnlink ? (
            <ActionBtn title="Unlink" icon="fa-link-slash" onClick={() => props.onUnlink?.()} />
          ) : null}
          {props.canDelete && props.node ? (
            <ActionBtn title="Delete node" icon="fa-trash" danger onClick={() => props.onDelete?.()} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface SlotPoint {
  left: number;
  top: number;
}

interface GraphGeometry {
  width: number;
  height: number;
  center: SlotPoint;
  inbound: SlotPoint[];
  outbound: SlotPoint[];
  add: SlotPoint;
  inLabel: SlotPoint;
  outLabel: SlotPoint;
}

function stackOffsets(count: number, size: number, gap: number): number[] {
  if (count <= 0) {
    return [];
  }
  const total = count * size + (count - 1) * gap;
  const start = -total / 2;
  const offsets: number[] = [];
  for (let i = 0; i < count; i++) {
    offsets.push(start + i * (size + gap));
  }
  return offsets;
}

function graphGeometry(layout: DLGGraphLayout, inboundCount: number, outboundCount: number): GraphGeometry {
  if (layout === "vertical") {
    const laneCount = Math.max(inboundCount, outboundCount, 1);
    const addH = 36;
    const addGap = 12;
    const width = Math.max(CARD_W + 200, laneCount * (CARD_W + ROW_GAP) + 160);
    const height = CARD_H * 3 + COL_GAP * 2 + addH + addGap + 160;
    const cx = width / 2;
    const cy = height / 2;
    const center = { left: cx - CARD_W / 2, top: cy - CARD_H / 2 };
    const inboundTop = center.top - CARD_H - COL_GAP;
    const addTop = center.top + CARD_H + addGap;
    const outboundTop = addTop + addH + COL_GAP;
    const inboundX = stackOffsets(inboundCount, CARD_W, ROW_GAP);
    const outboundX = stackOffsets(outboundCount, CARD_W, ROW_GAP);
    const inbound = inboundX.map((x) => ({ left: cx + x, top: inboundTop }));
    const outbound = outboundX.map((x) => ({ left: cx + x, top: outboundTop }));
    return {
      width,
      height,
      center,
      inbound,
      outbound,
      add: {
        left: center.left,
        top: addTop,
      },
      inLabel: { left: inbound[0]?.left ?? center.left, top: inboundTop - 22 },
      outLabel: { left: (outboundCount ? outbound[0].left : center.left), top: outboundTop - 22 },
    };
  }

  const height = Math.max(
    CARD_H + 180,
    Math.max(inboundCount, outboundCount + 1, 1) * (CARD_H + ROW_GAP) + 180,
  );
  const width = CARD_W * 3 + COL_GAP * 2 + 120;
  const cx = width / 2;
  const cy = height / 2;
  const center = { left: cx - CARD_W / 2, top: cy - CARD_H / 2 };
  const inboundLeft = center.left - CARD_W - COL_GAP;
  const outboundLeft = center.left + CARD_W + COL_GAP;
  const inboundY = stackOffsets(inboundCount, CARD_H, ROW_GAP);
  const outboundY = stackOffsets(Math.max(outboundCount, 1), CARD_H, ROW_GAP);
  const inbound = inboundY.map((y) => ({ left: inboundLeft, top: cy + y }));
  const outbound = outboundY.map((y) => ({ left: outboundLeft, top: cy + y }));
  return {
    width,
    height,
    center,
    inbound,
    outbound,
    add: {
      left: outboundLeft,
      top: outboundCount ? cy + outboundY[outboundCount - 1] + CARD_H + 8 : cy - 18,
    },
    inLabel: { left: inboundLeft, top: (inbound[0]?.top ?? center.top) - 22 },
    outLabel: { left: outboundLeft, top: (outboundCount ? outbound[0].top : center.top) - 22 },
  };
}

function edgePath(x0: number, y0: number, x1: number, y1: number, layout: DLGGraphLayout): string {
  if (layout === "vertical") {
    const mid = (y0 + y1) / 2;
    return `M ${x0} ${y0} C ${x0} ${mid}, ${x1} ${mid}, ${x1} ${y1}`;
  }
  const mid = (x0 + x1) / 2;
  return `M ${x0} ${y0} C ${mid} ${y0}, ${mid} ${y1}, ${x1} ${y1}`;
}

function conditionLabel(link: ForgeDLGLink): string {
  const parts: string[] = [];
  if (link.active) parts.push(link.active);
  if (link.active2) parts.push(link.active2);
  return parts.join(link.logic ? " OR " : " AND ");
}

export const DLGFocusGraph: React.FC<DLGFocusGraphProps> = ({
  dlg,
  selectedId,
  texts,
  inboundTotal,
  onSelect,
  onWalkTo,
  onAddChild,
  onReorderLink,
  onUnlink,
  onDeleteNode,
  walkthrough,
  layout,
  onLayoutChange,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0, scale: 1 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    setPan({ x: 0, y: 0, scale: 1 });
  }, [layout]);

  useEffect(() => {
    setPan((prev) => ({ x: 0, y: 0, scale: prev.scale }));
  }, [selectedId]);

  const neighborhood = useMemo(() => {
    if (!selectedId) {
      const outbound = dlg.startingLinks.map((link) => ({
        link,
        node: dlg.getNode(link.targetId),
        fromId: "start",
      }));
      return {
        center: undefined,
        inbound: [],
        outbound: outbound.slice(0, DLG_NEIGHBOR_CAP),
        inboundHidden: 0,
        outboundHidden: Math.max(0, outbound.length - DLG_NEIGHBOR_CAP),
        inboundTotal: 0,
        outboundTotal: outbound.length,
      };
    }
    return buildFocusNeighborhood(dlg, selectedId);
  }, [dlg, selectedId, dlg.entries.length, dlg.replies.length, dlg.startingLinks.length, texts]);

  const inbound = neighborhood.inbound;
  const outbound = neighborhood.outbound;
  const geom = graphGeometry(layout, inbound.length, outbound.length);
  const { width, height, center } = geom;
  const ownerId = selectedId || "start";
  const addLabel = !selectedId
    ? "Add starting entry"
    : neighborhood.center?.kind === "reply"
      ? "Add entry"
      : "Add reply";

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = Math.min(2.2, Math.max(0.4, pan.scale * (e.deltaY > 0 ? 0.92 : 1.08)));
    setPan({ ...pan, scale: next });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".dlg-card, .dlg-graph__add, .dlg-graph__layout")) {
      return;
    }
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) {
      return;
    }
    setPan({
      ...pan,
      x: drag.current.px + (e.clientX - drag.current.x),
      y: drag.current.py + (e.clientY - drag.current.y),
    });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const lines: React.ReactNode[] = [];
  const toEdge = (x0: number, y0: number, x1: number, y1: number, key: string, kind: string, gated: boolean) => {
    lines.push(
      <path
        key={key}
        className={`dlg-graph__edge dlg-graph__edge--${kind}${gated ? " is-gated" : ""}`}
        d={edgePath(x0, y0, x1, y1, layout)}
      />,
    );
  };

  inbound.forEach((edge, i) => {
    const slot = geom.inbound[i];
    const kind = edge.fromId === "start" ? "start" : (edge.node?.kind || "entry");
    if (layout === "vertical") {
      toEdge(
        slot.left + CARD_W / 2,
        slot.top + CARD_H,
        center.left + CARD_W / 2,
        center.top,
        `in-${edge.link.id}`,
        kind,
        !!conditionLabel(edge.link),
      );
    } else {
      toEdge(
        slot.left + CARD_W,
        slot.top + CARD_H / 2,
        center.left,
        center.top + CARD_H / 2,
        `in-${edge.link.id}`,
        kind,
        !!conditionLabel(edge.link),
      );
    }
  });
  outbound.forEach((edge, i) => {
    const slot = geom.outbound[i];
    if (layout === "vertical") {
      toEdge(
        center.left + CARD_W / 2,
        center.top + CARD_H,
        slot.left + CARD_W / 2,
        slot.top,
        `out-${edge.link.id}`,
        edge.node?.kind || "reply",
        !!conditionLabel(edge.link),
      );
    } else {
      toEdge(
        center.left + CARD_W,
        center.top + CARD_H / 2,
        slot.left,
        slot.top + CARD_H / 2,
        `out-${edge.link.id}`,
        edge.node?.kind || "reply",
        !!conditionLabel(edge.link),
      );
    }
  });

  const clickEdge = (edge: DLGNeighborhoodEdge, role: "in" | "out") => {
    const id = role === "in" ? edge.fromId : edge.link.targetId;
    if (id === "start") {
      onSelect("root");
      return;
    }
    if (walkthrough && role === "out") {
      onWalkTo(edge.link.targetId, edge.link);
      return;
    }
    onSelect(id);
  };

  const setLayout = (next: DLGGraphLayout) => {
    if (next !== layout) {
      onLayoutChange(next);
    }
  };

  return (
    <div
      ref={viewportRef}
      className={`dlg-graph dlg-graph--${layout}`}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        className="dlg-graph__world"
        style={{
          width,
          height,
          marginLeft: -width / 2,
          marginTop: -height / 2,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${pan.scale})`,
        }}
      >
        <svg className="dlg-graph__svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {lines}
        </svg>
        <div className="dlg-graph__layer" style={{ width, height }}>
          <div className="dlg-graph__col-label" style={{ left: geom.inLabel.left, top: geom.inLabel.top }}>
            Incoming links
          </div>
          <div className="dlg-graph__col-label" style={{ left: geom.outLabel.left, top: geom.outLabel.top }}>
            Outgoing links
          </div>
          {inbound.map((edge, i) => (
            <div
              key={edge.link.id}
              className="dlg-graph__slot"
              style={{ left: geom.inbound[i].left, top: geom.inbound[i].top }}
            >
              {edge.fromId === "start" ? (
                <div className="dlg-card dlg-card--start dlg-card--link" onWheel={(e) => e.stopPropagation()}>
                  <div className="dlg-card__linkbar">
                    <span className="dlg-card__kind dlg-card__kind--link">
                      <i className="fa-solid fa-link" aria-hidden /> Link
                    </span>
                    {conditionLabel(edge.link) ? (
                      <span className="dlg-chip dlg-chip--cond">if {conditionLabel(edge.link)}</span>
                    ) : null}
                  </div>
                  <button type="button" className="dlg-card__hit" onClick={() => onSelect("root")}>
                    <div className="dlg-card__meta">
                      <span className="dlg-card__kind dlg-card__kind--start">Start</span>
                    </div>
                    <div className="dlg-card__title">Starting list</div>
                    <div className="dlg-card__body">Conversation entry point</div>
                  </button>
                  <div className="dlg-card__actions">
                    <ActionBtn title="Unlink start" icon="fa-link-slash" onClick={() => onUnlink(edge.link.id)} />
                  </div>
                </div>
              ) : (
                <DLGNodeCard
                  node={edge.node}
                  role="link"
                  link={edge.link}
                  texts={texts}
                  shared={edge.node ? inboundTotal(edge.node.id) : 0}
                  condition={conditionLabel(edge.link)}
                  canUnlink
                  canDelete={!!edge.node}
                  onClick={() => clickEdge(edge, "in")}
                  onUnlink={() => onUnlink(edge.link.id)}
                  onDelete={() => edge.node && onDeleteNode(edge.node.id)}
                />
              )}
            </div>
          ))}
          <div
            className="dlg-graph__slot"
            style={{ left: geom.center.left, top: geom.center.top }}
          >
            {selectedId === "root" || !neighborhood.center ? (
              <div className="dlg-card dlg-card--start dlg-card--node is-selected" onWheel={(e) => e.stopPropagation()}>
                <button type="button" className="dlg-card__hit" onClick={() => onSelect("root")}>
                  <div className="dlg-card__meta">
                    <span className="dlg-card__kind dlg-card__kind--start">Conversation</span>
                  </div>
                  <div className="dlg-card__title">{dlg.voId || "Root"}</div>
                  <div className="dlg-card__body">
                    {dlg.entries.length} entries · {dlg.replies.length} replies
                  </div>
                </button>
              </div>
            ) : (
              <DLGNodeCard
                node={neighborhood.center}
                role="node"
                texts={texts}
                selected
                shared={inboundTotal(neighborhood.center.id)}
                canDelete
                onDelete={() => onDeleteNode(neighborhood.center!.id)}
              />
            )}
          </div>
          {outbound.map((edge, i) => (
            <div
              key={edge.link.id}
              className="dlg-graph__slot"
              style={{ left: geom.outbound[i].left, top: geom.outbound[i].top }}
            >
              <DLGNodeCard
                node={edge.node}
                role="link"
                link={edge.link}
                texts={texts}
                shared={edge.node ? inboundTotal(edge.node.id) : 0}
                condition={conditionLabel(edge.link)}
                layout={layout}
                canReorder
                canMoveUp={i > 0}
                canMoveDown={i < outbound.length - 1}
                canUnlink
                canDelete={!!edge.node}
                onClick={() => clickEdge(edge, "out")}
                onMoveUp={() => onReorderLink(ownerId, edge.link.id, -1)}
                onMoveDown={() => onReorderLink(ownerId, edge.link.id, 1)}
                onUnlink={() => onUnlink(edge.link.id)}
                onDelete={() => edge.node && onDeleteNode(edge.node.id)}
              />
            </div>
          ))}
          <button
            type="button"
            className="dlg-graph__add"
            style={{ left: geom.add.left, top: geom.add.top, width: CARD_W }}
            onClick={(e) => {
              e.stopPropagation();
              onAddChild();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <i className="fa-solid fa-plus" aria-hidden /> {addLabel}
          </button>
        </div>
      </div>
      {(neighborhood.inboundHidden > 0 || neighborhood.outboundHidden > 0) ? (
        <div className="dlg-graph__more">
          {neighborhood.inboundHidden > 0 ? `${neighborhood.inboundHidden} more inbound ` : null}
          {neighborhood.outboundHidden > 0 ? `${neighborhood.outboundHidden} more outbound` : null}
        </div>
      ) : null}
      <div className="dlg-graph__layout" onPointerDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`dlg-graph__layout-btn${layout === "horizontal" ? " is-active" : ""}`}
          title="Horizontal layout"
          onClick={() => setLayout("horizontal")}
        >
          <i className="fa-solid fa-arrows-left-right" aria-hidden />
        </button>
        <button
          type="button"
          className={`dlg-graph__layout-btn${layout === "vertical" ? " is-active" : ""}`}
          title="Vertical layout"
          onClick={() => setLayout("vertical")}
        >
          <i className="fa-solid fa-arrows-up-down" aria-hidden />
        </button>
      </div>
    </div>
  );
};
