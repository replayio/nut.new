import { VideoSection, HeroSection, HowItWorksSection, FaqSection } from './components';

const LandingPage = () => {
  return (
    <div className="w-full h-full overflow-y-auto bg-bolt-elements-background-depth-1">
      <main className="pt-6 sm:pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-6">
          <VideoSection />

          <HeroSection />

          <HowItWorksSection />

          <FaqSection />
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
