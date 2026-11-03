/* -----------------------------------------------------------------------------
 * File: src/lib/permissions/permissionIcons.ts
 * ---------------------------------------------------------------------------*/

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Coins,
  CreditCard,
  Eye,
  FileText,
  FolderKanban,
  Gauge,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Lock,
  Paintbrush,
  Package,
  Pencil,
  Plus,
  Settings,
  Shield,
  SlidersHorizontal,
  Table,
  Trash2,
  User,
  Users,
} from "lucide-react";

export function permissionIcons(code: string): LucideIcon {
  // Generic action icons
  if (code.startsWith("add_")) return Plus;
  if (code.startsWith("change_")) return Pencil;
  if (code.startsWith("delete_")) return Trash2;

  // Pages
  if (code === "view_home_dashboard_page") return LayoutDashboard;
  if (code === "view_cash_flow_page") return BarChart3;
  if (code === "view_settlement_page") return Table;
  if (code === "view_report_page") return FileText;

  if (code === "view_personal_settings_page") return User;
  if (code === "view_subscription_management_page") return CreditCard;
  if (code === "view_limits_and_usage_page") return Gauge;
  if (code === "view_security_and_privacy_page") return Shield;

  if (code === "view_organization_settings_page") return Settings;
  if (code === "view_department_settings_page") return Building2;
  if (code === "view_bank_settings_page") return Landmark;
  if (code === "view_entity_settings_page") return Building2;
  if (code === "view_inventory_settings_page") return Package;
  if (code === "view_project_settings_page") return FolderKanban;
  if (code === "view_member_settings_page") return Users;
  if (code === "view_group_settings_page") return Users;
  if (code === "view_ledger_accounts_page") return BookOpen;

  if (code === "view_statements_page") return FileText;
  if (code === "view_notification_settings_page") return Bell;
  if (code === "view_format_settings_page") return Paintbrush;
  if (code === "view_currency_settings_page") return Coins;

  // Visualization (non-page)
  if (code === "view_filters") return SlidersHorizontal;
  if (code === "view_cash_flow_entry_view" || code === "view_settlement_entry_view") return SlidersHorizontal;
  if (code === "view_cash_flow_kpis" || code === "view_settlement_kpis") return BarChart3;
  if (code === "view_cash_flow_amount" || code === "view_settlement_amount" || code === "view_consolidated_balance")
    return Gauge;

  if (code === "view_permission") return KeyRound;
  if (code === "view_limits_and_usage") return Gauge;
  if (code === "view_statement") return FileText;

  if (code === "view_user") return User;
  if (code === "view_member") return Users;
  if (code === "view_group") return Users;

  if (code === "view_bank") return Landmark;
  if (code === "view_ledger_account") return BookOpen;
  if (code === "view_department") return Building2;
  if (code === "view_project") return FolderKanban;
  if (code === "view_inventory") return Package;
  if (code === "view_entity") return Building2;

  // Fallback
  if (code.startsWith("view_")) return Eye;
  return Lock;
}
