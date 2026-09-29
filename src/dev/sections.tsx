import type { JSX } from 'preact';

export interface GallerySection {
  id: string;
  title: string;
  render: (params: URLSearchParams) => JSX.Element;
}

/**
 * Shared gallery sections. Each art module contributes its own in src/dev/sections-<module>.tsx
 * (auto-discovered by gallery.tsx); the pets live in sections-pets.tsx.
 */
export const GALLERY_SECTIONS: GallerySection[] = [];
