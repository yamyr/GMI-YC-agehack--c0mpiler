import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  readonly children: ReactNode;
}

interface AppErrorBoundaryState {
  readonly message: string;
}

export function describeRenderFailure(error: unknown): string {
  if (error instanceof Error && error.message !== "") return error.message;
  const described = String(error);
  return described === "" ? "Unknown error" : described;
}

/**
 * Last resort for a render that throws.
 *
 * Without a boundary, React 19 unmounts the whole tree when any render throws:
 * the user is left on a permanently blank page with no text, no error
 * and no way back short of force-quitting. On an iPad that is a real risk
 * rather than a theoretical one — WKWebView's `localStorage` accessors throw
 * `SecurityError` when the web-site data store is non-persistent, which a
 * `typeof localStorage` guard does not catch, and that read happens during the
 * very first render.
 *
 * Deliberately self-contained (no providers, no i18n): it renders when any of
 * those may be what failed, so it cannot depend on them.
 */
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  override state: AppErrorBoundaryState = { message: "" };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { message: describeRenderFailure(error) };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("c0mpiler failed to render:", error, info.componentStack);
  }

  override render() {
    if (this.state.message === "") return this.props.children;
    return (
      <main className="app-crash" role="alert">
        <h1>c0mpiler could not start</h1>
        <p>
          Something went wrong while drawing the screen. Nothing has
          been sent anywhere.
        </p>
        <p className="app-crash__detail">{this.state.message}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </main>
    );
  }
}
