import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import apiClient from '../services/api/apiClient';
import { Button, Card, Typography, Alert, Spin, Space, Divider, Tabs } from 'antd';
import { LoadingOutlined, ApiOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';

// Composant de test pour l'API
const ApiTest: React.FC = () => {
  const { instance } = useMsal();
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<any>(null);
  const [publicResponse, setPublicResponse] = useState<any>(null);
  const [isPublicLoading, setIsPublicLoading] = useState(false);

  const { Title, Text } = Typography;
  const { TabPane } = Tabs;
  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  // Vérifier l'état de l'authentification au chargement
  useEffect(() => {
    const accounts = instance.getAllAccounts();
    if (accounts.length > 0) {
      setAuthInfo({
        username: accounts[0].username,
        name: accounts[0].name,
        isAuthenticated: true
      });
    } else {
      setAuthInfo({
        isAuthenticated: false
      });
    }
  }, [instance]);

  // Fonction pour tester l'API protégée
  const testProtectedApi = async () => {
    setIsLoading(true);
    setError(null);
    setApiResponse(null);

    try {
      // Tester l'endpoint protégé
      const response = await apiClient.get('/test');
      setApiResponse(response.data);
    } catch (err: any) {
      console.error('API Test Error:', err);
      setError(
        err.response 
          ? `Erreur API (${err.response.status}): ${err.response.data?.message || err.message}`
          : `Erreur: ${err.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour tester l'API publique
  const testPublicApi = async () => {
    setIsPublicLoading(true);
    setError(null);
    setPublicResponse(null);

    try {
      // Tester l'endpoint public
      const response = await apiClient.get('/test/public');
      setPublicResponse(response.data);
    } catch (err: any) {
      console.error('Public API Test Error:', err);
      setError(
        err.response 
          ? `Erreur API publique (${err.response.status}): ${err.response.data?.message || err.message}`
          : `Erreur API publique: ${err.message}`
      );
    } finally {
      setIsPublicLoading(false);
    }
  };

  // Fonction pour se connecter
  const handleLogin = async () => {
    try {
      await instance.loginRedirect();
    } catch (err: any) {
      setError(`Erreur de connexion: ${err.message}`);
    }
  };

  // Fonction pour se déconnecter
  const handleLogout = async () => {
    try {
      await instance.logoutRedirect();
    } catch (err: any) {
      setError(`Erreur de déconnexion: ${err.message}`);
    }
  };

  return (
    <Card style={{ maxWidth: 800, margin: '24px auto' }}>
      <Title level={4}>Test de connexion API</Title>

      {/* Afficher l'état de l'authentification */}
      <div style={{ marginBottom: 16 }}>
        <Text strong>État de l'authentification:</Text>
        {authInfo && (
          <Alert
            style={{ marginTop: 8 }}
            type={authInfo.isAuthenticated ? "success" : "warning"}
            message={authInfo.isAuthenticated 
              ? `Connecté en tant que ${authInfo.name || authInfo.username}`
              : "Non connecté"}
          />
        )}
      </div>

      {/* Actions d'authentification */}
      <Space style={{ marginBottom: 16 }}>
        {!authInfo?.isAuthenticated ? (
          <Button type="primary" onClick={handleLogin} icon={<LockOutlined />}>
            Se connecter
          </Button>
        ) : (
          <Button onClick={handleLogout} icon={<UnlockOutlined />}>
            Se déconnecter
          </Button>
        )}
      </Space>

      <Divider />

      <Tabs defaultActiveKey="protected">
        <TabPane tab={<span><LockOutlined /> API Protégée</span>} key="protected">
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              onClick={testProtectedApi} 
              disabled={isLoading || !authInfo?.isAuthenticated}
              icon={isLoading ? <Spin indicator={antIcon} /> : <ApiOutlined />}
            >
              {isLoading ? "Chargement..." : "Tester l'API protégée"}
            </Button>
            <Text style={{ marginLeft: 16 }}>
              Nécessite une authentification Azure AD
            </Text>
          </div>

          {apiResponse && (
            <div style={{ marginTop: 16 }}>
              <Text strong>Réponse de l'API protégée:</Text>
              <div 
                style={{ 
                  background: '#f5f5f5', 
                  padding: 16, 
                  borderRadius: 4, 
                  marginTop: 8,
                  maxHeight: 400,
                  overflow: 'auto'
                }}
              >
                <pre style={{ margin: 0 }}>
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </TabPane>

        <TabPane tab={<span><UnlockOutlined /> API Publique</span>} key="public">
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              onClick={testPublicApi} 
              disabled={isPublicLoading}
              icon={isPublicLoading ? <Spin indicator={antIcon} /> : <ApiOutlined />}
            >
              {isPublicLoading ? "Chargement..." : "Tester l'API publique"}
            </Button>
            <Text style={{ marginLeft: 16 }}>
              Ne nécessite pas d'authentification
            </Text>
          </div>

          {publicResponse && (
            <div style={{ marginTop: 16 }}>
              <Text strong>Réponse de l'API publique:</Text>
              <div 
                style={{ 
                  background: '#f5f5f5', 
                  padding: 16, 
                  borderRadius: 4, 
                  marginTop: 8,
                  maxHeight: 400,
                  overflow: 'auto'
                }}
              >
                <pre style={{ margin: 0 }}>
                  {JSON.stringify(publicResponse, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </TabPane>
      </Tabs>

      {/* Afficher les erreurs */}
      {error && (
        <Alert 
          style={{ marginTop: 16 }}
          type="error" 
          message={error}
        />
      )}
    </Card>
  );
};

export default ApiTest; 