import Head from 'next/head';

import { CTASection } from '../components/landing/CTASection';
import { DeploymentSection } from '../components/landing/DeploymentSection';
import { FAQSection } from '../components/landing/FAQSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { HeroSection } from '../components/landing/HeroSection';
import { LandingFooter } from '../components/landing/LandingFooter';
import { Navigation } from '../components/landing/Navigation';
import { PricingSection } from '../components/landing/PricingSection';

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Silhouette — AI Meeting Notes for Discord</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="description" content="Silhouette records multi-track audio from Discord voice channels and automatically generates transcriptions and AI meeting summaries." />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <meta name="og:site_name" content="Silhouette" />
        <meta name="og:title" content="Silhouette — AI Meeting Notes for Discord" />
        <meta name="og:description" content="Record Discord voice channels, get AI-powered transcriptions and meeting summaries automatically." />
        <meta name="og:locale" content="en_US" />
        <meta name="og:image" content="/icon-512x512.png" />
        <meta name="theme-color" content="#2dd4bf" />
      </Head>
      <div className="min-h-screen bg-zinc-900 text-white font-body">
        <Navigation />
        <HeroSection />
        <FeaturesSection />
        <DeploymentSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
        <LandingFooter />
      </div>
    </>
  );
}
