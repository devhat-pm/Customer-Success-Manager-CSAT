import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Alert,
  Typography,
  Breadcrumb,
  Row,
  Col,
  Spin,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { ticketsApi, getErrorMessage } from '@/api';
import { TicketPriority } from '@/types';
import { showSuccess, showError } from '@/stores/uiStore';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface TicketFormData {
  subject: string;
  description: string;
  product: string;
  priority: TicketPriority;
}

const priorityDescriptions: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'General questions or minor issues - Response within 72 hours',
  [TicketPriority.MEDIUM]: 'Standard issues affecting work - Response within 24 hours',
  [TicketPriority.HIGH]: 'Major issues affecting operations - Response within 8 hours',
  [TicketPriority.CRITICAL]: 'System down or major business impact - Response within 4 hours',
};

const CreateTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const selectedPriority = Form.useWatch('priority', form) as TicketPriority | undefined;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await ticketsApi.getAvailableProducts();
        setAvailableProducts(data.products);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const onFinish = async (values: TicketFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const ticket = await ticketsApi.createTicket(values);
      showSuccess('Ticket created successfully!');
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fade-in">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item>
          <a onClick={() => navigate('/tickets')}>Tickets</a>
        </Breadcrumb.Item>
        <Breadcrumb.Item>New Ticket</Breadcrumb.Item>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/tickets')}
        >
          Back
        </Button>
        <div>
          <Title level={3} style={{ marginBottom: 0 }}>
            Create New Ticket
          </Title>
          <Text type="secondary">
            Submit a support request and our team will assist you
          </Text>
        </div>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          className="mb-6"
          onClose={() => setError(null)}
        />
      )}

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            priority: TicketPriority.MEDIUM,
          }}
          size="large"
        >
          <Row gutter={24}>
            {/* Subject */}
            <Col xs={24}>
              <Form.Item
                name="subject"
                label="Subject"
                rules={[
                  { required: true, message: 'Subject is required' },
                  { min: 5, message: 'Subject must be at least 5 characters' },
                  { max: 200, message: 'Subject must be less than 200 characters' },
                ]}
              >
                <Input placeholder="Brief summary of your issue" />
              </Form.Item>
            </Col>

            {/* Product */}
            <Col xs={24} md={12}>
              <Form.Item
                name="product"
                label="Product"
                rules={[{ required: true, message: 'Please select a product' }]}
                extra="Select the product related to your issue"
              >
                <Select
                  placeholder={isLoadingProducts ? 'Loading products...' : 'Select a product'}
                  loading={isLoadingProducts}
                  disabled={isLoadingProducts}
                  notFoundContent={isLoadingProducts ? <Spin size="small" /> : 'No products available'}
                >
                  {availableProducts.map((product) => (
                    <Select.Option key={product} value={product}>
                      {product}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            {/* Priority */}
            <Col xs={24} md={12}>
              <Form.Item
                name="priority"
                label="Priority"
                rules={[{ required: true, message: 'Please select a priority' }]}
                extra={selectedPriority ? priorityDescriptions[selectedPriority] : undefined}
              >
                <Select placeholder="Select priority">
                  {Object.values(TicketPriority).map((priority) => (
                    <Select.Option key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            {/* Description */}
            <Col xs={24}>
              <Form.Item
                name="description"
                label="Description"
                rules={[
                  { required: true, message: 'Description is required' },
                  { min: 20, message: 'Please provide more details (at least 20 characters)' },
                ]}
              >
                <TextArea
                  rows={6}
                  placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, and what you expected to happen."
                />
              </Form.Item>
            </Col>

            {/* Tips Box */}
            <Col xs={24}>
              <Alert
                message="Tips for faster resolution"
                description={
                  <ul className="list-disc pl-4 mb-0">
                    <li>Include any error messages you see</li>
                    <li>Describe the steps that led to the issue</li>
                    <li>Mention what you expected to happen</li>
                    <li>Include your browser and operating system if relevant</li>
                  </ul>
                }
                type="info"
                showIcon
              />
            </Col>

            {/* Submit Buttons */}
            <Col xs={24}>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  onClick={() => navigate('/tickets')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isSubmitting}
                  disabled={isLoadingProducts}
                >
                  Create Ticket
                </Button>
              </div>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

export default CreateTicketPage;
