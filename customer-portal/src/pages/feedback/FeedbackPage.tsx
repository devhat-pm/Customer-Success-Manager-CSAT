import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Rate,
  Typography,
  Row,
  Col,
  List,
  Tag,
  Empty,
  Skeleton,
  Alert,
  Tabs,
  Badge,
  Space,
} from 'antd';
import {
  StarOutlined,
  SendOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  FormOutlined,
} from '@ant-design/icons';
import { feedbackApi, getErrorMessage } from '@/api';
import { PendingSurvey, FeedbackHistoryItem, SurveyType } from '@/types';
import { showSuccess, showError } from '@/stores/uiStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface VoluntaryFeedbackForm {
  survey_type: SurveyType;
  score: number;
  feedback_text: string;
  product?: string;
  anonymous?: boolean;
}

const FeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [pendingSurveys, setPendingSurveys] = useState<PendingSurvey[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackHistoryItem[]>([]);
  const [isLoadingSurveys, setIsLoadingSurveys] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('submit');

  useEffect(() => {
    fetchPendingSurveys();
    fetchFeedbackHistory();
  }, []);

  const fetchPendingSurveys = async () => {
    try {
      const data = await feedbackApi.getPendingSurveys();
      setPendingSurveys(data.surveys);
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setIsLoadingSurveys(false);
    }
  };

  const fetchFeedbackHistory = async () => {
    try {
      const data = await feedbackApi.getFeedbackHistory();
      setFeedbackHistory(data.feedback);
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const onSubmitFeedback = async (values: VoluntaryFeedbackForm) => {
    setIsSubmitting(true);
    try {
      await feedbackApi.submitVoluntaryFeedback(values);
      showSuccess('Thank you for your feedback!');
      form.resetFields();
      fetchFeedbackHistory();
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSurveyTypeLabel = (type: SurveyType) => {
    switch (type) {
      case SurveyType.CSAT: return 'Satisfaction Survey';
      case SurveyType.NPS: return 'Net Promoter Score';
      case SurveyType.CES: return 'Customer Effort Score';
      case SurveyType.ONBOARDING: return 'Onboarding Feedback';
      case SurveyType.FEATURE: return 'Feature Feedback';
      default: return type;
    }
  };

  const getSurveyTypeColor = (type: SurveyType) => {
    switch (type) {
      case SurveyType.CSAT: return 'blue';
      case SurveyType.NPS: return 'purple';
      case SurveyType.CES: return 'orange';
      case SurveyType.ONBOARDING: return 'green';
      case SurveyType.FEATURE: return 'cyan';
      default: return 'default';
    }
  };

  const tabItems = [
    {
      key: 'submit',
      label: (
        <span>
          <FormOutlined />
          Submit Feedback
        </span>
      ),
      children: (
        <Row gutter={24}>
          <Col xs={24} lg={14}>
            <Card title="Share Your Feedback">
              <Paragraph type="secondary" className="mb-6">
                We value your feedback! Help us improve our products and services by sharing your thoughts.
              </Paragraph>

              <Form
                form={form}
                layout="vertical"
                onFinish={onSubmitFeedback}
                initialValues={{ score: 5, survey_type: SurveyType.GENERAL_FEEDBACK }}
                size="large"
              >
                <Form.Item
                  name="survey_type"
                  label="Feedback Type"
                  rules={[{ required: true, message: 'Please select feedback type' }]}
                >
                  <Select placeholder="What would you like to give feedback about?">
                    <Select.Option value={SurveyType.GENERAL_FEEDBACK}>General Feedback</Select.Option>
                    <Select.Option value={SurveyType.PRODUCT_FEEDBACK}>Product Feedback</Select.Option>
                    <Select.Option value={SurveyType.CSAT}>Satisfaction Survey</Select.Option>
                    <Select.Option value={SurveyType.FEATURE}>Feature Suggestion</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="product"
                  label="Related Product (Optional)"
                >
                  <Select placeholder="Select product" allowClear>
                    <Select.Option value="MonetX">MonetX</Select.Option>
                    <Select.Option value="MonetX_Recon">MonetX Recon</Select.Option>
                    <Select.Option value="SupportX">SupportX</Select.Option>
                    <Select.Option value="PartnerLearn">PartnerLearn</Select.Option>
                    <Select.Option value="AgentShield">AgentShield</Select.Option>
                    <Select.Option value="ToolshubPro">ToolshubPro</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="score"
                  label="Overall Rating"
                  rules={[{ required: true, message: 'Please provide a rating' }]}
                >
                  <Rate
                    allowHalf
                    style={{ fontSize: 32 }}
                    character={<StarOutlined />}
                  />
                </Form.Item>

                <Form.Item
                  name="feedback_text"
                  label="Your Feedback"
                  rules={[
                    { required: true, message: 'Please enter your feedback' },
                    { min: 10, message: 'Please provide more details (at least 10 characters)' },
                  ]}
                >
                  <TextArea
                    rows={5}
                    placeholder="Tell us what's on your mind..."
                    showCount
                    maxLength={2000}
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SendOutlined />}
                    loading={isSubmitting}
                    size="large"
                  >
                    Submit Feedback
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card
              title={
                <Space>
                  <ClockCircleOutlined />
                  Pending Surveys
                  {pendingSurveys.length > 0 && (
                    <Badge count={pendingSurveys.length} style={{ backgroundColor: '#9c27b0' }} />
                  )}
                </Space>
              }
            >
              {isLoadingSurveys ? (
                <Skeleton active paragraph={{ rows: 3 }} />
              ) : pendingSurveys.length > 0 ? (
                <List
                  itemLayout="horizontal"
                  dataSource={pendingSurveys}
                  renderItem={(survey) => (
                    <List.Item
                      actions={[
                        <Button
                          type="primary"
                          size="small"
                          onClick={() => navigate(`/survey/${survey.token}`)}
                        >
                          Take Survey
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<StarOutlined style={{ fontSize: 24, color: '#faad14' }} />}
                        title={
                          <Space>
                            <Text strong>{getSurveyTypeLabel(survey.survey_type)}</Text>
                            <Tag color={getSurveyTypeColor(survey.survey_type)}>
                              {survey.survey_type}
                            </Tag>
                          </Space>
                        }
                        description={
                          <div>
                            {survey.linked_ticket_number && (
                              <Text type="secondary">
                                Related to ticket: {survey.linked_ticket_number}
                              </Text>
                            )}
                            <br />
                            <Text type="secondary" className="text-xs">
                              Expires {dayjs(survey.expires_at).fromNow()}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty
                  description="No pending surveys"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <CheckCircleOutlined />
          Feedback History
        </span>
      ),
      children: (
        <Card>
          {isLoadingHistory ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : feedbackHistory.length > 0 ? (
            <List
              itemLayout="vertical"
              dataSource={feedbackHistory}
              pagination={{
                pageSize: 10,
                showTotal: (total) => `Total ${total} feedback entries`,
              }}
              renderItem={(item) => (
                <List.Item>
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <Space className="mb-2">
                        <Tag color="purple">{item.feedback_type}</Tag>
                        {item.product && <Tag>{item.product}</Tag>}
                        <Rate disabled defaultValue={item.rating} style={{ fontSize: 14 }} />
                      </Space>
                      <Paragraph className="mb-1">{item.feedback_text}</Paragraph>
                      {item.response && (
                        <Alert
                          message="Response from Extravis"
                          description={item.response}
                          type="info"
                          className="mt-2"
                        />
                      )}
                    </div>
                    <Text type="secondary" className="text-xs whitespace-nowrap">
                      {dayjs(item.submitted_at).format('MMM D, YYYY')}
                    </Text>
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Empty
              description="No feedback submitted yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => setActiveTab('submit')}>
                Submit Your First Feedback
              </Button>
            </Empty>
          )}
        </Card>
      ),
    },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-6">
        <Title level={3} style={{ marginBottom: 4 }}>
          Feedback & Surveys
        </Title>
        <Text type="secondary">
          Share your thoughts and help us improve
        </Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  );
};

export default FeedbackPage;
