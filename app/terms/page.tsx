import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — Harmony',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-full">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
        </div>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <p className="text-base text-foreground">
            <strong>Last updated:</strong> March 2026
          </p>

          <p>
            By using Harmony you agree to these Terms of Service. Please read them carefully.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">Eligibility</h2>
          <p>You must be 18 years of age or older to use Harmony.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">Acceptable use</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use Harmony for genuine social and romantic connections</li>
            <li>Provide accurate information in your profile</li>
            <li>Treat other users with respect</li>
            <li>Do not use the service for commercial solicitation or spam</li>
            <li>Do not impersonate other people</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8">Content</h2>
          <p>
            You retain ownership of content you upload (photos, bio). By uploading, you grant Harmony a
            non-exclusive licence to display it to other users within the service. You are responsible for
            ensuring your content does not violate any third-party rights.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">Termination</h2>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms. You can delete
            your account at any time from <strong>Profile → Settings → Delete Account</strong>.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">Limitation of liability</h2>
          <p>
            Harmony is provided &quot;as is&quot; without warranties of any kind. We are not liable for any
            indirect or consequential damages arising from your use of the service.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">Contact</h2>
          <p>
            For questions about these terms, email{' '}
            <a href="mailto:legal@harmonyapp.com" className="text-primary hover:underline">
              legal@harmonyapp.com
            </a>
            .
          </p>

          <p className="text-xs text-muted-foreground/60 mt-12 pt-6 border-t border-border">
            These terms may be updated periodically. We will notify you of material changes via email.
          </p>
        </div>
      </div>
    </div>
  );
}
