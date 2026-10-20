/** Animated mesh-gradient backdrop. Pure CSS, decorative, hidden from assistive tech. */
export function MeshBackground() {
  return (
    <div className="mesh-bg" aria-hidden="true">
      <div className="mesh-blob mesh-blob--a" />
      <div className="mesh-blob mesh-blob--b" />
      <div className="mesh-blob mesh-blob--c" />
      <div className="mesh-grain" />
    </div>
  );
}
