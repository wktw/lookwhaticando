import { Component, type ComponentChildren } from 'preact';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { themeLight, WateringCan } from '@/ui/art/objects';
import { SCREEN_COPY } from './copy';

interface State {
  error: unknown;
}

/** What a screen shows instead of crashing the app: a kind note and a way back. */
export function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState title={SCREEN_COPY.crashTitle} art={<WateringCan size={104} light={themeLight()} />} action={<Button onClick={onRetry}>{SCREEN_COPY.retry}</Button>}>
      {SCREEN_COPY.crashText}
    </EmptyState>
  );
}

/** Keeps one screen's bug from blanking the whole app. */
export class ErrorBoundary extends Component<{ children: ComponentChildren }, State> {
  override state: State = { error: null };

  override componentDidCatch(error: unknown) {
    console.error(error);
    this.setState({ error });
  }

  override render() {
    return this.state.error ? <ErrorFallback onRetry={() => this.setState({ error: null })} /> : this.props.children;
  }
}
