import React from "react";

export const CRUD_INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid #353535",
  backgroundColor: "#202020",
  color: "#e5e2e1",
  fontSize: "13px",
  boxSizing: "border-box",
};

export const CRUD_LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "#c3c6d1",
  marginBottom: "6px",
};

export function RegionsFeedbackToast({
  message,
  testId = "regions-feedback-toast",
}: {
  readonly message: string | null;
  readonly testId?: string;
}): React.JSX.Element | null {
  if (!message) return null;
  return (
    <div
      data-testid={testId}
      style={{
        padding: "10px 16px",
        backgroundColor: "#183724",
        color: "#a8dab5",
        border: "1px solid #81c995",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: 600,
        marginBottom: "16px",
      }}
    >
      {message}
    </div>
  );
}

