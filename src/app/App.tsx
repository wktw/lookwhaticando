import { PetArt } from '@/art/pets/PetArt';

/** Temporary shell; replaced by the real app shell in wave 1 (fx-ui module). */
export function App() {
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', gap: '12px' }}>
      <PetArt petId="pet-mochi" size={180} animated title="Mochi" />
      <h1>Mochi Meadow</h1>
    </main>
  );
}
