import { Link } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'
import {
  Star,
  Calendar,
  User,
  Mail,
  Phone,
  Building2,
  Package,
  FileText,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'

export function ResponseDetailModal({ open, onClose, response }) {
  if (!response) return null

  const score = parseInt(response.score) || 0
  const npsScore = response.nps_score
  const isPromoter = npsScore >= 9
  const isDetractor = npsScore !== undefined && npsScore <= 6

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">Survey Response</DialogTitle>
              <p className="text-sm text-slate-500 mt-1">
                {response.submitted_at
                  ? format(parseISO(response.submitted_at), 'MMMM d, yyyy \'at\' h:mm a')
                  : 'Date not available'}
              </p>
            </div>
            <Link to={`/customers/${response.customer_id}`}>
              <Button variant="outline" size="sm" className="gap-1">
                View Customer
                <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Score Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {/* CSAT Score */}
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-2">CSAT Score</p>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-8 h-8 ${
                          star <= score
                            ? score >= 4 ? 'text-success fill-success' :
                              score >= 3 ? 'text-warning fill-warning' : 'text-danger fill-danger'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    {score}<span className="text-slate-400">/5</span>
                  </p>
                </div>

                {/* Divider */}
                {npsScore !== undefined && (
                  <>
                    <div className="w-px h-20 bg-slate-200" />

                    {/* NPS Score */}
                    <div className="text-center">
                      <p className="text-sm text-slate-500 mb-2">NPS Score</p>
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                        isPromoter ? 'bg-success/10' :
                        isDetractor ? 'bg-danger/10' : 'bg-warning/10'
                      }`}>
                        {isPromoter ? (
                          <ThumbsUp className="w-5 h-5 text-success" />
                        ) : isDetractor ? (
                          <ThumbsDown className="w-5 h-5 text-danger" />
                        ) : null}
                        <span className={`text-2xl font-bold ${
                          isPromoter ? 'text-success' :
                          isDetractor ? 'text-danger' : 'text-warning'
                        }`}>
                          {npsScore}
                        </span>
                      </div>
                      <Badge
                        variant={isPromoter ? 'success' : isDetractor ? 'danger' : 'warning'}
                        className="mt-2"
                      >
                        {isPromoter ? 'Promoter' : isDetractor ? 'Detractor' : 'Passive'}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer & Product Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Info */}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Customer Information
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center text-white font-bold">
                      {response.customer_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{response.customer_name}</p>
                      <p className="text-xs text-slate-500">{response.customer_industry || 'Industry not set'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Info */}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Survey Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Product</span>
                    <span className="font-medium text-slate-800">{response.product || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Survey Type</span>
                    <Badge variant="secondary" className="capitalize">
                      {response.survey_type?.replace('_', ' ') || 'General'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feedback */}
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Feedback
              </h4>
              {response.feedback ? (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-slate-700 whitespace-pre-wrap">{response.feedback}</p>
                </div>
              ) : (
                <p className="text-slate-400 italic">No feedback provided</p>
              )}
            </CardContent>
          </Card>

          {/* Respondent Info */}
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Respondent
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-800">{response.submitted_by || 'Anonymous'}</span>
                </div>
                {response.respondent_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a
                      href={`mailto:${response.respondent_email}`}
                      className="text-primary hover:underline"
                    >
                      {response.respondent_email}
                    </a>
                  </div>
                )}
                {response.respondent_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <a
                      href={`tel:${response.respondent_phone}`}
                      className="text-primary hover:underline"
                    >
                      {response.respondent_phone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">
                    {response.submitted_at
                      ? format(parseISO(response.submitted_at), 'PPP')
                      : 'Date unknown'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Questions (if any) */}
          {response.additional_answers && Object.keys(response.additional_answers).length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-slate-500 mb-3">Additional Questions</h4>
                <div className="space-y-3">
                  {Object.entries(response.additional_answers).map(([question, answer]) => (
                    <div key={question} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">{question}</p>
                      <p className="text-sm text-slate-800">{answer}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
