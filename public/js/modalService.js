/**
 * ModalService
 * Production-quality, enterprise-grade dialog, modal, and toast notification system.
 * Replaces native browser confirm(), prompt(), and alert() with custom, beautiful glassmorphic UI.
 */
(function(window) {
  'use strict';

  // Ensure toast container exists
  function getToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const ModalService = {
    /**
     * Show a beautiful confirmation modal
     * @param {Object} options
     * @returns {Promise<boolean>}
     */
    confirm(options = {}) {
      return new Promise((resolve) => {
        const {
          title = 'Are you sure?',
          message = 'Please confirm this action.',
          confirmText = 'Confirm',
          cancelText = 'Cancel',
          type = 'danger', // 'danger' | 'warning' | 'info'
          icon = null
        } = options;

        const defaultIcon = type === 'danger' ? '⚠️' : (type === 'warning' ? '🔔' : 'ℹ️');
        const displayIcon = icon || defaultIcon;

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-service-backdrop';
        backdrop.innerHTML = `
          <div class="modal-service-card modal-${type}" role="dialog" aria-modal="true">
            <div class="modal-service-header">
              <div class="modal-service-badge modal-badge-${type}">${displayIcon}</div>
              <div class="modal-service-title-wrap">
                <h3 class="modal-service-title">${escapeHtml(title)}</h3>
              </div>
              <button class="modal-service-close" aria-label="Close modal">&times;</button>
            </div>
            <div class="modal-service-body">
              <div class="modal-service-message">${escapeHtml(message)}</div>
            </div>
            <div class="modal-service-footer">
              <button class="btn btn-secondary btn-cancel">${escapeHtml(cancelText)}</button>
              <button class="btn btn-${type === 'danger' ? 'danger' : 'primary'} btn-confirm">${escapeHtml(confirmText)}</button>
            </div>
          </div>
        `;

        document.body.appendChild(backdrop);

        // Trigger entrance animation
        requestAnimationFrame(() => {
          backdrop.classList.add('visible');
          const card = backdrop.querySelector('.modal-service-card');
          if (card) card.classList.add('visible');
          const confirmBtn = backdrop.querySelector('.btn-confirm');
          if (confirmBtn) confirmBtn.focus();
        });

        function cleanup(result) {
          backdrop.classList.remove('visible');
          const card = backdrop.querySelector('.modal-service-card');
          if (card) card.classList.remove('visible');
          setTimeout(() => {
            if (backdrop.parentNode) {
              backdrop.parentNode.removeChild(backdrop);
            }
          }, 240);
          document.removeEventListener('keydown', onKeyDown);
          resolve(result);
        }

        function onKeyDown(e) {
          if (e.key === 'Escape') {
            e.preventDefault();
            cleanup(false);
          } else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            cleanup(true);
          }
        }

        document.addEventListener('keydown', onKeyDown);

        backdrop.querySelector('.btn-cancel').addEventListener('click', () => cleanup(false));
        backdrop.querySelector('.modal-service-close').addEventListener('click', () => cleanup(false));
        backdrop.querySelector('.btn-confirm').addEventListener('click', () => cleanup(true));

        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) {
            cleanup(false);
          }
        });
      });
    },

    /**
     * Show custom Feedback modal for corrections
     * @param {Object} options
     * @returns {Promise<{ rating: string, reason: string, correction: string }|null>}
     */
    feedback(options = {}) {
      return new Promise((resolve) => {
        const {
          messageId = '',
          recordId = '',
          defaultCorrection = ''
        } = options;

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-service-backdrop';
        backdrop.innerHTML = `
          <div class="modal-service-card modal-feedback-card" role="dialog" aria-modal="true">
            <div class="modal-service-header">
              <div class="modal-service-badge modal-badge-warning">💡</div>
              <div class="modal-service-title-wrap">
                <h3 class="modal-service-title">Help Train Not an AI</h3>
                <p class="modal-service-subtitle">Your correction directly improves our local knowledge models.</p>
              </div>
              <button class="modal-service-close" aria-label="Close modal">&times;</button>
            </div>
            <div class="modal-service-body">
              <label class="modal-service-label">What was the issue with this response?</label>
              <div class="feedback-chips-grid">
                <button type="button" class="feedback-chip active" data-reason="Factually Inaccurate">
                  <span>❌</span> Factually Inaccurate
                </button>
                <button type="button" class="feedback-chip" data-reason="Outdated Information">
                  <span>⏳</span> Outdated Info
                </button>
                <button type="button" class="feedback-chip" data-reason="Incomplete Answer">
                  <span>🧩</span> Incomplete
                </button>
                <button type="button" class="feedback-chip" data-reason="Irrelevant Topic">
                  <span>🔀</span> Irrelevant
                </button>
              </div>

              <div class="form-group mt-3">
                <label for="feedback-correction-input" class="modal-service-label">
                  What is the verified factual answer? (Optional)
                </label>
                <textarea
                  id="feedback-correction-input"
                  class="modal-service-textarea"
                  rows="3"
                  placeholder="Provide the correct fact or source (e.g., European swallows fly at ~11 m/s)..."
                >${escapeHtml(defaultCorrection)}</textarea>
                <div class="modal-service-hint">
                  Submitted corrections undergo deterministic verification before expanding the knowledge graph.
                </div>
              </div>
            </div>
            <div class="modal-service-footer">
              <button class="btn btn-secondary btn-cancel">Cancel</button>
              <button class="btn btn-primary btn-submit-feedback">
                <span>Submit Feedback</span>
              </button>
            </div>
          </div>
        `;

        document.body.appendChild(backdrop);

        let selectedReason = 'Factually Inaccurate';
        const chips = backdrop.querySelectorAll('.feedback-chip');
        chips.forEach(chip => {
          chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedReason = chip.getAttribute('data-reason');
          });
        });

        // Trigger entrance animation
        requestAnimationFrame(() => {
          backdrop.classList.add('visible');
          const card = backdrop.querySelector('.modal-service-card');
          if (card) card.classList.add('visible');
          const textarea = backdrop.querySelector('#feedback-correction-input');
          if (textarea) textarea.focus();
        });

        function cleanup(data) {
          backdrop.classList.remove('visible');
          const card = backdrop.querySelector('.modal-service-card');
          if (card) card.classList.remove('visible');
          setTimeout(() => {
            if (backdrop.parentNode) {
              backdrop.parentNode.removeChild(backdrop);
            }
          }, 240);
          document.removeEventListener('keydown', onKeyDown);
          resolve(data);
        }

        function onKeyDown(e) {
          if (e.key === 'Escape') {
            e.preventDefault();
            cleanup(null);
          }
        }

        document.addEventListener('keydown', onKeyDown);

        backdrop.querySelector('.btn-cancel').addEventListener('click', () => cleanup(null));
        backdrop.querySelector('.modal-service-close').addEventListener('click', () => cleanup(null));

        backdrop.querySelector('.btn-submit-feedback').addEventListener('click', () => {
          const textarea = backdrop.querySelector('#feedback-correction-input');
          const correction = textarea ? textarea.value.trim() : '';
          cleanup({
            rating: 'negative',
            reason: selectedReason,
            correction: correction || null,
            messageId,
            recordId
          });
        });

        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) {
            cleanup(null);
          }
        });
      });
    },

    /**
     * Show custom Prompt modal
     * @param {Object} options
     * @returns {Promise<string|null>}
     */
    prompt(options = {}) {
      return new Promise((resolve) => {
        const {
          title = 'Input Required',
          message = 'Please enter a value:',
          placeholder = '',
          defaultValue = '',
          confirmText = 'OK',
          cancelText = 'Cancel',
          multiline = false
        } = options;

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-service-backdrop';
        backdrop.innerHTML = `
          <div class="modal-service-card" role="dialog" aria-modal="true">
            <div class="modal-service-header">
              <div class="modal-service-badge modal-badge-info">💬</div>
              <div class="modal-service-title-wrap">
                <h3 class="modal-service-title">${escapeHtml(title)}</h3>
              </div>
              <button class="modal-service-close" aria-label="Close modal">&times;</button>
            </div>
            <div class="modal-service-body">
              <div class="modal-service-message mb-3">${escapeHtml(message)}</div>
              ${
                multiline
                  ? `<textarea id="modal-prompt-input" class="modal-service-textarea" rows="3" placeholder="${escapeHtml(placeholder)}">${escapeHtml(defaultValue)}</textarea>`
                  : `<input type="text" id="modal-prompt-input" class="modal-service-input" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(defaultValue)}">`
              }
            </div>
            <div class="modal-service-footer">
              <button class="btn btn-secondary btn-cancel">${escapeHtml(cancelText)}</button>
              <button class="btn btn-primary btn-confirm">${escapeHtml(confirmText)}</button>
            </div>
          </div>
        `;

        document.body.appendChild(backdrop);

        requestAnimationFrame(() => {
          backdrop.classList.add('visible');
          const card = backdrop.querySelector('.modal-service-card');
          if (card) card.classList.add('visible');
          const input = backdrop.querySelector('#modal-prompt-input');
          if (input) {
            input.focus();
            input.select();
          }
        });

        function cleanup(val) {
          backdrop.classList.remove('visible');
          const card = backdrop.querySelector('.modal-service-card');
          if (card) card.classList.remove('visible');
          setTimeout(() => {
            if (backdrop.parentNode) {
              backdrop.parentNode.removeChild(backdrop);
            }
          }, 240);
          document.removeEventListener('keydown', onKeyDown);
          resolve(val);
        }

        function onKeyDown(e) {
          if (e.key === 'Escape') {
            e.preventDefault();
            cleanup(null);
          } else if (e.key === 'Enter' && !multiline) {
            e.preventDefault();
            const input = backdrop.querySelector('#modal-prompt-input');
            cleanup(input ? input.value : '');
          }
        }

        document.addEventListener('keydown', onKeyDown);

        backdrop.querySelector('.btn-cancel').addEventListener('click', () => cleanup(null));
        backdrop.querySelector('.modal-service-close').addEventListener('click', () => cleanup(null));
        backdrop.querySelector('.btn-confirm').addEventListener('click', () => {
          const input = backdrop.querySelector('#modal-prompt-input');
          cleanup(input ? input.value : '');
        });

        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) {
            cleanup(null);
          }
        });
      });
    },

    /**
     * Show custom Alert modal
     * @param {Object} options
     * @returns {Promise<void>}
     */
    alert(options = {}) {
      return new Promise((resolve) => {
        const {
          title = 'Notice',
          message = '',
          buttonText = 'Understood',
          type = 'info'
        } = typeof options === 'string' ? { message: options } : options;

        const icon = type === 'danger' ? '❌' : (type === 'success' ? '✅' : 'ℹ️');

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-service-backdrop';
        backdrop.innerHTML = `
          <div class="modal-service-card modal-${type}" role="dialog" aria-modal="true">
            <div class="modal-service-header">
              <div class="modal-service-badge modal-badge-${type}">${icon}</div>
              <div class="modal-service-title-wrap">
                <h3 class="modal-service-title">${escapeHtml(title)}</h3>
              </div>
              <button class="modal-service-close" aria-label="Close modal">&times;</button>
            </div>
            <div class="modal-service-body">
              <div class="modal-service-message">${escapeHtml(message)}</div>
            </div>
            <div class="modal-service-footer">
              <button class="btn btn-primary btn-confirm">${escapeHtml(buttonText)}</button>
            </div>
          </div>
        `;

        document.body.appendChild(backdrop);

        requestAnimationFrame(() => {
          backdrop.classList.add('visible');
          const card = backdrop.querySelector('.modal-service-card');
          if (card) card.classList.add('visible');
          const confirmBtn = backdrop.querySelector('.btn-confirm');
          if (confirmBtn) confirmBtn.focus();
        });

        function cleanup() {
          backdrop.classList.remove('visible');
          const card = backdrop.querySelector('.modal-service-card');
          if (card) card.classList.remove('visible');
          setTimeout(() => {
            if (backdrop.parentNode) {
              backdrop.parentNode.removeChild(backdrop);
            }
          }, 240);
          document.removeEventListener('keydown', onKeyDown);
          resolve();
        }

        function onKeyDown(e) {
          if (e.key === 'Escape' || e.key === 'Enter') {
            e.preventDefault();
            cleanup();
          }
        }

        document.addEventListener('keydown', onKeyDown);

        backdrop.querySelector('.modal-service-close').addEventListener('click', cleanup);
        backdrop.querySelector('.btn-confirm').addEventListener('click', cleanup);

        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) {
            cleanup();
          }
        });
      });
    },

    /**
     * Show a beautiful floating Toast notification
     * @param {Object} options
     */
    toast(options = {}) {
      const {
        title = '',
        message = '',
        type = 'info', // 'success' | 'info' | 'warning' | 'danger'
        duration = 3800
      } = typeof options === 'string' ? { message: options } : options;

      const container = getToastContainer();
      const toast = document.createElement('div');
      toast.className = `toast-item toast-${type}`;

      const icon = type === 'success' ? '✅' : (type === 'danger' ? '❌' : (type === 'warning' ? '🔔' : 'ℹ️'));

      toast.innerHTML = `
        <div class="toast-content-wrapper">
          <span class="toast-icon">${icon}</span>
          <div class="toast-text-wrap">
            ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
            <div class="toast-message">${escapeHtml(message)}</div>
          </div>
          <button class="toast-close" aria-label="Dismiss">&times;</button>
        </div>
        <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
      `;

      container.appendChild(toast);

      let timer = null;

      function dismiss() {
        if (timer) clearTimeout(timer);
        toast.classList.add('toast-exit');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 250);
      }

      toast.querySelector('.toast-close').addEventListener('click', dismiss);
      timer = setTimeout(dismiss, duration);
    }
  };

  window.ModalService = ModalService;
})(window);
