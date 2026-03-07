import React, { useEffect, useRef, useState } from "react";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { Modal, Button, Form } from "react-bootstrap";
import { ModalResourceComparisonState, ResourceComparisonResource } from "../../states/modal/ModalResourceComparisonState";
import * as KotOR from "../../KotOR";
import "./ModalResourceComparison.scss";

const ASCII_MIN_PRINTABLE = 32;
const ASCII_MAX_PRINTABLE = 127;

function isGFFResource(ext: string): boolean {
  const gffTypes = ['are', 'git', 'ifo', 'dlg', 'utc', 'utd', 'ute', 'uti', 'utm', 'utp', 'uts', 'utt', 'utw', 'jrl', 'fac', 'gui', 'pth', 'gff', 'res'];
  return gffTypes.includes(ext.toLowerCase());
}

function formatGFFData(data: Uint8Array): string {
  try {
    const gff = new KotOR.GFFObject(data);
    return formatGFFStruct(gff.RootNode, 0);
  } catch(e) {
    return `[GFF parse error: ${e}]`;
  }
}

function formatGFFStruct(struct: KotOR.GFFStruct, indent: number = 0): string {
  const indentStr = '  '.repeat(indent);
  let result = `${indentStr}Struct:\n`;

  const fields = struct.getFields();
  for(const field of fields){
    result += `${indentStr}  ${field.label}: `;
    if(field.type === KotOR.GFFDataType.STRUCT){
      result += '\n' + formatGFFStruct(field.getChildStructs()[0], indent + 2);
    } else if(field.type === KotOR.GFFDataType.LIST){
      const children = field.getChildStructs();
      result += `List[${children.length}]\n`;
      children.forEach((child, idx) => {
        result += `${indentStr}    [${idx}]:\n` + formatGFFStruct(child, indent + 3);
      });
    } else {
      const value = field.getValue();
      result += `${String(value).substring(0, 200)}\n`;
    }
  }

  return result;
}

function formatResourceData(data: Uint8Array, ext: string = ''): string {
  // Check if it's a GFF file and format accordingly
  if(isGFFResource(ext)){
    const gffResult = formatGFFData(data);
    if(!gffResult.startsWith('[GFF parse error')){
      return gffResult;
    }
    // Fall through to hex if GFF parse failed
  }
  try {
    const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(data);
    if (/^[\x20-\x7e\n\r\t]+$/.test(utf8) || utf8.length > 0 && !/[^\x20-\x7e\n\r\t]/.test(utf8)) {
      return utf8;
    }
  } catch {
    // fall through to hex
  }
  try {
    const latin1 = new TextDecoder("latin-1", { fatal: false }).decode(data);
    if (latin1.length === data.length) {
      return latin1;
    }
  } catch {
    // fall through
  }
  const hexLines: string[] = [];
  for (let i = 0; i < data.length; i += 16) {
    const chunk = data.slice(i, Math.min(i + 16, data.length));
    const hexPart = Array.from(chunk)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    const asciiPart = Array.from(chunk)
      .map((b) => (b >= ASCII_MIN_PRINTABLE && b < ASCII_MAX_PRINTABLE ? String.fromCharCode(b) : "."))
      .join("");
    hexLines.push(`${i.toString(16).padStart(8, "0")}  ${hexPart.padEnd(48)}  ${asciiPart}`);
  }
  return hexLines.length ? hexLines.join("\n") : "(empty)";
}

export const ModalResourceComparison = (props: BaseModalProps) => {
  const modal = props.modal as ModalResourceComparisonState;
  const [show, setShow] = useState(modal.visible);
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [leftPath, setLeftPath] = useState("");
  const [rightPath, setRightPath] = useState("");
  const leftRef = useRef<HTMLTextAreaElement>(null);
  const rightRef = useRef<HTMLTextAreaElement>(null);

  const onHide = () => setShow(false);
  const onShow = () => {
    setShow(true);
    setLeftText(formatResourceData(modal.resource1.data, modal.resource1.ext));
    setLeftPath(modal.resource1.filepath ?? `${modal.resource1.resref}.${modal.resource1.ext}`);
    if (modal.resource2) {
      setRightText(formatResourceData(modal.resource2.data, modal.resource2.ext));
      setRightPath(modal.resource2.filepath ?? `${modal.resource2.resref}.${modal.resource2.ext}`);
    } else {
      setRightText("[No resource selected for comparison]");
      setRightPath("[Not selected]");
    }
  };

  useEffect(() => {
    modal.addEventListener("onHide", onHide);
    modal.addEventListener("onShow", onShow);
    return () => {
      modal.removeEventListener("onHide", onHide);
      modal.removeEventListener("onShow", onShow);
    };
  }, [modal]);

  useEffect(() => {
    if (!show) return;
    setLeftText(formatResourceData(modal.resource1.data));
    setLeftPath(modal.resource1.filepath ?? `${modal.resource1.resref}.${modal.resource1.ext}`);
    if (modal.resource2) {
      setRightText(formatResourceData(modal.resource2.data));
      setRightPath(modal.resource2.filepath ?? `${modal.resource2.resref}.${modal.resource2.ext}`);
    } else {
      setRightText("[No resource selected for comparison]");
      setRightPath("[Not selected]");
    }
  }, [show, modal.resource1, modal.resource2]);

  useEffect(() => {
    const leftEl = leftRef.current;
    const rightEl = rightRef.current;
    if (!leftEl || !rightEl) return;
    const syncScroll = (source: HTMLTextAreaElement, target: HTMLTextAreaElement) => {
      target.scrollTop = source.scrollTop;
      target.scrollLeft = source.scrollLeft;
    };
    const onLeftScroll = () => syncScroll(leftEl, rightEl);
    const onRightScroll = () => syncScroll(rightEl, leftEl);
    leftEl.addEventListener("scroll", onLeftScroll);
    rightEl.addEventListener("scroll", onRightScroll);
    return () => {
      leftEl.removeEventListener("scroll", onLeftScroll);
      rightEl.removeEventListener("scroll", onRightScroll);
    };
  }, [show]);

  const handleClose = () => {
    modal.close();
  };

  return (
    <Modal show={show} onHide={handleClose} size="xl" backdrop="static" keyboard={false} className="modal-resource-comparison">
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex gap-2 flex-column">
          <div className="small text-muted d-flex justify-content-between align-items-center">
            <div>
              <strong>Left:</strong> {leftPath}
            </div>
            {isGFFResource(modal.resource1.ext) && (
              <span className="badge bg-info">GFF Structured View</span>
            )}
          </div>
          <div className="small text-muted">
            <strong>Right:</strong> {rightPath}
          </div>
          <div className="modal-resource-comparison-panes d-flex gap-2">
            <Form.Control
              ref={leftRef}
              as="textarea"
              readOnly
              value={leftText}
              className="modal-resource-comparison-textarea font-monospace small flex-grow-1"
              spellCheck={false}
            />
            <Form.Control
              ref={rightRef}
              as="textarea"
              readOnly
              value={rightText}
              className="modal-resource-comparison-textarea font-monospace small flex-grow-1"
              spellCheck={false}
            />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
