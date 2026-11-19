/**
 * ============================================================
 *  MAIN LOGO — change it here
 * ============================================================
 *  1. Put your logo file in  /public   (e.g. /public/logo.png, /public/logo.svg)
 *  2. Set LOGO_SRC to its path below.
 *  3. If your logo image already contains the company name, set SHOW_NAME = false.
 *
 *  The same file is also used as the browser-tab icon (see app/layout.tsx).
 */
export const LOGO_SRC = "/logo.svg";
export const APP_NAME = "PayTrack";
export const SHOW_NAME = true;

export function Logo({ height = 36, light = true }: { height?: number; light?: boolean }) {
  return (
    <div className="brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt={APP_NAME} className="brand-img" style={{ height }} />
      {SHOW_NAME && <span style={{ color: light ? "var(--text-light)" : "var(--text-dark)" }}>{APP_NAME}</span>}
    </div>
  );
}
