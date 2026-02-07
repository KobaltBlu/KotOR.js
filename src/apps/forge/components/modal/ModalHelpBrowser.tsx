import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Form, FormControl } from "react-bootstrap";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { ModalHelpBrowserState } from "../../states/modal/ModalHelpBrowserState";
import { type HelpDocument } from "../../data";

interface FilteredFolder {
  name: string;
  documents: HelpDocument[];
}

export const ModalHelpBrowser = (props: BaseModalProps) => {
  const modal = props.modal as ModalHelpBrowserState;
  const [show, setShow] = useState(modal.visible);
  const [query, setQuery] = useState("");

  const onHide = () => setShow(false);
  const onShow = () => setShow(true);

  useEffect(() => {
    modal.addEventListener("onHide", onHide);
    modal.addEventListener("onShow", onShow);
    return () => {
      modal.removeEventListener("onHide", onHide);
      modal.removeEventListener("onShow", onShow);
    };
  }, [modal]);

  const handleClose = () => {
    modal.close();
  };

  const filteredFolders = useMemo<FilteredFolder[]>(() => {
    const normalized = query.trim().toLowerCase();
    return modal
      .getFolders()
      .map<FilteredFolder>((folder) => {
        if (!normalized) {
          return { name: folder.name, documents: folder.documents };
        }
        const docs = folder.documents.filter((doc) => {
          const haystack = `${doc.name} ${doc.file}`.toLowerCase();
          return haystack.includes(normalized);
        });
        return { name: folder.name, documents: docs };
      })
      .filter((folder) => folder.documents.length > 0);
  }, [modal, query]);

  const openDocument = (doc: HelpDocument) => {
    const target = doc.url ?? doc.file;
    if (typeof window !== "undefined") {
      window.open(target, "_blank", "noopener");
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" scrollable backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="small text-muted">
          Browse getting-started guides, tool overviews, and tutorials ported from the Holocron Toolset
          documentation. Use the search box to locate topics quickly.
        </p>
        <Form className="mb-3" onSubmit={(event) => event.preventDefault()}>
          <FormControl
            type="search"
            placeholder="Search help topics…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Form>
        {filteredFolders.length === 0 ? (
          <p className="text-muted fst-italic">No help topics match your search.</p>
        ) : (
          filteredFolders.map((folder) => (
            <div key={folder.name} className="mb-4">
              <h6 className="text-uppercase text-muted">{folder.name}</h6>
              <ul className="list-unstyled mb-0">
                {folder.documents.map((doc) => (
                  <li
                    key={`${folder.name}-${doc.file}`}
                    className="d-flex flex-column flex-md-row align-items-md-center justify-content-between border rounded px-3 py-2 mb-2"
                  >
                    <div className="me-md-3">
                      <div className="fw-semibold">{doc.name}</div>
                      <div className="small text-muted">{doc.url ?? doc.file}</div>
                    </div>
                    <div className="mt-2 mt-md-0">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => openDocument(doc)}
                      >
                        Open
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
