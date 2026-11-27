import React, { useEffect, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore, type ActiveTab } from "../../lib/store";
import {
  SIDEBAR_AVATAR_STYLE,
  SidebarIcon,
} from "./SidebarNavItems";
import { SidebarSettingsDropdown, isSettingsOrRegionTab } from "./SidebarSettingsDropdown";

const { colors } = NOCTURNE_TOKENS;

function getUserInitials(name: string): string {
  const parts = name.replace(/^(Dr\.|Dra\.|Prof\.|Sr\.|Sra\.)\s+/i, "").trim().split(/\s+/);
  const firstWord = parts[0] ?? "";
  if (!firstWord) return "HV";
  if (parts.length === 1) return firstWord.slice(0, 2).toUpperCase();
  const lastWord = parts[parts.length - 1] ?? "";
  const first = firstWord[0] ?? "";
  const last = lastWord[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

interface SidebarFooterProps {
  readonly isCollapsed: boolean;
  readonly isSettingsMenuOpen: boolean;
  readonly activeTab: ActiveTab;
  readonly toggleSettingsMenu: () => void;
  readonly onNavigate: (tab: ActiveTab, path: string) => void;
}

export function SidebarFooter({
  isCollapsed,
  isSettingsMenuOpen,
  activeTab,
  toggleSettingsMenu,
  onNavigate,
}: SidebarFooterProps): React.JSX.Element {
  const currentUser = useUiSessionStore((state) => state.currentUser);
  const connectedCollab = useUiSessionStore((state) => state.clientCollaborators[0]);

  const [dbUser, setDbUser] = useState<{ fullName?: string; roleLabel?: string } | null>(null);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [userPhotoFailed, setUserPhotoFailed] = useState(false);

  useEffect(() => {
    setUserPhotoFailed(false);
  }, [userPhotoUrl]);

  useEffect(() => {
    const isJsdom = typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
    if (isJsdom) return;

    const uid = currentUser?.id;
    if (uid && /^\d+$/.test(uid)) {
      setUserPhotoUrl(`http://127.0.0.1:8000/api/v1/pesquisas-tabelas/usuarios/${uid}/foto/view`);
    } else {
      setUserPhotoUrl(null);
    }

    const handlePhotoUpdated = (event: Event): void => {
      const detail = (event as CustomEvent<{ userId?: string; photoUrl?: string | null }>).detail;
      if (detail?.userId && uid && String(detail.userId) === String(uid)) {
        setUserPhotoUrl(detail.photoUrl ?? null);
        setUserPhotoFailed(false);
      }
    };

    window.addEventListener("pm_user_photo_updated", handlePhotoUpdated);
    return () => {
      window.removeEventListener("pm_user_photo_updated", handlePhotoUpdated);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("pm_auth_token") : null;
    if (!token) return;
    fetch("http://127.0.0.1:8000/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { full_name?: string; role?: string } | null) => {
        if (data?.full_name) {
          setDbUser({
            fullName: data.full_name,
            roleLabel: data.role ?? undefined,
          });
        }
      })
      .catch(() => {
        // Fallback to session store when offline
      });
  }, [currentUser?.email]);

  const userName = dbUser?.fullName ?? currentUser?.fullName ?? connectedCollab?.fullName ?? "Usuário";
  const userRole = dbUser?.roleLabel ?? currentUser?.roleLabel ?? "Administrador";
  const initials = getUserInitials(userName);

  return (
    <div
      data-testid="sidebar-footer-region"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: isCollapsed ? "column-reverse" : "column",
        alignItems: isCollapsed ? "center" : "stretch",
        gap: "10px",
        padding: isCollapsed ? "14px 8px" : "12px 14px",
        borderTop: `1px solid ${colors.borderSubtle}`,
        backgroundColor: colors.surfaceContainerLow,
        flexShrink: 0,
      }}
    >
      <SidebarSettingsDropdown
        isOpen={isSettingsMenuOpen}
        isCollapsed={isCollapsed}
        activeTab={activeTab}
        onNavigate={onNavigate}
        onClose={toggleSettingsMenu}
      />

      <div
        data-testid="sidebar-connected-user"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-start",
          gap: "10px",
          minWidth: 0,
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          <span
            data-testid="sidebar-user-avatar"
            style={{
              ...SIDEBAR_AVATAR_STYLE,
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              overflow: "hidden",
              background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
              border: "1px solid #475569",
              fontSize: "11px",
              fontWeight: 700,
              color: "#f8fafc",
              letterSpacing: "0.5px",
            }}
          >
            {userPhotoUrl && !userPhotoFailed ? (
              <img
                data-testid="sidebar-user-avatar-img"
                src={userPhotoUrl}
                alt={userName}
                onError={() => setUserPhotoFailed(true)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                  display: "block",
                }}
              />
            ) : (
              initials
            )}
          </span>
          <span
            data-testid="sidebar-user-status-dot"
            title="Online"
            style={{
              position: "absolute",
              bottom: "0px",
              right: "0px",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              border: `1.5px solid ${colors.surfaceContainerLow}`,
            }}
          />
        </div>

        {!isCollapsed && (
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span
              data-testid="sidebar-user-name"
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#f8fafc",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: "1.4",
              }}
            >
              {userName}
            </span>
            <span
              style={{
                fontSize: "10px",
                color: "#94a3b8",
                fontWeight: 500,
                lineHeight: "1.2",
              }}
            >
              {userRole}
            </span>
            <span data-testid="sidebar-user-status" style={{ display: "none" }}>
              ● Online
            </span>
          </div>
        )}
        {!isCollapsed && (
          <button
            type="button"
            data-testid="btn-sidebar-footer-settings"
            onClick={toggleSettingsMenu}
            title="Configurações & Parametrização"
            aria-label="Configurações"
            aria-expanded={isSettingsMenuOpen}
            style={{
              marginLeft: "auto",
              width: "32px",
              height: "32px",
              flexShrink: 0,
              borderRadius: "8px",
              border: isSettingsOrRegionTab(activeTab) || isSettingsMenuOpen
                ? "1px solid #3b82f6"
                : "1px solid #334155",
              backgroundColor: isSettingsOrRegionTab(activeTab) || isSettingsMenuOpen
                ? "#1e293b"
                : "#151e2e",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <SidebarIcon name="settings" size={14} style={{ color: "#94a3b8" }} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div style={{ display: "flex", gap: "6px", width: "100%", justifyContent: "center" }}>
          <button
            type="button"
            data-testid="btn-sidebar-footer-settings"
            onClick={toggleSettingsMenu}
            title="Configurações & Parametrização"
            aria-label="Configurações"
            aria-expanded={isSettingsMenuOpen}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: isSettingsOrRegionTab(activeTab) || isSettingsMenuOpen
                ? "1px solid #3b82f6"
                : "1px solid #334155",
              backgroundColor: isSettingsOrRegionTab(activeTab) || isSettingsMenuOpen
                ? "#1e293b"
                : "#151e2e",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <SidebarIcon name="settings" size={14} style={{ color: "#94a3b8" }} />
          </button>
        </div>
      )}
    </div>
  );
}
