// ============================================
// js/mouse.js - Mouse & Drag-and-Drop Handlers
// ============================================
import { clearHoverHighlights } from "./board.js";
import { executeMove } from "./moves.js";
import { state } from "./state.js";

/** @type {string | number | null} */
let draggedFromIndex = null;

/**
 * Initialize all mouse drag-and-drop event listeners on the board.
 */
export function setupMouseAndDragListeners() {
  const boardEl = document.querySelector('.master-board');
  if (!boardEl) return;

  // ---------------------------------------
  // Drag & Drop Listeners
  // ---------------------------------------

  // Drag Start
  boardEl.addEventListener('dragstart', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const checkerEl = target.closest('.checker');
    if (!checkerEl) return;

    const pointContainer = /** @type {HTMLElement | null} */ (
      checkerEl.closest('[data-point-index]')
    );

    const pointAttr = pointContainer?.dataset.pointIndex;
    if (pointAttr === undefined) return;

    draggedFromIndex = pointAttr === 'bar' ? 'bar' : parseInt(pointAttr, 10);

    const dragEvt = /** @type {DragEvent} */ (e);
    if (dragEvt.dataTransfer) {
      dragEvt.dataTransfer.effectAllowed = 'move';
      dragEvt.dataTransfer.setData('text/plain', String(draggedFromIndex));
    }

    checkerEl.classList.add('dragging');
  });

  // Drag End
  boardEl.addEventListener('dragend', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const checkerEl = target.closest('.checker');
    if (checkerEl) {
      checkerEl.classList.remove('dragging');
    }
    draggedFromIndex = null;
    clearDropTargetHighlights();
  });

  // Drag Over
  boardEl.addEventListener('dragover', (e) => {
    e.preventDefault(); // Required to allow drop
    const dragEvt = /** @type {DragEvent} */ (e);
    if (dragEvt.dataTransfer) {
      dragEvt.dataTransfer.dropEffect = 'move';
    }
  });

  // Drag Enter (hover-highlight handling)
  boardEl.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (!state.showHoverHighlights) return;

    const targetPointEl = /** @type {HTMLElement} */ (e.target)
      .closest('[data-point-index]');
    if (targetPointEl) {
      targetPointEl.classList.add('drag-over');
    }
  });

  // Drag Leave (hover-highlight handling)
  boardEl.addEventListener('dragleave', (e) => {
    const targetPointEl = /** @type {HTMLElement} */ (e.target)
      .closest('[data-point-index]');
    if (targetPointEl) {
      targetPointEl.classList.remove('drag-over');
    }
  });

  // Drop
  boardEl.addEventListener('drop', (e) => {
    e.preventDefault();
    clearDropTargetHighlights();

    const targetPointEl = /** @type {HTMLElement | null} */ (
      /** @type {HTMLElement} */ (e.target).closest('[data-point-index]')
    );

    // console.log('Drop target:', targetPointEl, 'From:', draggedFromIndex);  // DEBUG

    if (!targetPointEl) return;

    const toAttr = targetPointEl.dataset.pointIndex;
    if (toAttr === undefined) return;

    const toIndex = toAttr === 'off' ? 'off' : parseInt(toAttr, 10);
    const fromIndex = draggedFromIndex;

    if (fromIndex !== null && toIndex !== null) {
      executeMove(fromIndex, toIndex);
    }
  });

  // ------------------------------------------------
  // Hover Effect Listener (dwell / highlight option)
  // ------------------------------------------------
  boardEl.addEventListener('mousemove', (e) => {
    if (!state.showHoverHighlights) return;

    const targetPointEl = /** @type {HTMLElement} */ (e.target)
      .closest('[data-point-index]');
    if (!targetPointEl) {
      clearHoverHighlights();
    }
  });

  boardEl.addEventListener('mouseleave', () => {
    if (state.showHoverHighlights) {
      clearHoverHighlights();
    }
  });
}

/**
 * Remove drag-over classes from points and zones
 */
function clearDropTargetHighlights() {
  document.querySelectorAll('.drag-over').forEach((el) => {
    el.classList.remove('drag-over');
  });
}