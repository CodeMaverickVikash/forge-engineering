import React from 'react';
import { HeroSection } from './HeroSection';
import { ProblemSolutionSection } from './ProblemSolutionSection';
import { LifecycleVisualizer } from './LifecycleVisualizer';
import { KeyBenefitsSection } from './KeyBenefitsSection';
import { SpecialistsShowcaseSection } from './SpecialistsShowcaseSection';
import { QualityGatesShowcaseSection } from './QualityGatesShowcaseSection';
import { IntegrationsSection } from './IntegrationsSection';
import { CTAAndFAQSection } from './CTAAndFAQSection';

export const MarketingPage: React.FC = () => {
  return (
    <div className="w-full">
      <HeroSection />
      <ProblemSolutionSection />
      <LifecycleVisualizer />
      <KeyBenefitsSection />
      <SpecialistsShowcaseSection />
      <QualityGatesShowcaseSection />
      <IntegrationsSection />
      <CTAAndFAQSection />
    </div>
  );
};
