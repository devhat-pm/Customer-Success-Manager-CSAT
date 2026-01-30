import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Rate,
  Radio,
  Typography,
  Alert,
  Spin,
  Result,
  Space,
  Divider,
} from 'antd';
import {
  StarOutlined,
  SendOutlined,
  SmileOutlined,
  MehOutlined,
  FrownOutlined,
} from '@ant-design/icons';
import { feedbackApi, getErrorMessage } from '@/api';
import { SurveyType, SurveyDetails } from '@/types';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface SurveyFormData {
  score: number;
  rating?: number;
  nps_score?: number;
  ces_score?: number;
  feedback_text?: string;
}

const SurveyPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<SurveyDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSurvey();
  }, [token]);

  const fetchSurvey = async () => {
    if (!token) {
      setError('Invalid survey link');
      setIsLoading(false);
      return;
    }

    try {
      const data = await feedbackApi.getSurveyByToken(token);
      setSurvey(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: SurveyFormData) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      // Transform form values to API format - use rating, nps_score, or ces_score as the score
      const score = values.rating || values.nps_score || values.ces_score || values.score || 5;
      await feedbackApi.submitSurvey(token, {
        score,
        feedback_text: values.feedback_text,
      });
      setIsSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSurveyTitle = (type: SurveyType) => {
    switch (type) {
      case SurveyType.CSAT: return 'Customer Satisfaction Survey';
      case SurveyType.NPS: return 'How likely are you to recommend us?';
      case SurveyType.CES: return 'Customer Effort Score Survey';
      case SurveyType.ONBOARDING: return 'Onboarding Experience Survey';
      case SurveyType.FEATURE: return 'Feature Feedback Survey';
      default: return 'Survey';
    }
  };

  const getSurveyDescription = (type: SurveyType) => {
    switch (type) {
      case SurveyType.CSAT:
        return 'Please rate your overall satisfaction with our service.';
      case SurveyType.NPS:
        return 'On a scale of 0-10, how likely are you to recommend Extravis to a friend or colleague?';
      case SurveyType.CES:
        return 'How easy was it to get your issue resolved?';
      case SurveyType.ONBOARDING:
        return 'Please share your experience with our onboarding process.';
      case SurveyType.FEATURE:
        return 'We\'d love to hear your feedback on this feature.';
      default:
        return 'Please share your feedback.';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Result
          status="error"
          title="Survey Not Available"
          subTitle={error}
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              Go to Portal
            </Button>
          }
        />
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Result
          status="success"
          icon={<SmileOutlined style={{ color: '#52c41a' }} />}
          title="Thank You!"
          subTitle="Your feedback has been submitted successfully. We appreciate your time!"
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              Go to Portal
            </Button>
          }
        />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Result
          status="404"
          title="Survey Not Found"
          subTitle="This survey link may have expired or is invalid."
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              Go to Portal
            </Button>
          }
        />
      </div>
    );
  }

  const renderSurveyForm = () => {
    switch (survey.survey_type) {
      case SurveyType.NPS:
        return (
          <>
            <Form.Item
              name="nps_score"
              label={
                <div>
                  <Text strong>How likely are you to recommend Extravis?</Text>
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>Not at all likely</span>
                    <span>Extremely likely</span>
                  </div>
                </div>
              }
              rules={[{ required: true, message: 'Please select a score' }]}
            >
              <Radio.Group className="w-full">
                <div className="flex justify-between flex-wrap gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <Radio.Button
                      key={score}
                      value={score}
                      style={{
                        width: 40,
                        textAlign: 'center',
                        backgroundColor:
                          score <= 6 ? '#fff2f0' : score <= 8 ? '#fffbe6' : '#f6ffed',
                      }}
                    >
                      {score}
                    </Radio.Button>
                  ))}
                </div>
              </Radio.Group>
            </Form.Item>
            <div className="flex justify-between text-xs mb-6">
              <Space>
                <FrownOutlined style={{ color: '#ff4d4f' }} />
                <Text type="secondary">Detractors (0-6)</Text>
              </Space>
              <Space>
                <MehOutlined style={{ color: '#faad14' }} />
                <Text type="secondary">Passives (7-8)</Text>
              </Space>
              <Space>
                <SmileOutlined style={{ color: '#52c41a' }} />
                <Text type="secondary">Promoters (9-10)</Text>
              </Space>
            </div>
          </>
        );

      case SurveyType.CES:
        return (
          <Form.Item
            name="ces_score"
            label="How easy was it to get your issue resolved?"
            rules={[{ required: true, message: 'Please select an option' }]}
          >
            <Radio.Group className="w-full">
              <Space direction="vertical" className="w-full">
                {[
                  { value: 1, label: 'Very Difficult', color: '#ff4d4f' },
                  { value: 2, label: 'Difficult', color: '#fa8c16' },
                  { value: 3, label: 'Neutral', color: '#faad14' },
                  { value: 4, label: 'Easy', color: '#a0d911' },
                  { value: 5, label: 'Very Easy', color: '#52c41a' },
                ].map((option) => (
                  <Radio
                    key={option.value}
                    value={option.value}
                    className="w-full p-2 border rounded hover:border-purple-300"
                  >
                    <span style={{ color: option.color }}>{option.label}</span>
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>
        );

      default: // CSAT, ONBOARDING, FEATURE
        return (
          <Form.Item
            name="rating"
            label="How would you rate your experience?"
            rules={[{ required: true, message: 'Please provide a rating' }]}
          >
            <div className="text-center py-4">
              <Rate
                allowHalf
                style={{ fontSize: 48 }}
                character={<StarOutlined />}
              />
            </div>
          </Form.Item>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ backgroundColor: '#9c27b0' }}
          >
            <StarOutlined style={{ fontSize: 32, color: 'white' }} />
          </div>
          <Title level={2} style={{ marginBottom: 8 }}>
            {getSurveyTitle(survey.survey_type)}
          </Title>
          <Text type="secondary">
            {getSurveyDescription(survey.survey_type)}
          </Text>
        </div>

        <Card>
          {survey.linked_ticket_number && (
            <Alert
              message={`This survey is related to ticket: ${survey.linked_ticket_number}`}
              type="info"
              showIcon
              className="mb-6"
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            size="large"
          >
            {renderSurveyForm()}

            <Divider />

            <Form.Item
              name="feedback_text"
              label="Additional Comments (Optional)"
            >
              <TextArea
                rows={4}
                placeholder="Tell us more about your experience..."
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
                block
                size="large"
              >
                Submit Feedback
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center mt-4">
            <Text type="secondary" className="text-xs">
              Your feedback is anonymous and helps us improve our services.
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SurveyPage;
