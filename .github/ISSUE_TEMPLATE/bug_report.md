---
name: Bug Report
about: Create a report to help us improve Not an AI
title: '[BUG]: '
labels: ['bug', 'triage']
assignees: ''
---

## Description
A clear and concise description of what the bug is.

## Query / Step to Reproduce
1. Start application with `npm start`
2. Submit query: `...`
3. Observed Response: `...`
4. Expected Response: `...`

## Pipeline Trace / Explanation Output
<!-- If available, open the Transparency Drawer by clicking "Why this answer?" and paste the trace JSON below -->
```json
{
  "strategy": "...",
  "confidence": 0.0,
  "matchedKeywords": []
}
```

## Environment
- Node.js Version: (e.g. 20.x LTS)
- OS: (e.g. macOS 14 / Ubuntu 22.04 / Windows 11)
- Browser: (e.g. Chrome 128, Safari, Firefox)
- Storage Mode: Local-first / Firestore dual-mode

## Additional Context
Add any other context about the problem here. Remember: Not an AI strictly avoids external LLMs, so responses are produced deterministically via local NLP and stored verified knowledge.
