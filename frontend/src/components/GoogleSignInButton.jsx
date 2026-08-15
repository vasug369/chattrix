import { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

/** Whether this build was given a client ID at all. */
export const googleSignInAvailable = Boolean(CLIENT_ID);

/**
 * Load Google Identity Services once per page, not once per mount.
 *
 * Kept at module scope because two mounts (StrictMode double-invokes effects in
 * development, and the login screen can remount) would otherwise inject the
 * script twice and initialise the library against a half-loaded global.
 */
let scriptPromise = null;

const loadGsi = () => {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();

    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    const script = existing ?? document.createElement('script');

    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => {
      // Let a later mount retry rather than caching the failure forever —
      // this fails on a flaky connection, and on networks where Google is
      // blocked, and neither should permanently disable the button.
      scriptPromise = null;
      reject(new Error('Could not reach Google'));
    });

    if (!existing) {
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return scriptPromise;
};

/**
 * Renders Google's own button.
 *
 * It has to be Google's, not ours: the credential is delivered straight to the
 * callback by their iframe, and a hand-rolled button cannot obtain one. It also
 * keeps us on the right side of their branding rules.
 */
export default function GoogleSignInButton({ onCredential, onError, disabled }) {
  const containerRef = useRef(null);
  const [failed, setFailed] = useState(false);

  // Held in a ref so re-rendering with a new closure does not force the button
  // to be torn down and rebuilt mid-interaction.
  const handlerRef = useRef(onCredential);
  handlerRef.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID) return undefined;

    let cancelled = false;

    loadGsi()
      .then(() => {
        if (cancelled || !containerRef.current) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: ({ credential }) => handlerRef.current?.(credential),
          // No auto-select and no One Tap prompt: signing someone in the
          // instant they land, without a deliberate click, is hostile on a
          // shared machine.
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'center',
          width: 320,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setFailed(true);
        onError?.(err);
      });

    return () => {
      cancelled = true;
    };
    // onError is intentionally not a dependency: callers pass an inline
    // function, which would re-run this effect on every render and rebuild the
    // button each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!CLIENT_ID) return null;

  if (failed) {
    return (
      <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        Google sign-in is unavailable right now — use your email and password.
      </p>
    );
  }

  return (
    <div
      className="flex justify-center"
      style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
    >
      <div ref={containerRef} />
    </div>
  );
}
