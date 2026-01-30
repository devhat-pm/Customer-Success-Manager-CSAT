import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Star,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Simple inline toast notification
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = type === 'error' ? 'bg-danger' : type === 'success' ? 'bg-success' : 'bg-warning'
  const Icon = type === 'error' ? XCircle : type === 'success' ? CheckCircle : AlertTriangle

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md z-50 animate-in slide-in-from-top`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="text-sm">{message}</p>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function PublicSurvey() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [surveyInfo, setSurveyInfo] = useState(null)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [hoverScore, setHoverScore] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'error') => {
    setToast({ message, type })
  }

  const hideToast = () => {
    setToast(null)
  }

  // Helper to extract error message from various response formats
  const extractErrorMessage = (data) => {
    if (typeof data === 'string') return data
    if (data?.detail) {
      if (typeof data.detail === 'string') return data.detail
      if (Array.isArray(data.detail)) {
        // FastAPI validation error format
        return data.detail.map(err => err.msg || err.message || JSON.stringify(err)).join(', ')
      }
      if (typeof data.detail === 'object') {
        return data.detail.msg || data.detail.message || JSON.stringify(data.detail)
      }
    }
    if (data?.message) return data.message
    if (data?.error) return data.error
    return 'An unexpected error occurred'
  }

  // Fetch survey info
  useEffect(() => {
    const fetchSurveyInfo = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/portal/surveys/view/${token}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Survey not found or has expired.')
          } else {
            const data = await response.json().catch(() => ({}))
            setError(extractErrorMessage(data) || 'Failed to load survey.')
          }
          return
        }
        const data = await response.json()
        if (data.is_expired) {
          setError('This survey link has expired.')
          return
        }
        if (data.is_completed) {
          setError('This survey has already been completed. Thank you for your feedback!')
          return
        }
        setSurveyInfo(data)
      } catch (err) {
        setError('Failed to load survey. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchSurveyInfo()
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!score && score !== 0) {
      showToast('Please select a rating', 'warning')
      return
    }
    if (!name.trim()) {
      showToast('Please enter your name', 'warning')
      return
    }
    if (!email.trim()) {
      showToast('Please enter your email', 'warning')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/portal/surveys/submit/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score: parseInt(score),
          feedback_text: feedback || null,
          submitter_name: name.trim(),
          submitter_email: email.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMsg = extractErrorMessage(data)
        showToast(errorMsg, 'error')
        return
      }

      setSubmitted(true)
    } catch (err) {
      showToast(err.message || 'Failed to submit survey. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const isNPS = surveyInfo?.survey_type === 'nps'

  const getScoreLabel = (s) => {
    if (isNPS) {
      if (s <= 6) return 'Detractor'
      if (s <= 8) return 'Passive'
      return 'Promoter'
    }
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']
    return labels[s] || ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <p className="mt-4 text-slate-600">Loading survey...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-warning mx-auto" />
            <p className="mt-4 text-slate-800 font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-success mx-auto" />
            <h2 className="mt-4 text-2xl font-bold text-slate-800">Thank You!</h2>
            <p className="mt-2 text-slate-600">
              Your feedback has been submitted successfully. We appreciate your time!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">We Value Your Feedback</CardTitle>
          <CardDescription>
            {surveyInfo?.custom_message ||
              `Please take a moment to rate your experience${surveyInfo?.linked_ticket_number ? ` with ticket ${surveyInfo.linked_ticket_number}` : ''}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating */}
            <div className="space-y-3">
              <Label className="text-base">
                {isNPS
                  ? 'How likely are you to recommend us? (0-10)'
                  : 'How would you rate your experience?'}
              </Label>

              {isNPS ? (
                // NPS Scale (0-10)
                <div className="space-y-2">
                  <div className="flex justify-between gap-1">
                    {[...Array(11)].map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setScore(i)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                          score === i
                            ? i <= 6
                              ? 'bg-danger text-white'
                              : i <= 8
                              ? 'bg-warning text-white'
                              : 'bg-success text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Not likely</span>
                    <span>Very likely</span>
                  </div>
                </div>
              ) : (
                // Star Rating (1-5)
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScore(s)}
                      onMouseEnter={() => setHoverScore(s)}
                      onMouseLeave={() => setHoverScore(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          s <= (hoverScore || score)
                            ? 'text-warning fill-warning'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  {(score > 0 || hoverScore > 0) && (
                    <span className="ml-2 text-sm text-slate-600">
                      {getScoreLabel(hoverScore || score)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Your Name <span className="text-danger">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Your Email <span className="text-danger">*</span></Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Feedback */}
            <div className="space-y-2">
              <Label htmlFor="feedback">Additional Comments (Optional)</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us more about your experience..."
                rows={4}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || (!score && score !== 0)}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
