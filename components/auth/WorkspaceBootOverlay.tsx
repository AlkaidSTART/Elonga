import {
  WORKSPACE_BOOT_HTML_ATTR,
  WORKSPACE_BOOT_OVERLAY_ID,
  buildWorkspaceBootRevealScript,
} from "@/lib/auth/workspace-boot";

const BOOT_OVERLAY_CSS = `
#${WORKSPACE_BOOT_OVERLAY_ID} {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f6f4ef;
  color: #181816;
  opacity: 0;
  transition: opacity 240ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: auto;
}
html[${WORKSPACE_BOOT_HTML_ATTR}="active"] #${WORKSPACE_BOOT_OVERLAY_ID} {
  display: flex;
  opacity: 1;
}
html[${WORKSPACE_BOOT_HTML_ATTR}="exiting"] #${WORKSPACE_BOOT_OVERLAY_ID} {
  display: flex;
  opacity: 0;
  pointer-events: none;
}
.elonga-boot-bar-track {
  position: relative;
  width: 184px;
  height: 2px;
  overflow: hidden;
  border-radius: 999px;
  background-color: #e2ddd3;
}
.elonga-boot-bar-fill {
  position: absolute;
  inset: 0;
  width: 42%;
  border-radius: 999px;
  background-color: #1b4d3e;
  animation: elonga-boot-slide 1.25s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
@keyframes elonga-boot-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(340%);
  }
}
@media (prefers-reduced-motion: reduce) {
  #${WORKSPACE_BOOT_OVERLAY_ID} {
    transition: none;
  }
  .elonga-boot-bar-fill {
    width: 65%;
    animation: none;
  }
}
`;

/**
 * Server-rendered Warm Editorial Studio loading overlay for the first-login workspace entry.
 * Stays hidden on regular visits and only reveals synchronously when arriving from /login.
 */
export function WorkspaceBootOverlay() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BOOT_OVERLAY_CSS }} />
      <div
        id={WORKSPACE_BOOT_OVERLAY_ID}
        role="status"
        aria-live="polite"
        aria-label="正在加载工作台"
      >
        <div className="flex flex-col items-center px-6 text-center">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 12,
              border: "1px solid #E2DDD3",
              backgroundColor: "#FCFBF8",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/elonga-logo.png"
              alt="Elonga"
              width={26}
              height={26}
              style={{ objectFit: "contain" }}
            />
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              className="font-editorial"
              style={{
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "#181816",
              }}
            >
              Elonga
            </span>
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "999px",
                backgroundColor: "#B85D3B",
              }}
            />
            <span style={{ fontSize: 12, color: "#8C857B", letterSpacing: "0.06em" }}>
              简悦工坊
            </span>
          </div>

          <div className="elonga-boot-bar-track" style={{ marginTop: 20 }}>
            <div className="elonga-boot-bar-fill" />
          </div>

          <p
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "#78716C",
              letterSpacing: "0.02em",
            }}
          >
            正在加载工作台资源…
          </p>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: buildWorkspaceBootRevealScript() }} />
    </>
  );
}
