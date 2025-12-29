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
    case "view_cash_flow_button":
      return "list";
    case "view_settled_button":
      return "check_list";
    case "view_report_button":
      return "chart";

    // Sidebar actions
    case "view_credit_modal_button":
      return "plus_square";
    case "view_debit_modal_button":
      return "minus_square";
    case "view_transference_modal_button":
    case "add_transference":
      return "swap";

    // Page components
    case "view_banks_table":
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
