import { Component, type ComponentChildren } from 'preact';
import { PetArt } from '@/art/pets/PetArt';
import { CandyButton } from '@/ui/CandyButton';
import { EmptyState } from '@/ui/EmptyState';

interface State {
  error: unknown;
}

/** What a screen shows instead of crashing the app. */
export function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      title="Oops, a little tangle"
      tone="lavender"
      art={<PetArt petId="pet-mochi" expression="surprised" size={104} />}
      action={
        <CandyButton tone="lavender" onClick={onRetry}>
          Try again
        </CandyButton>
      }
    >
      Something on this page tripped over its own paws. Your data is safe.
    </EmptyState>
  );
}

/** Keeps one screen's bug from blanking the whole app: a friendly card with a retry. */
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
