import type { SystemRole } from "@/lib/schema/domain";

export type ActionActor = SystemRole | "anonymous";

const ownerOnly = [
  "saveDraftAction",
  "currentRevisionAction",
  "createTemplateAction",
  "renameTemplateAction",
  "duplicateTemplateAction",
  "archiveTemplateAction",
  "publishTemplateAction",
  "deleteTemplateAction",
  "updateTemplateCatalogAction",
  "createCategoryAction",
  "updateCategoryAction",
  "deleteCategoryAction",
  "createResellerAction",
  "toggleResellerStatusAction",
  "transitionOrderAction",
  "configureProductionAction",
  "createOrderProjectAction",
  "transitionProductionAction",
  "updatePaymentAction",
  "regenerateOrderClientTokenAction",
  "resolvePrivacyRequestAction",
  "recordRecoveryDrillAction",
  "activateDomainTlsAction",
  "createUserAction",
  "updateUserAction",
  "toggleUserStatusAction",
  "deleteUserAction",
  "fetchUsersListAction",
] as const;

const authenticated = [
  "logoutAction",
  "switchWorkspaceAction",
  "submitPrivacyRequestAction",
] as const;

const ownerAndClient = [
  "saveInvitationDataAction",
  "addGuestAction",
  "archiveGuestAction",
  "importGuestsAction",
  "initUploadAction",
  "finalizeUploadAction",
  "saveAssetFromUrlAction",
  "deleteAssetAction",
  "listAssetsAction",
  "listAllStorageAssetsAction",
  "getStorageOverviewAction",
] as const;

export const SERVER_ACTION_POLICIES: Readonly<Record<string, readonly ActionActor[]>> = {
  loginAction: ["anonymous"],
  submitCustomerOrderAction: ["anonymous"],
  submitPortalDecisionAction: ["anonymous"],
  addPortalGuestAction: ["anonymous"],
  archivePortalGuestAction: ["anonymous"],
  ...Object.fromEntries(ownerOnly.map((action) => [action, ["owner"] as const])),
  ...Object.fromEntries(
    authenticated.map((action) => [action, ["owner", "reseller", "client"] as const]),
  ),
  ...Object.fromEntries(ownerAndClient.map((action) => [action, ["owner", "client"] as const])),
  createInvitationAction: ["owner"],
  publishInvitationAction: ["owner"],
  rollbackInvitationAction: ["owner"],
  deleteInvitationAction: ["owner"],
  archiveInvitationAction: ["owner"],
  restoreInvitationAction: ["owner"],
  regenerateInvitationClientTokenAction: ["owner"],
  decideInvitationReviewAction: ["client"],
  verifyDomainAction: ["reseller"],
  updateBrandingAction: ["reseller"],
  createClientAction: ["reseller"],
  qualifyOrderAction: ["reseller"],
};

export function isServerActionAllowed(action: string, actor: ActionActor): boolean {
  return SERVER_ACTION_POLICIES[action]?.includes(actor) ?? false;
}
