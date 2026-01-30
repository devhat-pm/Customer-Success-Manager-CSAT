import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-slate-500 mb-8">Last updated: January 29, 2025</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-slate-600 leading-relaxed">
                By accessing and using the Success Manager platform ("Service"), you accept and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Description of Service</h2>
              <p className="text-slate-600 leading-relaxed">
                Success Manager is a customer success management platform that provides tools for tracking customer health scores, managing interactions, handling support tickets, and generating reports. The Service is provided on an "as is" and "as available" basis.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">3. User Accounts</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                To access the Service, you must create an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Acceptable Use</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Transmit harmful, offensive, or illegal content</li>
                <li>Attempt to gain unauthorized access to systems or networks</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use automated means to access the Service without permission</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Data and Privacy</h2>
              <p className="text-slate-600 leading-relaxed">
                Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to the collection and use of information as described in our Privacy Policy. You retain ownership of any data you submit to the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Intellectual Property</h2>
              <p className="text-slate-600 leading-relaxed">
                The Service and its original content, features, and functionality are owned by Success Manager and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Termination</h2>
              <p className="text-slate-600 leading-relaxed">
                We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Limitation of Liability</h2>
              <p className="text-slate-600 leading-relaxed">
                In no event shall Success Manager, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or other intangible losses, resulting from your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-slate-600 leading-relaxed">
                The Service is provided "as is" without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Changes to Terms</h2>
              <p className="text-slate-600 leading-relaxed">
                We reserve the right to modify or replace these Terms at any time. We will provide notice of any material changes by posting the new Terms on this page and updating the "Last updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">11. Contact Us</h2>
              <p className="text-slate-600 leading-relaxed">
                If you have any questions about these Terms, please contact us at:
              </p>
              <p className="text-slate-600 mt-2">
                <strong>Email:</strong> legal@successmanager.com<br />
                <strong>Address:</strong> Success Manager Inc., Business District, City, Country
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Success Manager. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
            <span>&middot;</span>
            <Link to="/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
