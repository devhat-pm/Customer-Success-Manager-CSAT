import React, { useState } from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Collapse,
  Input,
  Button,
  Divider,
  Space,
  Tag,
  Alert,
} from 'antd';
import {
  QuestionCircleOutlined,
  SearchOutlined,
  MailOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  BookOutlined,
  CustomerServiceOutlined,
  RocketOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph, Link } = Typography;
const { Panel } = Collapse;

interface FAQItem {
  key: string;
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    key: '1',
    question: 'How do I create a support ticket?',
    answer: 'Navigate to the Tickets section and click "New Ticket". Fill out the form with details about your issue, select the priority level, and submit. Our support team will respond based on your service level agreement.',
    category: 'tickets',
  },
  {
    key: '2',
    question: 'What are the different priority levels?',
    answer: 'We have four priority levels: Critical (system down, 4-hour response), High (major issues, 8-hour response), Medium (standard issues, 24-hour response), and Low (general questions, 72-hour response).',
    category: 'tickets',
  },
  {
    key: '3',
    question: 'How can I check my ticket status?',
    answer: 'Go to the Tickets section to see all your tickets. Click on any ticket to view its details, conversation history, and current status. You\'ll also receive email notifications when there are updates.',
    category: 'tickets',
  },
  {
    key: '4',
    question: 'What is the Health Score?',
    answer: 'Your Health Score is a measure of your overall account health, calculated based on factors like product usage, support interactions, and engagement. A higher score indicates a healthier customer relationship.',
    category: 'account',
  },
  {
    key: '5',
    question: 'How do I update my profile information?',
    answer: 'Go to the Profile section, click the Edit button, make your changes, and save. You can update your name, phone number, and other personal details.',
    category: 'account',
  },
  {
    key: '6',
    question: 'How do I change my password?',
    answer: 'Navigate to Profile > Security tab. Enter your current password, then your new password twice. Passwords must be at least 8 characters with uppercase, lowercase, and numbers.',
    category: 'account',
  },
  {
    key: '7',
    question: 'What products do I have access to?',
    answer: 'Visit the Products section to see all products deployed for your organization, including their status, version, and usage information.',
    category: 'products',
  },
  {
    key: '8',
    question: 'How do I provide feedback?',
    answer: 'Go to the Feedback section where you can submit voluntary feedback or complete pending surveys. Your feedback helps us improve our products and services.',
    category: 'feedback',
  },
  {
    key: '9',
    question: 'What are surveys and why should I complete them?',
    answer: 'Surveys help us measure your satisfaction and experience. They\'re typically short (1-2 minutes) and may be sent after support interactions or at regular intervals. Your responses directly influence our service improvements.',
    category: 'feedback',
  },
  {
    key: '10',
    question: 'How do I contact my Account Manager?',
    answer: 'Your Account Manager\'s contact information is displayed on your Dashboard. You can also reach them through any support ticket by selecting high priority for account-related questions.',
    category: 'support',
  },
];

