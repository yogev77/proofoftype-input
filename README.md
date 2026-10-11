# Proof of Type Input

**A text box that proves a human typed it, not AI.**

Add one script tag, and the comments, posts, reviews or articles on your site come with proof that a real person typed them: signed in to [Proof of Type](https://www.proofoftype.com), typed letter by letter (no paste, no AI-generated text), and confirmed on their phone with Face ID or a fingerprint. Your server gets the text plus a signed proof token that you, or anyone, can verify.

- **Live demo and docs:** https://www.proofoftype.com/developers
- **API reference:** https://www.proofoftype.com/developers/api
- **For AI assistants:** https://www.proofoftype.com/llms.txt

```html
<script src="https://www.proofoftype.com/sdk/v1.js" async></script>

<form method="post" action="/comments">
  <div data-proofoftype data-name="comment" data-placeholder="Write a comment"></div>
  <button>Post</button>
</form>
```

When the form is submitted, the person confirms on their phone, then your server receives:

| Field | What |
|---|---|
| `comment` | the text, exactly as typed |
| `comment_proof` | the proof token (an EdDSA-signed JWT) |

## Build it with your AI coding agent (MCP)

Vibe coding a site? Connect the Proof of Type MCP server and ask your agent for "a comment box that proves a human typed it".

```sh
claude mcp add --transport http proofoftype https://www.proofoftype.com/mcp
```

Other clients (Cursor, VS Code, …):

```json
{ "mcpServers": { "proofoftype": { "url": "https://www.proofoftype.com/mcp" } } }
```

Tools: `get_quickstart(framework)`, `verify_proof(token, text, origin)`, `explain(topic)`.

## Why

AI-generated text is now free and endless, and AI detectors can only guess from the finished words, so they're wrong both ways. Proof of Type doesn't guess. It proves **how** the text was made:

1. The person types in our input, key by key. It runs in a secure frame from proofoftype.com, so the host page, extensions or scripts can't fake keystrokes.
2. The typing is timed on our server (it can't be instant or replayed) and scored for human rhythm.
3. The person approves the exact text on their phone in the Proof of Type app, with Face ID or a fingerprint. The phone's hardware vouches for the app (Apple App Attest, Android key attestation). A script can't do this step.

Pasted or generated text never gets a proof.

## Verify on your server

Always check the proof before you save the text. Accept it only if it's valid, matches the text, and was made on your site.

```js
import { verifyProof } from 'proofoftype-input/server';

const r = await verifyProof({
  token: req.body.comment_proof,
  text: req.body.comment,
  origin: 'https://your-site.com',
});
if (!r.ok) return res.status(400).send('Please type your comment in the box.');
// r.proof.author: the Proof of Type username who typed it
```

Or call the API directly (no key needed):

```sh
curl -s https://www.proofoftype.com/api/v1/verify \
  -H 'Content-Type: application/json' \
  -d '{"token":"<comment_proof>","text":"<comment>","origin":"https://your-site.com"}'
```

```json
{ "valid": true, "text_matches": true, "origin_matches": true,
  "proof": { "id": "pot_…", "author": "yogev", "origin": "https://your-site.com",
             "typed_at": "2026-10-11T18:20:31.000Z", "score": 87, "words": 6, "text_sha256": "…" } }
```

### Offline verification

Proof tokens are JWTs signed with EdDSA (Ed25519). Public keys: `https://www.proofoftype.com/.well-known/jwks.json`.

```js
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createHash } from 'node:crypto';

const JWKS = createRemoteJWKSet(new URL('https://www.proofoftype.com/.well-known/jwks.json'));
const { payload } = await jwtVerify(token, JWKS, {
  issuer: 'https://www.proofoftype.com',
  audience: 'https://your-site.com',
});
if (payload.text_sha256 !== createHash('sha256').update(text, 'utf8').digest('hex')) throw new Error('Not the signed text');
```

| Claim | What |
|---|---|
| `iss` | `https://www.proofoftype.com` |
| `sub` | proof id (`pot_…`) |
| `aud` | the site it was typed on |
| `iat` | when it was verified |
| `typed_by` | `"human"` |
| `author` | Proof of Type username |
| `signed_on` | `"ios"` or `"android"` |
| `text_sha256` | SHA-256 (hex) of the exact UTF-8 text |
| `score`, `wpm`, `words`, `chars` | human score (0–100), typing speed, length |

## JavaScript API

```js
const input = ProofOfType.mount('#editor', {
  placeholder: 'Write your article…',
  maxWords: 2000,
  button: false,            // verify from your own button
});
input.on('change', ({ words }) => {});
const proof = await input.verify();   // { text, html, token, author, score, url, … }
```

Options: `name`, `placeholder`, `maxWords` (10–3000), `theme` (`auto` | `light` | `dark`), `button`, `buttonLabel`, `form`. The same options work as `data-` attributes (`data-max-words`, `data-button-label`, …).

Events: `ready`, `signin`, `change`, `verified`, `error`, `resize`, also dispatched on the element as DOM events (`proofoftype:verified`).

## React

```jsx
import { HumanInput } from 'proofoftype-input/react';

<HumanInput placeholder="Write a comment" onVerified={(r) => save(r.text, r.token)} />
```

## Privacy

- Proof of Type never stores the text typed on your site. Only its SHA-256 is signed into the proof.
- Keystrokes are checked and discarded. The text reaches your page only once it's verified, and only your page's real origin.
- Your site gets the person's Proof of Type username, never their email or account.
- Each proof is single-use: one typing session, one phone signature, one proof.

## What's open source

This repository: the browser SDK, the React component, the server helper, types and examples (MIT). The checks themselves (keystroke capture, typing timeline, phone signatures) run on Proof of Type, where the host page can't change them. That's what makes the proof worth something.

## FAQ

**How do I know a comment on my site was written by a human and not AI?** Use this input as the text box and verify the proof on your server. A proof only exists when a signed-in person typed the text in the input and approved it on their phone.

**Is this an AI detector?** No. It proves the process (typed, timed, signed by a person) instead of guessing from the text.

**Do my users need an account?** Yes: a free Proof of Type account and the Proof of Type app (iPhone or Android). Signing in is one popup; each proof is one Face ID or fingerprint.

**Can people paste?** Only links. Autocorrect of typed words is allowed; predictive text, swipe and dictation are not.

**What does it cost?** Free for humans.

## Links

- Docs: https://www.proofoftype.com/developers
- API: https://www.proofoftype.com/developers/api
- OpenAPI: https://www.proofoftype.com/openapi.json
- Changelog: https://www.proofoftype.com/developers/changelog
- Proof of Type: https://www.proofoftype.com

MIT © Proof of Type
