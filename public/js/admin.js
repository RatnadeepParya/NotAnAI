'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Rebuild BM25 index button
  const btnRebuildIndex = document.getElementById('btn-rebuild-index');
  if (btnRebuildIndex) {
    btnRebuildIndex.addEventListener('click', async () => {
      btnRebuildIndex.disabled = true;
      btnRebuildIndex.textContent = 'Rebuilding...';
      try {
        const res = await fetch('/admin/index/rebuild', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          if (window.ModalService) {
            window.ModalService.toast({
              title: 'Index Rebuilt',
              message: `Inverted Index rebuilt successfully! ${data.indexedDocs} records indexed.`,
              type: 'success'
            });
          } else {
            alert(`Inverted Index rebuilt successfully! ${data.indexedDocs} records indexed.`);
          }
        }
      } catch (err) {
        if (window.ModalService) {
          window.ModalService.toast({ title: 'Rebuild Error', message: err.message, type: 'danger' });
        } else {
          alert('Error rebuilding index: ' + err.message);
        }
      } finally {
        btnRebuildIndex.disabled = false;
        btnRebuildIndex.textContent = 'Rebuild BM25 Index';
      }
    });
  }

  // Trigger sync queue flush
  const btnTriggerSync = document.getElementById('btn-trigger-sync');
  if (btnTriggerSync) {
    btnTriggerSync.addEventListener('click', async () => {
      btnTriggerSync.disabled = true;
      try {
        const res = await fetch('/api/sync/trigger', { method: 'POST' });
        const data = await res.json();
        if (window.ModalService) {
          window.ModalService.toast({
            title: 'Sync Triggered',
            message: `Processed: ${data.processed}, Remaining: ${data.remaining}`,
            type: 'info'
          });
        }
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        if (window.ModalService) {
          window.ModalService.toast({ title: 'Sync Error', message: err.message, type: 'danger' });
        } else {
          alert('Sync error: ' + err.message);
        }
      } finally {
        btnTriggerSync.disabled = false;
      }
    });
  }

  // Add Knowledge Record Modal
  const btnAddKnowledge = document.getElementById('btn-add-knowledge');
  const knowledgeModal = document.getElementById('knowledge-modal');
  const knowledgeForm = document.getElementById('knowledge-form');

  if (btnAddKnowledge && knowledgeModal) {
    btnAddKnowledge.addEventListener('click', () => {
      knowledgeModal.classList.remove('hidden');
    });

    if (knowledgeForm) {
      knowledgeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById('k-title').value.trim(),
          domain: document.getElementById('k-domain').value,
          topic: document.getElementById('k-topic').value.trim(),
          questionPatterns: document.getElementById('k-patterns').value.trim(),
          answer: document.getElementById('k-answer').value.trim(),
          keywords: document.getElementById('k-keywords').value.trim()
        };

        try {
          const res = await fetch('/admin/knowledge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            if (window.ModalService) {
              window.ModalService.toast({
                title: 'Record Saved',
                message: 'Knowledge record created and inverted index updated!',
                type: 'success'
              });
            }
            setTimeout(() => window.location.reload(), 900);
          } else {
            if (window.ModalService) {
              window.ModalService.toast({ title: 'Validation Error', message: data.error, type: 'danger' });
            } else {
              alert('Error: ' + data.error);
            }
          }
        } catch (err) {
          if (window.ModalService) {
            window.ModalService.toast({ title: 'Save Failed', message: err.message, type: 'danger' });
          } else {
            alert('Failed to save record: ' + err.message);
          }
        }
      });
    }
  }

  // Delete Knowledge Record
  document.querySelectorAll('.btn-delete-knowledge').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      let confirmed = true;
      if (window.ModalService) {
        confirmed = await window.ModalService.confirm({
          title: 'Delete Knowledge Record?',
          message: `Permanently remove knowledge record ${id} from local disk, index, and cloud databases?`,
          confirmText: 'Delete Record',
          cancelText: 'Cancel',
          type: 'danger',
          icon: '🗑️'
        });
      } else {
        confirmed = confirm(`Delete knowledge record ${id}?`);
      }

      if (confirmed) {
        const res = await fetch(`/admin/knowledge/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          const row = document.querySelector(`tr[data-record-id="${id}"]`);
          if (row) row.remove();
          if (window.ModalService) {
            window.ModalService.toast({
              title: 'Record Deleted',
              message: `Record ${id} removed and index refreshed.`,
              type: 'info'
            });
          }
        }
      }
    });
  });

  // Review Candidate Buttons
  document.querySelectorAll('.btn-review').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const decision = btn.getAttribute('data-decision');

      let notes = '';
      if (window.ModalService) {
        notes = await window.ModalService.prompt({
          title: `Candidate ${decision.toUpperCase()}`,
          message: `Enter optional reviewer notes for marking candidate ${id} as ${decision}:`,
          placeholder: 'e.g., Verified against official documentation...',
          confirmText: 'Submit Review',
          cancelText: 'Cancel'
        });
        if (notes === null) return; // User cancelled
      } else {
        notes = prompt(`Optional reviewer notes for ${decision}:`) || '';
      }

      const res = await fetch(`/admin/candidates/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes })
      });
      const data = await res.json();
      if (data.success) {
        if (window.ModalService) {
          window.ModalService.toast({
            title: 'Review Completed',
            message: `Candidate ${id} marked as ${decision}!`,
            type: 'success'
          });
        }
        setTimeout(() => window.location.reload(), 900);
      } else {
        if (window.ModalService) {
          window.ModalService.toast({ title: 'Review Error', message: data.error, type: 'danger' });
        } else {
          alert('Review error: ' + data.error);
        }
      }
    });
  });

  // Add Relationship Modal
  const btnAddRel = document.getElementById('btn-add-relationship');
  const relModal = document.getElementById('relationship-modal');
  const relForm = document.getElementById('relationship-form');

  if (btnAddRel && relModal) {
    btnAddRel.addEventListener('click', () => {
      relModal.classList.remove('hidden');
    });

    if (relForm) {
      relForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          source: document.getElementById('rel-source').value.trim(),
          relation: document.getElementById('rel-relation').value,
          target: document.getElementById('rel-target').value.trim()
        };

        const res = await fetch('/admin/graph/relationship', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          if (window.ModalService) {
            window.ModalService.toast({
              title: 'Graph Updated',
              message: `Relationship (${payload.source} -> ${payload.relation} -> ${payload.target}) added!`,
              type: 'success'
            });
          }
          setTimeout(() => window.location.reload(), 900);
        } else {
          if (window.ModalService) {
            window.ModalService.toast({ title: 'Graph Error', message: data.error, type: 'danger' });
          } else {
            alert('Error: ' + data.error);
          }
        }
      });
    }
  }

  // Evaluation Benchmark Suite Trigger
  const btnRunEval = document.getElementById('btn-run-eval-suite');
  const evalLoading = document.getElementById('eval-loading');
  const evalPlaceholder = document.getElementById('eval-placeholder');
  const evalResultsContainer = document.getElementById('eval-results-container');

  if (btnRunEval) {
    btnRunEval.addEventListener('click', async () => {
      btnRunEval.disabled = true;
      if (evalPlaceholder) evalPlaceholder.classList.add('hidden');
      if (evalResultsContainer) evalResultsContainer.classList.add('hidden');
      if (evalLoading) evalLoading.classList.remove('hidden');

      try {
        const res = await fetch('/admin/evaluation/run', { method: 'POST' });
        const data = await res.json();

        if (evalLoading) evalLoading.classList.add('hidden');

        if (data.success && data.results) {
          const r = data.results;
          if (evalResultsContainer) evalResultsContainer.classList.remove('hidden');

          document.getElementById('res-top1').textContent = `${(r.retrieval.top1Accuracy * 100).toFixed(1)}%`;
          document.getElementById('res-mrr').textContent = r.retrieval.mrr.toFixed(3);
          document.getElementById('res-intent').textContent = `${(r.intentAccuracy * 100).toFixed(1)}%`;
          document.getElementById('res-latency').textContent = `${r.avgLatencyMs}ms`;

          document.getElementById('eval-raw-json').textContent = JSON.stringify(r, null, 2);

          if (window.ModalService) {
            window.ModalService.toast({
              title: 'Benchmark Complete',
              message: `Top-1 Accuracy: ${(r.retrieval.top1Accuracy * 100).toFixed(0)}%, Latency: ${r.avgLatencyMs}ms`,
              type: 'success'
            });
          }
        } else {
          if (window.ModalService) {
            window.ModalService.toast({ title: 'Evaluation Error', message: data.error || 'Unknown error', type: 'danger' });
          } else {
            alert('Evaluation error: ' + (data.error || 'Unknown error'));
          }
        }
      } catch (err) {
        if (evalLoading) evalLoading.classList.add('hidden');
        if (window.ModalService) {
          window.ModalService.toast({ title: 'Benchmark Failed', message: err.message, type: 'danger' });
        } else {
          alert('Failed to run evaluation benchmark: ' + err.message);
        }
      } finally {
        btnRunEval.disabled = false;
      }
    });
  }
});
