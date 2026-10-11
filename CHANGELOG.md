# Changelog

## 1.1.0 — 2026-10-11
- MCP server for AI coding agents: https://www.proofoftype.com/mcp (get_quickstart, verify_proof, explain).
- A small "Proof of Type" link in the bottom-right corner of every embedded input.

## 1.0.0 — 2026-10-11
- First release: the embeddable input (`sdk/v1.js`), React component, server helper, types and examples.
- Proof tokens: EdDSA-signed JWTs with author, site, time, human score and the text's SHA-256.
- Public API: `POST /api/v1/verify`, keys at `/.well-known/jwks.json`, proof pages at `/v/<token>`.

Full changelog: https://www.proofoftype.com/developers/changelog
