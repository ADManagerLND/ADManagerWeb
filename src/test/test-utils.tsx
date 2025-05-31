import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Interface pour les options étendues de rendu
interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

// Wrapper avec tous les providers nécessaires
function AllTheProviders({ children, route = '/' }: { children: React.ReactNode, route?: string }) {
  // Définir la route actuelle pour les tests
  window.history.pushState({}, 'Test page', route);
  
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
}

// Fonction de rendu personnalisée avec tous les providers
function renderWithProviders(
  ui: ReactElement,
  options: ExtendedRenderOptions = {}
) {
  const { route, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: (props) => <AllTheProviders {...props} route={route} />,
    ...renderOptions,
  });
}

// Ré-exporter tout depuis testing-library
export * from '@testing-library/react';

// Remplacer la fonction render par défaut
export { renderWithProviders as render }; 