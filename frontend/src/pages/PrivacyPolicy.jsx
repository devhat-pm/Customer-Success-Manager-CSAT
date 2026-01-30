import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-slate-500 mb-8">Last updated: January 29, 2025</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Introduction</h2>
              <p className="text-slate-600 leading-relaxed">
                Success Manager ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our customer success management platform ("Service").
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Information We Collect</h2>

              <h3 className="text-lg font-medium text-slate-800 mb-3">2.1 Personal Information</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                We may collect personal information that you provide directly to us, including:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                <li>Name and contact information (email address, phone number)</li>
                <li>Account credentials (username, password)</li>
                <li>Professional information (job title, company name)</li>
                <li>Communication preferences</li>
              </ul>

              <h3 className="text-lg font-medium text-slate-800 mb-3">2.2 Usage Information</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                We automatically collect certain information when you use our Service:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Log data (IP address, browser type, pages visited)</li>
                <li>Device information (device type, operating system)</li>
                <li>Usage patterns and preferences</li>
                <li>Performance and error data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We use the collected information for various purposes:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>To provide and maintain our Service</li>
                <li>To notify you about changes to our Service</li>
                <li>To provide customer support</li>
                <li>To gather analysis or valuable information to improve our Service</li>
                <li>To monitor the usage of our Service</li>
                <li>To detect, prevent, and address technical issues</li>
                <li>To send you marketing and promotional communications (with your consent)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Data Sharing and Disclosure</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We may share your information in the following situations:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>With Service Providers:</strong> We may share your information with third-party vendors who perform services on our behalf</li>
                <li><strong>For Business Transfers:</strong> In connection with any merger, sale of assets, or acquisition</li>
                <li><strong>With Your Consent:</strong> We may disclose your information for any other purpose with your consent</li>
                <li><strong>Legal Requirements:</strong> If required to do so by law or in response to valid legal requests</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Data Security</h2>
              <p className="text-slate-600 leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include encryption, access controls, and regular security assessments. However, no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Data Retention</h2>
              <p className="text-slate-600 leading-relaxed">
                We retain your personal information only for as long as necessary to fulfill the purposes for which it was collected, including to satisfy legal, accounting, or reporting requirements. When your data is no longer needed, we will securely delete or anonymize it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Your Rights</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Depending on your location, you may have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
                <li><strong>Erasure:</strong> Request deletion of your personal data</li>
                <li><strong>Restriction:</strong> Request restriction of processing</li>
                <li><strong>Portability:</strong> Request transfer of your data</li>
                <li><strong>Objection:</strong> Object to certain processing activities</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Cookies and Tracking</h2>
              <p className="text-slate-600 leading-relaxed">
                We use cookies and similar tracking technologies to track activity on our Service and store certain information. Cookies are files with small amounts of data that may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Third-Party Links</h2>
              <p className="text-slate-600 leading-relaxed">
                Our Service may contain links to third-party websites or services that are not operated by us. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Children's Privacy</h2>
              <p className="text-slate-600 leading-relaxed">
                Our Service is not intended for use by children under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">11. International Data Transfers</h2>
              <p className="text-slate-600 leading-relaxed">
                Your information may be transferred to and maintained on servers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. We ensure appropriate safeguards are in place for such transfers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">12. Changes to This Policy</h2>
              <p className="text-slate-600 leading-relaxed">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">13. Contact Us</h2>
              <p className="text-slate-600 leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="text-slate-600 mt-2">
                <strong>Email:</strong> privacy@successmanager.com<br />
                <strong>Address:</strong> Success Manager Inc., Business District, City, Country<br />
                <strong>Data Protection Officer:</strong> dpo@successmanager.com
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
