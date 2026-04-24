import React, { useEffect, useState } from 'react';
import { BaseModalProps } from '@/apps/forge/interfaces/modal/BaseModalProps';
import { Modal, ProgressBar } from 'react-bootstrap';
import { ModalExtractionProgressState } from '@/apps/forge/states/modal/ModalExtractionProgressState';

export const ModalExtractionProgress = (props: BaseModalProps) => {
  const modal = props.modal as ModalExtractionProgressState;
  const [show, setShow] = useState(modal.visible);
  const [message, setMessage] = useState(modal.message);
  const [current, setCurrent] = useState(modal.current);
  const [total, setTotal] = useState(modal.total);

  useEffect(() => {
    const onHide = () => setShow(false);
    const onShow = () => setShow(true);
    const onProgress = (cur: number, tot: number, msg: string) => {
      setCurrent(cur);
      setTotal(tot);
      setMessage(msg);
    };
    modal.addEventListener('onHide', onHide);
    modal.addEventListener('onShow', onShow);
    modal.addEventListener('onProgressUpdate', onProgress);
    return () => {
      modal.removeEventListener('onHide', onHide);
      modal.removeEventListener('onShow', onShow);
      modal.removeEventListener('onProgressUpdate', onProgress);
    };
  }, []);

  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Modal show={show} backdrop="static" keyboard={false} centered>
      <Modal.Header>
        <Modal.Title>Extracting Assets</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p style={{ marginBottom: '8px', fontSize: '13px' }}>{message}</p>
        <ProgressBar now={pct} label={total > 0 ? `${current} / ${total}` : ''} animated striped />
      </Modal.Body>
    </Modal>
  );
};
