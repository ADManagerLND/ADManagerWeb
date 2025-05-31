import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test/test-utils';
import AuthButton from './AuthButton';
import { useMsal } from '@azure/msal-react';

// Mock du hook useMsal
vi.mock('@azure/msal-react', () => ({
  useMsal: vi.fn()
}));

describe('AuthButton', () => {
  // Fonctions de mock pour les méthodes de l'instance MSAL
  const loginPopupMock = vi.fn().mockResolvedValue({});
  const logoutPopupMock = vi.fn().mockResolvedValue({});
  
  // Réinitialisation des mocks avant chaque test
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('affiche "Se connecter" quand aucun compte n\'est connecté', () => {
    // Mock pour l'état non connecté
    (useMsal as any).mockReturnValue({
      instance: { loginPopup: loginPopupMock },
      accounts: []
    });
    
    render(<AuthButton />);
    
    // Vérifier que le bouton affiche "Se connecter"
    expect(screen.getByRole('button')).toHaveTextContent('Se connecter');
    
    // Vérifier que le type de bouton est "primary"
    expect(screen.getByRole('button')).toHaveClass('ant-btn-primary');
  });
  
  it('affiche "Se déconnecter" quand un compte est connecté', () => {
    // Mock pour l'état connecté
    (useMsal as any).mockReturnValue({
      instance: { logoutPopup: logoutPopupMock },
      accounts: [{ name: 'Test User' }]
    });
    
    render(<AuthButton />);
    
    // Vérifier que le bouton affiche "Se déconnecter"
    expect(screen.getByRole('button')).toHaveTextContent('Se déconnecter');
    
    // Vérifier que le type de bouton est "default"
    expect(screen.getByRole('button')).not.toHaveClass('ant-btn-primary');
  });
  
  it('appelle loginPopup quand on clique sur "Se connecter"', async () => {
    // Mock pour l'état non connecté
    (useMsal as any).mockReturnValue({
      instance: { loginPopup: loginPopupMock },
      accounts: []
    });
    
    render(<AuthButton />);
    
    // Cliquer sur le bouton
    fireEvent.click(screen.getByRole('button'));
    
    // Vérifier que loginPopup a été appelé
    expect(loginPopupMock).toHaveBeenCalledTimes(1);
  });
  
  it('appelle logoutPopup quand on clique sur "Se déconnecter"', async () => {
    // Mock pour l'état connecté
    (useMsal as any).mockReturnValue({
      instance: { logoutPopup: logoutPopupMock },
      accounts: [{ name: 'Test User' }]
    });
    
    render(<AuthButton />);
    
    // Cliquer sur le bouton
    fireEvent.click(screen.getByRole('button'));
    
    // Vérifier que logoutPopup a été appelé
    expect(logoutPopupMock).toHaveBeenCalledTimes(1);
    // Vérifier les arguments
    expect(logoutPopupMock).toHaveBeenCalledWith({
      postLogoutRedirectUri: window.location.origin
    });
  });
}); 