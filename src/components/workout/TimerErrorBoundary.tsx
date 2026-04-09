import { Component, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { getTheme } from "@/lib/colors";

interface Props {
  blockName: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * Error boundary for timer-based blocks (EMOM, Interval/Sprint).
 * Catches JS runtime errors during render so the whole workout page
 * doesn't go blank. Shows a retry button instead.
 */
export class TimerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || "Error desconocido" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[${this.props.blockName}] Render error:`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      const t = getTheme();
      return (
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-4">
          <p className="font-body text-sm text-foreground text-center">
            Hubo un error cargando {this.props.blockName}
          </p>
          {this.state.errorMessage && (
            <p className="font-mono text-[10px] text-muted-foreground text-center max-w-xs break-all">
              {this.state.errorMessage}
            </p>
          )}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-colors"
            style={{ backgroundColor: t.accent, color: t.btnText }}
          >
            <RotateCcw className="w-4 h-4" />
            <span className="font-body text-sm">Reintentar</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
