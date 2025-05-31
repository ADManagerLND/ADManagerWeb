import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import matchers from '@testing-library/jest-dom/matchers';

// Étend les assertions Vitest avec les matchers spécifiques au DOM de jest-dom
expect.extend(matchers);

// Nettoie automatiquement après chaque test
afterEach(() => {
  cleanup();
}); 