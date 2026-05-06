import React from "react";
import { BaseModalProps } from "@/apps/forge/interfaces/modal/BaseModalProps";
import { Button, Modal } from "react-bootstrap";
import type { BulkProjectNssCompileOutcome } from "@/apps/forge/helpers/ForgeNWScriptCompile";
import { ModalBulkNssCompileResultsState } from "@/apps/forge/states/modal/ModalBulkNssCompileResultsState";

export const ModalBulkNssCompileResults = (props: BaseModalProps) => {
  const modal = props.modal as ModalBulkNssCompileResultsState;
  const [show, setShow] = React.useState(modal.visible);
  const r: BulkProjectNssCompileOutcome = modal.outcome;

  React.useEffect(() => {
    const onHide = () => setShow(false);
    const onShow = () => setShow(true);
    modal.addEventListener("onHide", onHide);
    modal.addEventListener("onShow", onShow);
    return () => {
      modal.removeEventListener("onHide", onHide);
      modal.removeEventListener("onShow", onShow);
    };
  }, [modal]);

  return (
    <Modal show={show} onHide={() => modal.close()} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Bulk NSS compile</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {r.abortedReason && (
          <p style={{ color: "#d9534f" }}>{r.abortedReason}</p>
        )}
        <p>
          <strong>Compiled:</strong> {r.succeeded} / {r.total}
          {r.failed > 0 && (
            <>
              {" "}
              &bull; <strong style={{ color: "#d9534f" }}>Failed:</strong> {r.failed}
            </>
          )}
        </p>
        <p style={{ fontSize: 12, opacity: 0.85 }}>
          Output folder: <code>compiled/</code> (mirrors source paths).
        </p>

        {(r.failed > 0 || r.written.length > 0) && (
          <div
            style={{
              maxHeight: "340px",
              overflowY: "auto",
              border: "1px solid #444",
              borderRadius: "4px",
              padding: "8px",
              backgroundColor: "#1a1a1a",
              fontSize: "12px",
              fontFamily: "monospace",
            }}
          >
            {r.written.map((f, i) => (
              <div key={`ok-${i}`} style={{ color: "#5cb85c" }}>
                {f}
              </div>
            ))}
            {r.failures.map((f, fi) => (
              <div key={`fail-${fi}`} style={{ color: "#d9534f", marginTop: 6 }}>
                {f.relativePath}
                <ul style={{ margin: "4px 0 0 16px", color: "#e0a0a0" }}>
                  {f.messages.map((m, mi) => (
                    <li key={mi}>{m}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={() => modal.close()}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
