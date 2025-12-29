// src/pages/GroupSettings/permissionIcons.tsx
import React, { useMemo } from "react";
import { getPermissionIconId, type PermissionIconId } from "./permissionIcons.map";

type IconProps = React.SVGProps<SVGSVGElement> & {
  title?: string;
};

const baseSvgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
} as const;

/* ------------------------------ Icon components --------------------------- */

const EyeIcon: React.FC<IconProps> = ({ className, title, ...rest }) => (
  <svg {...baseSvgProps} className={className} role="img" aria-label={title ?? "View"} {...rest}>
    {title ? <title>{title}</title> : null}
    <path
      d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusSquareIcon: React.FC<IconProps> = ({ className, title, ...rest }) => (
  <svg {...baseSvgProps} className={className} role="img" aria-label={title ?? "Add"} {...rest}>
    {title ? <title>{title}</title> : null}
    <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.75" />
    <path d="M12 8.5v7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M8.5 12h7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const MinusSquareIcon: React.FC<IconProps> = ({ className, title, ...rest }) => (
  <svg {...baseSvgProps} className={className} role="img" aria-label={title ?? "Remove"} {...rest}>
    {title ? <title>{title}</title> : null}
    <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.75" />
    <path d="M8.5 12h7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const PencilIcon: React.FC<IconProps> = ({ className, title, ...rest }) => (
  <svg {...baseSvgProps} className={className} role="img" aria-label={title ?? "Edit"} {...rest}>
    {title ? <title>{title}</title> : null}
    <path
      d="M12.25 6.75 17.25 11.75"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 17.5h3.1c.35 0 .69-.14.94-.39l7.42-7.42a1.33 1.33 0 0 0 0-1.88l-2.4-2.4a1.33 1.33 0 0 0-1.88 0l-7.42 7.42c-.25.25-.39.59-.39.94V17.5Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon: React.FC<IconProps> = ({ className, title, ...rest }) => (
  <svg {...baseSvgProps} className={className} role="img" aria-label={title ?? "Delete"} {...rest}>
    {title ? <title>{title}</title> : null}
    <path d="M9 4.5h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M5.5 7h13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path
      d="M8 7v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10.5 11v7M13.5 11v7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const SwapIcon: React.FC<IconProps> = ({ className, title, ...rest }) => (
  <svg {...baseSvgProps} className={className} role="img" aria-label={title ?? "Transfer"} {...rest}>
    {title ? <title>{title}</title> : null}
    <path d="M5 9h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path
      d="M17 7l2 2-2 2"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M19 15H5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path
      d="M7 13l-2 2 2 2"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TableIcon: React.FC<IconProps> = ({ className, title, ...rest }) => (
  <svg {...baseSvgProps} className={className} role="img" aria-label={title ?? "Table"} {...rest}>
    {title ? <title>{title}</title> : null}
    <rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
    <path d="M4 10h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M9 5v14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M15 5v14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const SlidersIcon: React.FC<IconProps> = ({ className, title, ...rest }) => (
  <svg {...baseSvgProps} className={className} role="img" aria-label={title ?? "Filters"} {...rest}>
    {title ? <title>{title}</title> : null}
    <path d="M5 7h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M5 12h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M5 17h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M9 7v0" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M15 12v0" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M11 17v0" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

const ChartIcon: React.FC<IconProps> = ({ className, title, ...rest }) => (
  <svg {...baseSvgProps} className={className} role="img" aria-label={title ?? "Reports"} {...rest}>
    {title ? <title>{title}</title> : null}
    <path d="M5 19V5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M5 19h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path
      d="M8 16v-5M12 16v-8M16 16v-3"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

const ListIcon: React.FC<IconProps> = ({ className, title, ...rest }) => (
  <svg {...baseSvgProps} className={className} role="img" aria-label={title ?? "List"} {...rest}>
    {title ? <title>{title}</title> : null}
    <path d="M8 7h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M8 12h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M8 17h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M5 7h.01M5 12h.01M5 17h.01" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

const CheckListIcon: React.FC<IconProps> = ({ className, title, ...rest }) => (
  <svg {...baseSvgProps} className={className} role="img" aria-label={title ?? "Settled"} {...rest}>
    {title ? <title>{title}</title> : null}
    <path d="M9 7h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M9 12h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M9 17h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path
      d="M4.5 7.2l1 1 2-2.2"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 12.2l1 1 2-2.2"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ICONS: Record<PermissionIconId, React.FC<IconProps>> = {
  eye: EyeIcon,
  plus_square: PlusSquareIcon,
  minus_square: MinusSquareIcon,
  pencil: PencilIcon,
  trash: TrashIcon,
  swap: SwapIcon,
  table: TableIcon,
  sliders: SlidersIcon,
  chart: ChartIcon,
  list: ListIcon,
  check_list: CheckListIcon,
};

type PermissionIconProps = { code: string } & Omit<IconProps, "title">;

export const PermissionIcon: React.FC<PermissionIconProps> = ({ code, className, ...rest }) => {
  const id = useMemo(() => getPermissionIconId(code), [code]);
  const Icon = ICONS[id];
  return <Icon className={className} {...rest} />;
};
