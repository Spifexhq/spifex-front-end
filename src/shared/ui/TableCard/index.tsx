import type { ReactNode } from "react";
import classNames from "classnames";
import Card from "@/shared/ui/Card";

export type TableCardProps = {
  title: ReactNode;
  /** Explanation shown from the info icon next to the title. */
  tooltip?: ReactNode;
  /** Accessible name for the tooltip trigger; defaults to the title when it is a string. */
  tooltipLabel?: string;
  /** Optional right-side controls: buttons, badges, links. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

/**
 * One surface for a titled table: the card is the frame, the table renders
 * flush inside it. Use with `<DataTable frame={false} />` so borders do not
 * stack. Title, actions and tooltip share the same header as `Card`.
 */
export default function TableCard({
  title,
  tooltip,
  tooltipLabel,
  actions,
  children,
  className,
  bodyClassName,
}: TableCardProps) {
  return (
    <Card
      as="section"
      radius="xl"
      tone="slate"
      padding="none"
      title={title}
      tooltip={tooltip}
      tooltipLabel={tooltipLabel}
      actions={actions}
      className={classNames("overflow-hidden", className)}
      bodyClassName={classNames("[&_td:first-child]:pl-5 [&_th:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:last-child]:pr-5", bodyClassName)}
    >
      {children}
    </Card>
  );
}
