/**
 * Ownership line, shown on the public login page and under every signed-in
 * page.
 *
 * The year is computed rather than written down: a hardcoded one silently
 * becomes wrong every January, and a stale copyright notice on a portfolio
 * project reads as an abandoned one.
 */
export default function Footer() {
  return (
    <footer className="mt-10 pb-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
      <p>
        © {new Date().getFullYear()} Chattrix · Built by{' '}
        <span style={{ color: 'var(--text-dim)' }}>Vasu Gupta</span>
      </p>
    </footer>
  );
}
