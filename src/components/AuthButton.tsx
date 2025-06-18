import React, {useState} from 'react';
import {Button} from 'antd';

const AuthButton: React.FC = () => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleLogout = () => {
        if (isProcessing) return;

        setIsProcessing(true);

        // Approche plus directe de déconnexion
        window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
    };

    return (
        <Button
            onClick={handleLogout}
            loading={isProcessing}
            disabled={isProcessing}
        >
            Se déconnecter
        </Button>
    );
};

export default AuthButton; 