const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { key: 'tickets', label: 'Tickets & Support', icon: <CustomerServiceOutlined /> },
    { key: 'account', label: 'Account & Profile', icon: <SettingOutlined /> },
    { key: 'products', label: 'Products', icon: <RocketOutlined /> },
    { key: 'feedback', label: 'Feedback & Surveys', icon: <BookOutlined /> },
    { key: 'support', label: 'Contact Support', icon: <TeamOutlined /> },
  ];

  const filteredFAQs = faqData.filter((faq) => {
    const matchesSearch = !searchTerm ||
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-6">
        <Title level={3} style={{ marginBottom: 4 }}>
          Help Center
        </Title>
        <Text type="secondary">
          Find answers to common questions and get support
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Search & Quick Links */}
        <Col xs={24}>
          <Card>
            <div className="text-center py-4">
              <QuestionCircleOutlined style={{ fontSize: 48, color: '#9c27b0', marginBottom: 16 }} />
              <Title level={4}>How can we help you today?</Title>
              <Input
                size="large"
                placeholder="Search for help..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ maxWidth: 500 }}
                allowClear
              />
            </div>

            <Divider />

            {/* Category Filters */}
            <div className="text-center">
              <Space wrap>
                <Tag.CheckableTag
                  checked={!selectedCategory}
                  onChange={() => setSelectedCategory(null)}
                >
                  All Topics
                </Tag.CheckableTag>
                {categories.map((cat) => (
                  <Tag.CheckableTag
                    key={cat.key}
                    checked={selectedCategory === cat.key}
                    onChange={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
                  >
                    {cat.icon} {cat.label}
                  </Tag.CheckableTag>
                ))}
              </Space>
            </div>
          </Card>
        </Col>

        {/* FAQ Section */}
        <Col xs={24} lg={16}>
          <Card title={<><BookOutlined /> Frequently Asked Questions</>}>
            {filteredFAQs.length > 0 ? (
              <Collapse
                accordion
                expandIconPosition="end"
                className="bg-white"
              >
                {filteredFAQs.map((faq) => (
                  <Panel
                    header={
                      <Space>
                        <QuestionCircleOutlined style={{ color: '#9c27b0' }} />
                        <Text strong>{faq.question}</Text>
                      </Space>
                    }
                    key={faq.key}
                  >
                    <Paragraph className="mb-0">{faq.answer}</Paragraph>
                    <Tag color="purple" className="mt-2">
                      {categories.find(c => c.key === faq.category)?.label}
                    </Tag>
                  </Panel>
                ))}
              </Collapse>
            ) : (
              <Alert
                message="No results found"
                description="Try adjusting your search terms or category filter."
                type="info"
                showIcon
              />
            )}
          </Card>
        </Col>

        {/* Contact & Quick Actions */}
        <Col xs={24} lg={8}>
          <Card title={<><CustomerServiceOutlined /> Contact Support</>} className="mb-6">
            <Space direction="vertical" className="w-full" size="middle">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#f0e6ff' }}
                >
                  <MailOutlined style={{ color: '#9c27b0' }} />
                </div>
                <div>
                  <Text strong className="block">Email</Text>
                  <Link href="mailto:support@extravis.io">support@extravis.io</Link>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#e6f7ff' }}
                >
                  <PhoneOutlined style={{ color: '#2196f3' }} />
                </div>
                <div>
                  <Text strong className="block">Phone</Text>
                  <Link href="tel:+1-800-123-4567">+1-800-123-4567</Link>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#fff7e6' }}
                >
                  <ClockCircleOutlined style={{ color: '#fa8c16' }} />
                </div>
                <div>
                  <Text strong className="block">Support Hours</Text>
                  <Text type="secondary">Mon-Fri: 8AM - 8PM EST</Text>
                </div>
              </div>
            </Space>

            <Divider />

            <Button
              type="primary"
              block
              size="large"
              onClick={() => navigate('/tickets/new')}
            >
              Create Support Ticket
            </Button>
          </Card>

          <Card title={<><RocketOutlined /> Quick Links</>}>
            <Space direction="vertical" className="w-full">
              <Button
                type="text"
                block
                className="text-left"
                onClick={() => navigate('/tickets')}
              >
                <CustomerServiceOutlined className="mr-2" />
                View My Tickets
              </Button>
              <Button
                type="text"
                block
                className="text-left"
                onClick={() => navigate('/products')}
              >
                <RocketOutlined className="mr-2" />
                My Products
              </Button>
              <Button
                type="text"
                block
                className="text-left"
                onClick={() => navigate('/feedback')}
              >
                <BookOutlined className="mr-2" />
                Submit Feedback
              </Button>
              <Button
                type="text"
                block
                className="text-left"
                onClick={() => navigate('/profile')}
              >
                <SettingOutlined className="mr-2" />
                Account Settings
              </Button>
            </Space>
          </Card>

          <Card className="mt-6" style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
            <div className="text-center">
              <SafetyOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
              <Title level={5} style={{ marginBottom: 8 }}>Need Urgent Help?</Title>
              <Paragraph type="secondary" className="mb-0">
                For critical issues affecting your business, create a ticket with <Tag color="red">Critical</Tag> priority for fastest response.
              </Paragraph>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HelpPage;
