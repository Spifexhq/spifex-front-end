import type { ElementType, HTMLAttributes, ReactNode } from "react";
import classNames from "classnames";

export type CardTone = "panel" | "slate" | "metric";
export type CardPadding = "none" | "compact" | "default" | "spacious";
export type CardRadius = "lg" | "xl";

export type CardProps = {
  as?: ElementType;
  tone?: CardTone;
  padding?: CardPadding;
  radius?: CardRadius;
  header?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "title">;

const PADDING: Record<CardPadding, string> = {
  none: "",
  compact: "p-4",
  default: "p-5",
  spacious: "p-6",
};

const RADIUS: Record<CardRadius, string> = {
  lg: "rounded-lg",
  xl: "rounded-xl",
};

const TONE: Record<CardTone, string> = {
  panel: "border-gray-200 bg-white",
  slate: "border-slate-200 bg-white",
  metric: "border-gray-200 bg-white shadow-sm",
};

/**
 * Shared surface for bordered cards and panels. With no header/footer the
 * padding is applied to the root, matching the existing one-element recipe.
 */
export default function Card({
  as: Tag = "section",
  tone = "panel",
  padding = "default",
  radius = "lg",
  header,
  title,
  description,
  actions,
  footer,
  className,
  bodyClassName,
  children,
  ...rest
}: CardProps) {
  const hasHeader = Boolean(header || title || description || actions);
  const hasFrame = hasHeader || Boolean(footer);
  const divider = tone === "slate" ? "border-slate-100" : "border-gray-100";
  const contentPadding = PADDING[padding];

  return (
    <Tag
      className={classNames(
        "min-w-0 border",
        RADIUS[radius],
        TONE[tone],
        !hasFrame && contentPadding,
        !hasFrame && bodyClassName,
        className
      )}
      {...rest}
    >
      {hasHeader ? (
        <header className={classNames("flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3", divider)}>
          <div className="min-w-0 flex-1">
            {header ?? (
              <>
                {title ? <h2 className="text-[13px] font-semibold text-gray-900">{title}</h2> : null}
                {description ? <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p> : null}
              </>
            )}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}

      {hasFrame ? <div className={classNames(contentPadding, bodyClassName)}>{children}</div> : children}

      {footer ? <div className={classNames("border-t px-4 py-3", divider)}>{footer}</div> : null}
    </Tag>
  );
}
