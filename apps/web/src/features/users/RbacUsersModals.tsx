import React from "react";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import type { UserAccountFormData, UserAccountRecord } from "./usersRbacData";
import { UserRbacDrawerForm } from "./UserRbacDrawerForm";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { RolePermissionsModal } from "./RolePermissionsModal";
import { OrganizationStayOnTopModal } from "../clients/OrganizationStayOnTopModal";

interface RbacUsersModalsProps {
  readonly drawerOpen: boolean;
  readonly editingUser: UserAccountRecord | null;
  readonly passwordModalOpen: boolean;
  readonly rbacModalOpen: boolean;
  readonly orgModalOpen: boolean;
  readonly revokingTarget: UserAccountRecord | null;
  readonly currentUserEmail: string;
  readonly onCloseDrawer: () => void;
  readonly onSave: (data: UserAccountFormData) => Promise<void>;
  readonly onNewUser: () => void;
  readonly onOpenRbac: () => void;
  readonly onOpenPassword: () => void;
  readonly onOpenOrg: () => void;
  readonly onClosePassword: () => void;
  readonly onCloseRbac: () => void;
  readonly onCloseOrg: () => void;
  readonly onSuccessFeedback: (msg: string) => void;
  readonly onConfirmRevoke: () => Promise<void>;
  readonly onCancelRevoke: () => void;
}

export function RbacUsersModals(props: RbacUsersModalsProps): React.JSX.Element {
  return (
    <>
      <UserRbacDrawerForm
        isOpen={props.drawerOpen}
        editingUser={props.editingUser}
        onClose={props.onCloseDrawer}
        onSave={props.onSave}
        onNewUser={props.onNewUser}
        onOpenRbacPermissions={props.onOpenRbac}
        onOpenChangePassword={props.onOpenPassword}
        onOpenOrganization={props.onOpenOrg}
      />
      <ChangePasswordModal
        isOpen={props.passwordModalOpen}
        defaultEmail={props.currentUserEmail}
        onClose={props.onClosePassword}
        onSuccess={props.onSuccessFeedback}
      />
      <RolePermissionsModal
        isOpen={props.rbacModalOpen}
        onClose={props.onCloseRbac}
        onSuccess={props.onSuccessFeedback}
      />
      <OrganizationStayOnTopModal
        isOpen={props.orgModalOpen}
        onClose={props.onCloseOrg}
        onSuccess={props.onSuccessFeedback}
      />
      <ConfirmDialogModal
        isOpen={Boolean(props.revokingTarget)}
        title="Revogar Sessões JWT Ativas"
        message={`Deseja revogar imediatamente todas as sessões e tokens de acesso de "${props.revokingTarget?.fullName}"?`}
        confirmLabel="🔑 Confirmar Revogação de Sessão"
        variant="danger"
        onConfirm={props.onConfirmRevoke}
        onCancel={props.onCancelRevoke}
      />
    </>
  );
}

