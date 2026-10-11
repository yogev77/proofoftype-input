// Types for the Proof of Type input (https://www.proofoftype.com/developers).

export interface ProofOfTypeOptions {
  /** Form field name; the proof goes in `<name>_proof`. Default "proofoftype". */
  name?: string;
  placeholder?: string;
  /** 10–3000, default 500. */
  maxWords?: number;
  theme?: 'auto' | 'light' | 'dark';
  /** Show the built-in Verify button. Default true (false inside a form). */
  button?: boolean;
  buttonLabel?: string;
  /** Handle the surrounding <form>. Default true. */
  form?: boolean;
}

export interface ProofResult {
  /** The exact plain text (this is what the proof hashes). */
  text: string;
  /** The same text with formatting. */
  html: string;
  /** The proof token (EdDSA JWT). */
  token: string;
  /** Proof of Type username who typed and signed it. */
  author: string;
  score: number | null;
  wpm: number | null;
  words: number;
  chars: number;
  proofId: string;
  /** Public proof page. */
  url: string;
}

export interface ProofOfTypeInput {
  element: Element;
  iframe: HTMLIFrameElement;
  result: ProofResult | null;
  verify(): Promise<ProofResult>;
  reset(): void;
  focus(): void;
  on(event: 'ready', cb: (d: { signedIn: boolean; username: string | null }) => void): ProofOfTypeInput;
  on(event: 'signin', cb: (d: { username: string }) => void): ProofOfTypeInput;
  on(event: 'change', cb: (d: { words: number; chars: number }) => void): ProofOfTypeInput;
  on(event: 'verified', cb: (d: ProofResult) => void): ProofOfTypeInput;
  on(event: 'error', cb: (d: { code: string; message: string }) => void): ProofOfTypeInput;
  on(event: 'resize', cb: (d: { height: number }) => void): ProofOfTypeInput;
  off(event: string, cb: (...args: any[]) => void): ProofOfTypeInput;
  destroy(): void;
}

export interface ProofOfTypeSDK {
  version: string;
  origin: string;
  mount(target: Element | string, options?: ProofOfTypeOptions): ProofOfTypeInput;
  scan(root?: ParentNode): void;
}

declare global {
  interface Window { ProofOfType: ProofOfTypeSDK; }
}

export interface VerifiedProof {
  id: string;
  origin: string;
  author: string;
  signed_on: 'ios' | 'android';
  typed_at: string;
  score: number | null;
  wpm: number | null;
  words: number;
  chars: number;
  text_sha256: string;
  version: number;
}

export function verifyProof(p: { token: string; text: string; origin: string; fetch?: typeof fetch }):
  Promise<{ ok: true; proof: VerifiedProof } | { ok: false; reason: string }>;
