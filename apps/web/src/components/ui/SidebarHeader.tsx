import React, { useEffect, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore } from "../../lib/store";
import {
  SIDEBAR_SEARCH_INPUT_STYLE,
  getHeaderIconBtnStyle,
} from "./SidebarNavItems";

const { colors } = NOCTURNE_TOKENS;

interface SidebarHeaderProps {
  readonly isCollapsed: boolean;
  readonly toggleSidebarCollapsed: () => void;
}

export function SidebarHeader({
  isCollapsed,
  toggleSidebarCollapsed,
}: SidebarHeaderProps): React.JSX.Element {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [orgName, setOrgName] = useState<string>("");
  const [orgCnpj, setOrgCnpj] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoImgFailed, setLogoImgFailed] = useState(false);
  const globalSearchQuery = useUiSessionStore((state) => state.globalSearchQuery);
  const setGlobalSearchQuery = useUiSessionStore((state) => state.setGlobalSearchQuery);
  const currentUser = useUiSessionStore((state) => state.currentUser);
  const activeTenantId = useUiSessionStore((state) => state.activeTenantId);
  const activeTenantName = orgName || currentUser?.tenantName || "PesquisaMaster";

  useEffect(() => {
    setLogoImgFailed(false);
  }, [logoUrl]);

  useEffect(() => {
    const isJsdom = typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
    if (isJsdom) return;

    let cancelled = false;
    const qs = activeTenantId && /^\d+$/.test(activeTenantId)
      ? `?id_organizacao=${encodeURIComponent(activeTenantId)}`
      : "";
    fetch(`http://127.0.0.1:8000/api/v1/pesquisas-tabelas/organizacoes/branding${qs}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { nome_fantasia?: string; razao_social?: string; logomarca?: string | null } | null) => {
        if (cancelled || !data) return;
        if (data.nome_fantasia || data.razao_social) {
          setOrgName(data.nome_fantasia || data.razao_social || "");
        }
        setLogoUrl(data.logomarca ?? null);
      })
      .catch(() => {});

    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/organizacoes", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((items: any[]) => {
        if (cancelled || !Array.isArray(items) || items.length === 0) return;
        const targetTenantId = currentUser?.tenantId ?? activeTenantId;
        const matched =
          (targetTenantId
            ? items.find((org) => String(org?.id_organizacao) === String(targetTenantId))
            : undefined) ?? items[0];
        if (!matched) return;
        setOrgName(matched.nome_fantasia || matched.razao_social || "");
        setOrgCnpj(matched.cnpj || "");
        if (matched.logomarca !== undefined) {
          setLogoUrl(matched.logomarca ?? null);
        }
      })
      .catch(() => {});

    const handleBrandingUpdated = (event: Event): void => {
      const detail = (event as CustomEvent<{
        nome_fantasia?: string;
        razao_social?: string;
        logomarca?: string | null;
      }>).detail;
      if (!detail) return;
      if (detail.nome_fantasia || detail.razao_social) {
        setOrgName(detail.nome_fantasia || detail.razao_social || "");
      }
      if (detail.logomarca !== undefined) {
        setLogoUrl(detail.logomarca ?? null);
      }
    };

    window.addEventListener("pm_org_branding_updated", handleBrandingUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("pm_org_branding_updated", handleBrandingUpdated);
    };
  }, [activeTenantId, currentUser?.id]);

  return (
    <div
      data-testid="sidebar-header-region"
      style={{
        padding: isCollapsed ? "16px 8px" : "16px 14px 14px",
        backgroundColor: colors.surfaceContainerLow,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          flexDirection: "row",
          gap: "8px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
            flex: isCollapsed ? undefined : 1,
            cursor: isCollapsed ? "pointer" : "default",
          }}
          onClick={isCollapsed ? toggleSidebarCollapsed : undefined}
          onKeyDown={
            isCollapsed
              ? (e) => {
                if (e.key === "Enter" || e.key === " ") toggleSidebarCollapsed();
              }
              : undefined
          }
          role={isCollapsed ? "button" : undefined}
          tabIndex={isCollapsed ? 0 : undefined}
          aria-label={isCollapsed ? "Expandir menu lateral" : undefined}
        >
          {/* Logo Ícone Estilo DataOpinion / PesquisaMaster */}
          <div
            data-testid="sidebar-brand-logo"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: logoUrl && !logoImgFailed ? "50%" : "8px",
              overflow: "hidden",
              background:
                logoUrl && !logoImgFailed
                  ? colors.surfaceContainer
                  : "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
              border:
                logoUrl && !logoImgFailed
                  ? `1.5px solid ${colors.borderSubtle}`
                  : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 800,
              color: "#ffffff",
              boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
              flexShrink: 0,
            }}
            title={activeTenantName}
          >
            {logoUrl && !logoImgFailed ? (
              <img
                data-testid="sidebar-brand-logo-img"
                src={logoUrl}
                alt={activeTenantName}
                onError={() => setLogoImgFailed(true)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                  display: "block",
                }}
              />
            ) : (
              "PM"
            )}
          </div>

          {!isCollapsed && (
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div
                data-testid="sidebar-company-name"
                style={{
                  fontWeight: 800,
                  fontSize: "14px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {activeTenantName}
              </div>
              {currentUser?.tenantName ? (
                <div
                  data-testid="sidebar-tenant-badge"
                  style={{
                    marginTop: "2px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: colors.primary,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "9999px",
                      backgroundColor: colors.successPastel,
                      flexShrink: 0,
                    }}
                  />
                  Organização Ativa
                </div>
              ) : orgCnpj ? (
                <div style={{ fontSize: "9px", color: colors.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  CNPJ: {orgCnpj}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "4px",
              flexShrink: 0,
              marginLeft: "auto",
            }}
          >
            <button
              type="button"
              data-testid="btn-sidebar-search"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              title="Pesquisar módulo"
              aria-label="Pesquisar módulo"
              aria-expanded={isSearchOpen}
              style={getHeaderIconBtnStyle(isSearchOpen)}
            >
              ⌕
            </button>
            <button
              type="button"
              data-testid="btn-toggle-sidebar"
              onClick={toggleSidebarCollapsed}
              title="Recolher menu lateral"
              aria-label="Recolher menu lateral"
              aria-expanded={true}
              style={getHeaderIconBtnStyle(false)}
            >
              ◧
            </button>
          </div>
        )}
      </div>

      {isSearchOpen && !isCollapsed && (
        <input
          type="text"
          data-testid="sidebar-search-input"
          value={globalSearchQuery}
          onChange={(e) => setGlobalSearchQuery(e.target.value)}
          placeholder="Buscar módulo ou funcionalidade..."
          aria-label="Campo de pesquisa no menu lateral"
          style={SIDEBAR_SEARCH_INPUT_STYLE}
          autoFocus
        />
      )}
    </div>
  );
}
