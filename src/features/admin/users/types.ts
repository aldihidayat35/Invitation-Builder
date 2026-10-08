import type { SystemRole, UserStatus } from "@/lib/schema/domain";
import type { UserListItem, UsersSummary } from "@/lib/db/repositories/users";

export type { UserListItem, UsersSummary };

export interface AvailableResellerOption {
  id: string;
  name: string;
  agencyName?: string | null;
  agencySlug?: string | null;
}

export interface CreateUserInputForm {
  name: string;
  email: string;
  password?: string;
  systemRole: SystemRole;
  status: UserStatus;
  resellerId?: string;
  agencyName?: string;
  slug?: string;
  whatsappContact?: string;
}

export interface UpdateUserInputForm {
  userId: string;
  name: string;
  email: string;
  systemRole: SystemRole;
  status: UserStatus;
  resellerId?: string | null;
  newPassword?: string;
}

export interface ActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}
