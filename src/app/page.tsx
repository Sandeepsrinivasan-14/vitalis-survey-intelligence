import { FeatureGrid } from '@/components/landing/feature-grid';
import { LandingHero } from '@/components/landing/landing-hero';
import { SurveyDashboard } from '@/components/landing/survey-dashboard';

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-20">
      <LandingHero />
      <FeatureGrid />
      <SurveyDashboard />
    </div>
  );
}
