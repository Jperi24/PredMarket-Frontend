import React from "react";
import styles from "../styles/Modal.module.css";

const Modal = ({ show, handleClose, handleConfirm, content }) => {
  if (!show) {
    return null;
  }

  return (
    <div className={styles["modal-overlay"]}>
      <div className={styles.modal}>
        <div
          className={styles["modal-content"]}
          dangerouslySetInnerHTML={{ __html: content }}
        />
        <div className={styles["modal-actions"]}>
          <button
            onClick={handleClose}
            className={`${styles["modal-button"]} ${styles["modal-cancel"]}`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`${styles["modal-button"]} ${styles["modal-confirm"]}`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
