/*!
 * Proof of Type Input — v1.3.0
 * Prove a human typed that. https://www.proofoftype.com/developers
 * MIT License. Source: https://github.com/proofoftype/proofoftype-input
 *
 * Put a text box on your site that proves a person typed what's in it:
 * signed in to Proof of Type, typed letter by letter (no paste, no AI), and
 * signed on their phone. You get the text plus a signed proof token that you
 * (or anyone) can verify.
 *
 *   <script src="https://www.proofoftype.com/sdk/v1.js" async></script>
 *   <form method="post" action="/comments">
 *     <div data-proofoftype data-name="comment"></div>
 *     <button>Post</button>
 *   </form>
 *
 * In a form, it adds two hidden fields: `comment` (the text) and
 * `comment_proof` (the token), and verifies before the form submits.
 * Or use the JavaScript API: ProofOfType.mount(element, options).
 */
(function () {
  'use strict';
  if (window.ProofOfType && window.ProofOfType.version) return;

  var VERSION = '1.3.0';
  var script = document.currentScript;
  // The input always comes from Proof of Type, wherever this file is served
  // from (a CDN or bundle copy must not change whom we trust). Local dev
  // servers are allowed so the site can be developed.
  var BASE = (function () {
    try {
      var o = new URL(script && script.src ? script.src : 'https://www.proofoftype.com/');
      if (o.hostname === 'localhost' || o.hostname === '127.0.0.1') return o.origin;
    } catch (e) { /* fall through */ }
    return 'https://www.proofoftype.com';
  })();
  var counter = 0;
  var instances = {};

  function attr(el, name, fallback) {
    var v = el.getAttribute('data-' + name);
    return v === null || v === '' ? fallback : v;
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== BASE) return;
    var d = e.data;
    if (!d || d.source !== 'proofoftype' || !d.id) return;
    var inst = instances[d.id];
    if (!inst || e.source !== inst.iframe.contentWindow) return;
    inst._receive(d);
  });

  /**
   * @param {Element|string} target  element or selector to put the input in
   * @param {object} [options]
   * @param {string} [options.name]         form field name (default "proofoftype")
   * @param {string} [options.placeholder]
   * @param {number} [options.maxWords]     10–3000 (default 500)
   * @param {'auto'|'light'|'dark'} [options.theme]
   * @param {boolean} [options.button]      show the built-in "Verify" button (default: true, or false inside a form)
   * @param {string} [options.buttonLabel]
   * @param {boolean} [options.form]        handle the surrounding <form> (default true)
   * @param {boolean} [options.typewriter]  show the typewriter carriage animation (default true)
   * @param {string}  [options.typewriterColor]  its colour: "#e11d48", "#333" or a CSS colour name
   * @param {boolean} [options.sound]       typing sound on at first (default true; people can toggle it)
   * @param {boolean} [options.allowLinks]  allow pasting one link with the text (default true). It is signed
   *                                        in the proof: read proof.link from POST /api/v1/verify
   */
  function mount(target, options) {
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) throw new Error('ProofOfType: element not found');
    if (el.__proofoftype) return el.__proofoftype;
    var o = options || {};
    var id = 'pot' + (++counter) + Math.random().toString(36).slice(2, 8);
    var form = o.form === false ? null : el.closest && el.closest('form');
    // In a form, the form's own submit button verifies: no second button.
    if (o.button === undefined && form) o.button = false;
    var params = new URLSearchParams({ id: id });
    if (o.placeholder) params.set('placeholder', String(o.placeholder));
    if (o.maxWords) params.set('max', String(o.maxWords));
    if (o.theme) params.set('theme', String(o.theme));
    if (o.button === false) params.set('button', '0');
    if (o.buttonLabel) params.set('label', String(o.buttonLabel));
    if (o.typewriter === false) params.set('typewriter', '0');
    if (o.typewriterColor) params.set('twcolor', String(o.typewriterColor));
    if (o.sound === false) params.set('sound', '0');
    if (o.allowLinks === false) params.set('links', '0');

    var iframe = document.createElement('iframe');
    iframe.src = BASE + '/widget/input?' + params.toString();
    iframe.title = 'Proof of Type input';
    iframe.setAttribute('referrerpolicy', 'origin');   // lets the input know which site it's on
    iframe.setAttribute('allow', 'clipboard-write');
    iframe.style.cssText = 'display:block;width:100%;border:0;height:280px;background:transparent;color-scheme:normal;';
    el.appendChild(iframe);

    var listeners = {};
    var pending = {};
    var ready = false;
    var queue = [];
    var reqSeq = 0;
    var name = o.name || 'proofoftype';
    var fields = null;

    var inst = {
      element: el,
      iframe: iframe,
      /** Latest verified result, or null. */
      result: null,
      on: function (type, cb) { (listeners[type] = listeners[type] || []).push(cb); return inst; },
      off: function (type, cb) { listeners[type] = (listeners[type] || []).filter(function (f) { return f !== cb; }); return inst; },
      /**
       * Ask the person to confirm on their phone and get a proof.
       * @returns {Promise<{token: string, text: string, html: string, author: string, score: number, url: string, proofId: string}>}
       */
      verify: function () {
        var requestId = ++reqSeq;
        return new Promise(function (resolve, reject) {
          pending[requestId] = { resolve: resolve, reject: reject };
          send({ type: 'pot:verify', requestId: requestId });
        });
      },
      reset: function () { inst.result = null; setFields('', '', ''); send({ type: 'pot:reset' }); },
      focus: function () { send({ type: 'pot:focus' }); },
      destroy: function () {
        delete instances[id];
        if (form) form.removeEventListener('submit', onSubmit, true);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        if (fields) { fields.text.remove(); fields.proof.remove(); }
        el.__proofoftype = null;
      },
      _receive: function (d) {
        if (d.type === 'pot:resize' && d.height > 0) iframe.style.height = Math.min(d.height, 2000) + 'px';
        if (d.type === 'pot:ready') { ready = true; queue.splice(0).forEach(post); }
        if (d.type === 'pot:verified') {
          var r = { token: d.token, text: d.text, html: d.html, author: d.author, score: d.score, wpm: d.wpm,
            words: d.words, chars: d.chars, url: d.url, proofId: d.proofId, link: d.link || null };
          inst.result = r;
          setFields(r.text, r.token, r.link);
          settle(d.requestId, null, r);
        }
        if (d.type === 'pot:error') {
          var err = new Error(d.message || 'Not verified');
          err.code = d.code;
          settle(d.requestId, err);
        }
        emit(d.type.replace('pot:', ''), d);
      },
    };

    // Listeners, plus a DOM event on the element (e.g. "proofoftype:verified")
    // for pages that don't use the JavaScript API.
    function emit(type, d) {
      (listeners[type] || []).forEach(function (cb) { try { cb(d); } catch (e) { setTimeout(function () { throw e; }); } });
      try { el.dispatchEvent(new CustomEvent('proofoftype:' + type, { detail: d, bubbles: true })); } catch (e) { /* old browser */ }
    }
    function post(m) { m.source = 'proofoftype'; m.id = id; iframe.contentWindow.postMessage(m, BASE); }
    function send(m) { if (ready) post(m); else queue.push(m); }
    function settle(requestId, err, value) {
      var keys = requestId ? [requestId] : Object.keys(pending);
      keys.forEach(function (k) {
        var p = pending[k];
        if (!p) return;
        delete pending[k];
        if (err) p.reject(err); else p.resolve(value);
      });
    }

    function setFields(text, token, link) {
      if (!form) return;
      if (!fields) {
        fields = { text: hidden(name), proof: hidden(name + '_proof') };
        el.appendChild(fields.text);
        el.appendChild(fields.proof);
      }
      fields.text.value = text;
      fields.proof.value = token;
      void link;   // a pasted link is in the proof: read proof.link from the verify response
    }
    function hidden(n) { var i = document.createElement('input'); i.type = 'hidden'; i.name = n; return i; }

    // In a form: verify first, then let the submit go through with the
    // text + proof fields filled in.
    var submitting = false;
    function onSubmit(e) {
      if (inst.result || submitting) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      submitting = true;
      var submitter = e.submitter;
      inst.verify().then(function () {
        submitting = false;
        if (form.requestSubmit) form.requestSubmit(submitter && submitter.form === form ? submitter : undefined);
        else form.submit();
      }, function () { submitting = false; });
    }
    if (form) {
      setFields('', '', '');
      form.addEventListener('submit', onSubmit, true);
    }

    instances[id] = inst;
    el.__proofoftype = inst;
    return inst;
  }

  /** Mount every [data-proofoftype] element not mounted yet. */
  function scan(root) {
    var nodes = (root || document).querySelectorAll('[data-proofoftype]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.__proofoftype) continue;
      mount(el, {
        name: attr(el, 'name', undefined),
        placeholder: attr(el, 'placeholder', undefined),
        maxWords: attr(el, 'max-words', undefined),
        theme: attr(el, 'theme', undefined),
        button: attr(el, 'button', null) === null ? undefined : attr(el, 'button') !== 'false',
        buttonLabel: attr(el, 'button-label', undefined),
        form: attr(el, 'form', 'true') !== 'false',
        typewriter: attr(el, 'typewriter', 'true') !== 'false',
        typewriterColor: attr(el, 'typewriter-color', undefined),
        sound: attr(el, 'sound', 'true') !== 'false',
        allowLinks: attr(el, 'allow-links', 'true') !== 'false',
      });
    }
  }

  window.ProofOfType = { version: VERSION, mount: mount, scan: scan, origin: BASE };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(); });
  else scan();
})();
