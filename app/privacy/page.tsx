import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — Harmony',
};

export default function PrivacyPage() {
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
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        </div>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <p className="text-base text-foreground">
            <strong>Last updated:</strong> March 2026
          </p>

          <p>
            Harmony (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your personal data
            and respecting your privacy. This policy explains what data we collect, how we use it, and your rights
            under applicable data protection law including the GDPR.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">Data we collect</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Account information (name, email address)</li>
            <li>Profile information (photos, bio, preferences)</li>
            <li>Location data (city/country — not precise GPS)</li>
            <li>Music preferences (via Spotify OAuth, with your consent)</li>
            <li>Usage data (swipes, matches, app interactions)</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8">How we use your data</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To match you with compatible users based on music taste</li>
            <li>To operate and improve the Harmony service</li>
            <li>To send transactional emails (verification, password reset)</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8">Your rights (GDPR)</h2>
          <p>
            You have the right to access, rectify, or erase your personal data at any time. You can delete your
            account from <strong>Profile → Settings → Delete Account</strong>. For other requests, contact us below.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">Contact</h2>
          <p>
            For privacy-related requests, email us at{' '}
            <a href="mailto:privacy@harmonyapp.com" className="text-primary hover:underline">
              privacy@harmonyapp.com
            </a>
            .
          </p>

          <p className="text-xs text-muted-foreground/60 mt-12 pt-6 border-t border-border">
            This policy will be updated as the service evolves. Continued use after changes constitutes acceptance.
          </p>
        </div>
      </div>
    </div>
  );
}
