import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Skeleton,
  Empty,
  Alert,
  Badge,
  Descriptions,
  Button,
} from 'antd';
import {
  AppstoreOutlined,
  RocketOutlined,
  SettingOutlined,
  CloudServerOutlined,
  LinkOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { productsApi, getErrorMessage } from '@/api';
import { DeployedProduct } from '@/types';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<DeployedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await productsApi.getProducts();
      setProducts(data.products);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  const getProductIcon = (productName: string) => {
    const icons: Record<string, React.ReactNode> = {
      MonetX: <RocketOutlined />,
      MonetX_Recon: <SettingOutlined />,
      SupportX: <CloudServerOutlined />,
      PartnerLearn: <AppstoreOutlined />,
      AgentShield: <SettingOutlined />,
      ToolshubPro: <AppstoreOutlined />,
    };
    return icons[productName] || <AppstoreOutlined />;
  };

  const getProductColor = (productName: string) => {
    const colors: Record<string, string> = {
      MonetX: '#9c27b0',
      MonetX_Recon: '#2196f3',
      SupportX: '#ff9800',
      PartnerLearn: '#4caf50',
      AgentShield: '#e91e63',
      ToolshubPro: '#00bcd4',
    };
    return colors[productName] || '#9c27b0';
  };

  if (error) {
    return (
      <Alert
        message="Error loading products"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-6">
        <Title level={3} style={{ marginBottom: 4 }}>
          My Products
        </Title>
        <Text type="secondary">
          View your deployed products and their status
        </Text>
      </div>

      {/* Summary Stats */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={8}>
          <Card size="small">
            <div className="text-center">
              <Text type="secondary" className="block">Total Products</Text>
              <Title level={2} style={{ marginBottom: 0, color: '#9c27b0' }}>
                {isLoading ? '-' : products.length}
              </Title>
            </div>
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small">
            <div className="text-center">
              <Text type="secondary" className="block">Active</Text>
              <Title level={2} style={{ marginBottom: 0, color: '#52c41a' }}>
                {isLoading ? '-' : products.filter(p => p.status === 'active').length}
              </Title>
            </div>
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small">
            <div className="text-center">
              <Text type="secondary" className="block">Pending</Text>
              <Title level={2} style={{ marginBottom: 0, color: '#faad14' }}>
                {isLoading ? '-' : products.filter(p => p.status === 'pending').length}
              </Title>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Products Grid */}
      {isLoading ? (
        <Row gutter={[24, 24]}>
          {[1, 2, 3].map((i) => (
            <Col xs={24} md={12} lg={8} key={i}>
              <Card>
                <Skeleton active avatar paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : products.length > 0 ? (
        <Row gutter={[24, 24]}>
          {products.map((product, index) => (
            <Col xs={24} md={12} lg={8} key={`${product.product_name}-${index}`}>
              <Card
                hoverable
                className="h-full"
                styles={{
                  body: { padding: 0 },
                }}
              >
                {/* Product Header */}
                <div
                  className="p-4"
                  style={{ backgroundColor: getProductColor(product.product_name), color: 'white' }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                      >
                        {React.cloneElement(getProductIcon(product.product_name) as React.ReactElement, {
                          style: { fontSize: 24, color: 'white' },
                        })}
                      </div>
                      <div>
                        <Title level={4} style={{ color: 'white', marginBottom: 0 }}>
                          {product.product_name}
                        </Title>
                        {product.version && (
                          <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                            v{product.version}
                          </Text>
                        )}
                      </div>
                    </div>
                    <Badge
                      status={getStatusColor(product.status) as any}
                      text={
                        <span style={{ color: 'white', textTransform: 'capitalize' }}>
                          {product.status}
                        </span>
                      }
                    />
                  </div>
                </div>

                {/* Product Details */}
                <div className="p-4">
                  <Descriptions column={1} size="small">
                    {product.deployment_date && (
                      <Descriptions.Item label="Deployed">
                        {dayjs(product.deployment_date).format('MMM D, YYYY')}
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Status">
                      <Tag color={getStatusColor(product.status)}>
                        {product.status.toUpperCase()}
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>

                  {/* Links */}
                  {(product.documentation_url || product.release_notes_url) && (
                    <div className="mt-4 pt-4 border-t flex gap-2">
                      {product.documentation_url && (
                        <Button
                          type="link"
                          size="small"
                          icon={<FileTextOutlined />}
                          href={product.documentation_url}
                          target="_blank"
                        >
                          Docs
                        </Button>
                      )}
                      {product.release_notes_url && (
                        <Button
                          type="link"
                          size="small"
                          icon={<LinkOutlined />}
                          href={product.release_notes_url}
                          target="_blank"
                        >
                          Release Notes
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Card>
          <Empty
            description="No products deployed yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Paragraph type="secondary" className="mb-4">
              Contact your account manager to discuss product options.
            </Paragraph>
            <Button type="primary">Contact Support</Button>
          </Empty>
        </Card>
      )}
    </div>
  );
};

export default ProductsPage;
