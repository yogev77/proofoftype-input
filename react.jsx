// React wrapper for the Proof of Type input.
//
//   import { HumanInput } from 'proofoftype-input/react';
//   <HumanInput placeholder="Write a comment" onVerified={(r) => save(r.text, r.token)} />
//
// Loads https://www.proofoftype.com/sdk/v1.js once, then mounts the input.
import { useEffect, useRef } from 'react';

const SDK = 'https://www.proofoftype.com/sdk/v1.js';
let loading = null;

function loadSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('browser only'));
  if (window.ProofOfType) return Promise.resolve(window.ProofOfType);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SDK;
      s.async = true;
      s.onload = () => resolve(window.ProofOfType);
      s.onerror = () => { loading = null; reject(new Error('Could not load the Proof of Type SDK')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/**
 * @param {object} props
 * @param {(result: object) => void} [props.onVerified]
 * @param {(error: {code: string, message: string}) => void} [props.onError]
 * @param {(counts: {words: number, chars: number}) => void} [props.onChange]
 * @param {(input: object) => void} [props.onReady]  gives you the input (call input.verify())
 * Other props are SDK options: name, placeholder, maxWords, theme, button, buttonLabel, form.
 */
export function HumanInput({ onVerified, onError, onChange, onReady, className, style, ...options }) {
  const ref = useRef(null);
  const handlers = useRef({});
  handlers.current = { onVerified, onError, onChange };
  useEffect(() => {
    let input = null;
    let cancelled = false;
    loadSdk().then((POT) => {
      if (cancelled || !ref.current) return;
      input = POT.mount(ref.current, options);
      input.on('verified', (r) => handlers.current.onVerified?.(r));
      input.on('error', (e) => handlers.current.onError?.(e));
      input.on('change', (c) => handlers.current.onChange?.(c));
      onReady?.(input);
    });
    return () => { cancelled = true; input?.destroy(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={ref} className={className} style={style} />;
}

export default HumanInput;
