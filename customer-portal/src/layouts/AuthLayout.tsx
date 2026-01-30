import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Layout, Card, Typography } from 'antd';
import { useAuthStore } from '@/stores/authStore';

const { Content, Footer } = Layout;
const { Text } = Typography;

const AuthLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Redirect to dashboard if already authenticated
  if (isAuthenticated && !isLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div className="py-6 px-8 flex items-center gap-3">
        <img
          src="/logo.svg"
          alt="Success Manager"
          className="h-10 w-auto"
        />
      </div>

      {/* Main Content */}
      <Content
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
          flex: 1,
        }}
      >
        <Card
          style={{
            width: '100%',
            maxWidth: 440,
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
          bordered={false}
        >
          <Outlet />
        </Card>
      </Content>

      {/* Footer */}
      <Footer
        style={{
          textAlign: 'center',
          background: 'transparent',
          borderTop: '1px solid #e8e8e8',
          padding: '16px 24px',
        }}
      >
        <Text type="secondary" style={{ fontSize: '12px' }}>
          © {new Date().getFullYear()} Extravis. All rights reserved.
        </Text>
      </Footer>
    </Layout>
  );
};

export default AuthLayout;
