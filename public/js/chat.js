'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const queryInput = document.getElementById('query-input');
  const chatMessages = document.getElementById('chat-messages');
  const conversationIdInput = document.getElementById('conversation-id');
  const processingIndicator = document.getElementById('processing-indicator');
  const processingStatusText = document.getElementById('processing-status-text');
  const welcomeHero = document.getElementById('welcome-hero');

  // Modals
  const explainModal = document.getElementById('explain-modal');
  const explainModalContent = document.getElementById('explain-modal-content');
  const memoriesModal = document.getElementById('memories-modal');
  const userMemoriesList = document.getElementById('user-memories-list');

  // Theme Toggle
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const currentTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme');
      const next = active === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  // Sidebar Toggle
  const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
  const sidebar = document.getElementById('app-sidebar');
  if (toggleSidebarBtn && sidebar) {
    toggleSidebarBtn.addEventListener('click', () => {
      sidebar.classList.toggle('hidden');
    });
  }

  // Auto-resize composer textarea
  if (queryInput) {
    queryInput.addEventListener('input', () => {
      queryInput.style.height = 'auto';
      queryInput.style.height = Math.min(queryInput.scrollHeight, 120) + 'px';
    });

    queryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (queryInput.value.trim()) {
          chatForm.dispatchEvent(new Event('submit'));
        }
      }
    });
  }

  // Sample card click handlers
  document.querySelectorAll('.sample-card').forEach(card => {
    card.addEventListener('click', () => {
      const query = card.getAttribute('data-query');
      if (query && queryInput) {
        queryInput.value = query;
        chatForm.dispatchEvent(new Event('submit'));
      }
    });
  });

  // Modal Close Handlers
  document.querySelectorAll('.modal-close-btn, .modal-backdrop').forEach(el => {
    el.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) modal.classList.add('hidden');
    });
  });

  // Copy button handler delegation
  document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn) {
      const text = copyBtn.getAttribute('data-text');
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          const original = copyBtn.innerHTML;
          copyBtn.innerHTML = '<span>Copied!</span>';
          setTimeout(() => { copyBtn.innerHTML = original; }, 1500);
        });
      }
    }

    // Explain button handler delegation
    const explainBtn = e.target.closest('.explain-btn');
    if (explainBtn) {
      const raw = explainBtn.getAttribute('data-explanation');
      if (raw && explainModal && explainModalContent) {
        try {
          const exp = JSON.parse(raw);
          explainModalContent.innerHTML = formatExplanationHtml(exp);
          explainModal.classList.remove('hidden');
        } catch (err) {
          console.error('Error parsing explanation:', err);
        }
      }
    }

    // Feedback button handler delegation
    const feedbackBtn = e.target.closest('.feedback-btn');
    if (feedbackBtn) {
      const rating = feedbackBtn.getAttribute('data-rating');
      const msgId = feedbackBtn.getAttribute('data-msg-id');
      const recId = feedbackBtn.getAttribute('data-record-id');

      if (rating === 'negative') {
        const handleNegativeFeedback = async () => {
          let feedbackData = null;
          if (window.ModalService) {
            feedbackData = await window.ModalService.feedback({ messageId: msgId, recordId: recId });
            if (!feedbackData) return; // User cancelled
          } else {
            const rawCorr = prompt('Thank you for your feedback! If this answer was inaccurate, what is the correct factual answer?');
            if (rawCorr === null) return;
            feedbackData = { rating: 'negative', reason: 'Factually Inaccurate', correction: rawCorr };
          }

          try {
            const res = await fetch('/api/feedback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messageId: msgId,
                knowledgeId: recId,
                rating: 'negative',
                reason: feedbackData.reason,
                correction: feedbackData.correction
              })
            }).then(r => r.json());

            if (res.success) {
              feedbackBtn.style.opacity = '0.5';
              feedbackBtn.disabled = true;
              if (window.ModalService) {
                window.ModalService.toast({
                  title: 'Feedback Recorded',
                  message: 'Thank you! Your correction has been submitted to the self-training pipeline.',
                  type: 'success'
                });
              } else {
                alert('Feedback submitted. Thank you for helping improve Not an AI!');
              }
            }
          } catch (err) {
            if (window.ModalService) {
              window.ModalService.toast({
                title: 'Submission Error',
                message: 'Failed to record feedback: ' + err.message,
                type: 'danger'
              });
            }
          }
        };
        handleNegativeFeedback();
      } else {
        // Positive feedback (thumbs up)
        fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: msgId,
            knowledgeId: recId,
            rating: 'positive'
          })
        }).then(r => r.json()).then(res => {
          if (res.success) {
            feedbackBtn.style.opacity = '0.5';
            feedbackBtn.disabled = true;
            if (window.ModalService) {
              window.ModalService.toast({
                title: 'Rating Saved',
                message: 'Thank you! Positive feedback helps tune deterministic retrieval precision.',
                type: 'success'
              });
            }
          }
        }).catch(err => {
          if (window.ModalService) {
            window.ModalService.toast({
              title: 'Error',
              message: err.message,
              type: 'danger'
            });
          }
        });
      }
    }
  });

  // Saved Memories Modal Handler
  const btnShowMemories = document.getElementById('btn-show-memories');
  if (btnShowMemories) {
    btnShowMemories.addEventListener('click', (e) => {
      e.preventDefault();
      loadUserMemories();
      memoriesModal.classList.remove('hidden');
    });
  }

  function loadUserMemories() {
    if (!userMemoriesList) return;
    fetch('/api/memory')
      .then(r => r.json())
      .then(data => {
        if (!data.memories || data.memories.length === 0) {
          userMemoriesList.innerHTML = '<div class="text-muted text-center p-3">No personal memories saved yet.</div>';
          return;
        }
        userMemoriesList.innerHTML = data.memories.map(m => `
          <div class="memory-item info-row">
            <span>${escapeHtml(m.content)}</span>
            <button class="btn btn-sm btn-danger btn-del-memory" data-id="${m.id}">Delete</button>
          </div>
        `).join('');

        // Attach delete listeners with beautiful confirmation
        document.querySelectorAll('.btn-del-memory').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            let confirmed = true;
            if (window.ModalService) {
              confirmed = await window.ModalService.confirm({
                title: 'Delete Memory?',
                message: 'Remove this personal memory from your local profile?',
                confirmText: 'Delete Memory',
                cancelText: 'Cancel',
                type: 'danger',
                icon: '🗑️'
              });
            } else {
              confirmed = confirm('Delete this memory?');
            }

            if (confirmed) {
              fetch(`/api/memory/${id}`, { method: 'DELETE' })
                .then(() => {
                  loadUserMemories();
                  if (window.ModalService) {
                    window.ModalService.toast({
                      title: 'Memory Deleted',
                      message: 'The selected memory was permanently removed.',
                      type: 'info'
                    });
                  }
                });
            }
          });
        });
      });
  }

  const btnClearMemories = document.getElementById('btn-clear-memories');
  if (btnClearMemories) {
    btnClearMemories.addEventListener('click', async () => {
      let confirmed = false;
      if (window.ModalService) {
        confirmed = await window.ModalService.confirm({
          title: 'Clear Stored Memories?',
          message: 'This will permanently remove all personal facts and conversational preferences remembered from your sessions. This action cannot be reversed.',
          confirmText: 'Yes, Clear All Memories',
          cancelText: 'Cancel',
          type: 'danger',
          icon: '⚠️'
        });
      } else {
        confirmed = confirm('Clear all your stored memories?');
      }

      if (confirmed) {
        fetch('/api/memory/clear-all', { method: 'DELETE' })
          .then(() => {
            loadUserMemories();
            if (window.ModalService) {
              window.ModalService.toast({
                title: 'Memories Cleared',
                message: 'All your stored conversational memories have been deleted.',
                type: 'info'
              });
            }
          });
      }
    });
  }

  const btnExportMemories = document.getElementById('btn-export-memories');
  if (btnExportMemories) {
    btnExportMemories.addEventListener('click', () => {
      window.open('/api/memory/export', '_blank');
    });
  }

  // Handle Chat Form Submit
  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = queryInput.value.trim();
      if (!message) return;

      const conversationId = conversationIdInput ? conversationIdInput.value : '';

      // Clear input
      queryInput.value = '';
      queryInput.style.height = 'auto';

      // Hide welcome hero if visible
      if (welcomeHero) welcomeHero.classList.add('hidden');

      // Append user bubble immediately
      appendMessageBubble('user', message);
      scrollToBottom();

      // Show processing status
      if (processingIndicator) {
        processingIndicator.classList.remove('hidden');
        processingStatusText.textContent = 'Searching local indexes and reasoning...';
      }

      try {
        const response = await fetch('/api/chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, conversationId })
        });

        const data = await response.json();

        if (processingIndicator) {
          processingIndicator.classList.add('hidden');
        }

        if (data.success && data.botMessage) {
          appendMessageBubble('bot', data.botMessage.text, {
            id: data.botMessage.id,
            confidence: data.botMessage.confidence,
            explanation: data.botMessage.explanation,
            recordId: data.botMessage.recordId
          });
          scrollToBottom();
        } else {
          appendMessageBubble('bot', 'An error occurred while retrieving knowledge.');
        }
      } catch (err) {
        if (processingIndicator) processingIndicator.classList.add('hidden');
        appendMessageBubble('bot', 'Network error connecting to local Not an AI server.');
      }
    });
  }

  function appendMessageBubble(sender, text, meta = {}) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${sender}`;
    if (meta.id) bubble.setAttribute('data-message-id', meta.id);

    const avatar = sender === 'user' ? '👤' : '⚡';
    const senderName = sender === 'user' ? 'You' : 'Not an AI';
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let confidenceHtml = '';
    if (sender === 'bot' && typeof meta.confidence === 'number') {
      const level = meta.confidence >= 0.75 ? 'high' : (meta.confidence >= 0.35 ? 'medium' : 'low');
      confidenceHtml = `<span class="confidence-pill ${level}">${Math.round(meta.confidence * 100)}% confidence</span>`;
    }

    let actionsHtml = '';
    if (sender === 'bot') {
      const expJson = meta.explanation ? JSON.stringify(meta.explanation).replace(/'/g, '&#39;') : '';
      actionsHtml = `
        <div class="bubble-actions">
          <button class="action-btn copy-btn" data-text="${escapeHtml(text)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copy</span>
          </button>
          ${meta.explanation ? `<button class="action-btn explain-btn" data-explanation='${expJson}'>Explain</button>` : ''}
          <button class="action-btn feedback-btn" data-rating="positive" data-msg-id="${meta.id || ''}" data-record-id="${meta.recordId || ''}">👍</button>
          <button class="action-btn feedback-btn" data-rating="negative" data-msg-id="${meta.id || ''}" data-record-id="${meta.recordId || ''}">👎</button>
        </div>
      `;
    }

    bubble.innerHTML = `
      <div class="bubble-avatar">${avatar}</div>
      <div class="bubble-content">
        <div class="bubble-header">
          <span class="bubble-sender">${senderName}</span>
          <span class="bubble-time">${timeStr}</span>
          ${confidenceHtml}
        </div>
        <div class="bubble-text">${escapeHtml(text)}</div>
        ${actionsHtml}
      </div>
    `;

    chatMessages.appendChild(bubble);
  }

  function scrollToBottom() {
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  function formatExplanationHtml(exp) {
    let matchedKeywordsStr = (exp.matchedKeywords && exp.matchedKeywords.length > 0)
      ? exp.matchedKeywords.map(k => `<code>${escapeHtml(k)}</code>`).join(' ')
      : 'None';

    return `
      <div class="info-row">
        <strong>Retrieval Strategy:</strong>
        <span>${escapeHtml(exp.strategy || 'Hybrid BM25')}</span>
      </div>
      ${exp.knowledgeId ? `
        <div class="info-row">
          <strong>Knowledge Record ID:</strong>
          <code>${escapeHtml(exp.knowledgeId)}</code>
        </div>
        <div class="info-row">
          <strong>Domain / Topic:</strong>
          <span>${escapeHtml(exp.domain || 'general')} / ${escapeHtml(exp.topic || 'general')}</span>
        </div>
      ` : ''}
      ${typeof exp.confidence === 'number' ? `
        <div class="info-row">
          <strong>Confidence Score:</strong>
          <span>${Math.round(exp.confidence * 100)}%</span>
        </div>
      ` : ''}
      ${exp.supportingPath ? `
        <div class="info-row">
          <strong>Knowledge Graph Path:</strong>
          <code>${escapeHtml(exp.supportingPath)}</code>
        </div>
      ` : ''}
      <div class="info-row">
        <strong>Matched Keywords:</strong>
        <div>${matchedKeywordsStr}</div>
      </div>
      ${exp.pipelineTrace ? `
        <div class="mt-3">
          <strong>Pipeline Instrumentation:</strong>
          <pre class="json-dump mt-2">${JSON.stringify(exp.pipelineTrace.timings, null, 2)}</pre>
        </div>
      ` : ''}
    `;
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
});
