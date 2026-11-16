import React from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

export interface CardProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly badgeText?: string;
  readonly children: React.ReactNode;
}

const { colors, typography, rounded, spacing } = NOCTURNE_TOKENS;

export function Card({ title, subtitle, badgeText, children }: CardProps): React.JSX.Element {
  return (
    <section
      style={{
        border: `1px solid ${colors.borderSubtle}`,
        borderRadius: rounded.lg,
        padding: spacing.spaceLg,
        backgroundColor: colors.surfaceCard,
        color: colors.textPrimary,
        fontFamily: typography.fontFamily,
        marginBottom: spacing.spaceMd,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: spacing.spaceMd,
          paddingBottom: spacing.spaceSm,
          borderBottom: `1px solid ${colors.borderSubtle}`,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: typography.headlineMd.fontSize,
              fontWeight: typography.headlineMd.fontWeight,
              lineHeight: typography.headlineMd.lineHeight,
              letterSpacing: typography.headlineMd.letterSpacing,
              color: colors.textPrimary,
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: typography.bodyMd.fontSize,
                color: colors.textMuted,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {badgeText ? (
          <span
            style={{
              fontSize: typography.caption.fontSize,
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: rounded.full,
              backgroundColor: colors.successContainer,
              color: colors.onSuccessContainer,
              border: "1px solid rgba(129, 201, 149, 0.3)",
            }}
          >
            {badgeText}
          </span>
        ) : null}
      </header>
      <div>{children}</div>
    </section>
  );
}
