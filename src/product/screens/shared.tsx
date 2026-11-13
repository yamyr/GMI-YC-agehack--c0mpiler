import type { Account } from "../model/types";
import { type ServiceName, serviceStatuses } from "../ports";
import type { RouteName, RouteParams } from "../routes";
import type { Context } from "../usecases/context";

/** What every signed-in screen is given. Screens call use cases with `ctx`; never a port. */
export interface ScreenProps {
  readonly ctx: Context;
  readonly account: Account;
  readonly params: RouteParams;
  /** Go to another page. */
  readonly go: (name: RouteName, params?: RouteParams) => void;
  /** Re-read the signed-in account after a use case changed it. */
  readonly refresh: () => Promise<void>;
}

/**
 * The label a screen shows when what is on it depends on a stand-in (FR-022). The dashed border
 * is the same mark Agely uses for drafts and demo data.
 */
export function StandIn({ ctx, service, children }: { readonly ctx: Context; readonly service: ServiceName; readonly children?: React.ReactNode }) {
  const status = serviceStatuses(ctx.ports).find((s) => s.service === service);
  if (status === undefined || status.connected) return <>{children}</>;
  return (
    <div className="stand-in" data-stand-in={service}>
      <p>{status.label}</p>
      {children}
    </div>
  );
}
