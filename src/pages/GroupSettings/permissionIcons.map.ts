// src/pages/GroupSettings/permissionIcons.map.ts

export type PermissionIconId =
  | "eye"
  | "plus_square"
  | "minus_square"
  | "pencil"
  | "trash"
  | "swap"
  | "table"
  | "sliders"
  | "chart"
  | "list"
  | "check_list";

export const getPermissionIconId = (code: string): PermissionIconId => {
  switch (code) {
    // Navbar buttons
    case "view_cash_flow_page":
      return "list";
    case "view_settlement_page":
      return "check_list";
    case "view_report_page":
      return "chart";

    // Sidebar actions
    case "add_cash_flow_entries":
      return "plus_square";
    case "add_cash_flow_entries":
      return "minus_square";
    case "add_transference":
    case "add_transference":
      return "swap";

    // Page components
    case "view_bank":
      return "table";
    case "view_filters":
      return "sliders";
    case "view_cash_flow_entries":
      return "list";
    case "view_settled_entries":
      return "check_list";

    default:
      break;
  }

  // Generic fallbacks by prefix
  if (code.startsWith("add_")) return "plus_square";
  if (code.startsWith("change_")) return "pencil";
  if (code.startsWith("delete_")) return "trash";
  if (code.startsWith("view_")) return "eye";

  return "eye";
};
