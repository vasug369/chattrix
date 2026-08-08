/**
 * The drifting colour field that every glass surface refracts.
 *
 * Rendered once in the app shell rather than per page, so navigating does not
 * restart the (24–34 second) drift animations. Purely decorative, hence
 * aria-hidden.
 */
export default function Aurora() {
  return (
    <div className="aurora" aria-hidden="true">
      <div className="aurora__blob aurora__blob--1" />
      <div className="aurora__blob aurora__blob--2" />
      <div className="aurora__blob aurora__blob--3" />
      <div className="aurora__blob aurora__blob--4" />
      <div className="aurora__noise" />
    </div>
  );
}
