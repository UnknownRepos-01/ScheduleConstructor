export const ROLE_ADMIN = "Админ";
export const ROLE_MANAGER = "Менеджер";
export const ROLE_TEACHER = "Преподаватель";

export const ADMIN_PANEL_ROLES = [ROLE_ADMIN, ROLE_MANAGER] as const;

export const canAccessAdminPanel = (roleName: string | null | undefined): boolean =>
  typeof roleName === "string" && ADMIN_PANEL_ROLES.includes(roleName as (typeof ADMIN_PANEL_ROLES)[number]);
