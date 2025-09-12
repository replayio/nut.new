import { VideoSection, HeroSection, HowItWorksSection, FAQSection } from './components';

const LandingPage = () => {
  return (
    <div className="w-full h-full overflow-y-auto bg-bolt-elements-background-depth-1">
      <main className="pt-6 sm:pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-6">
          <VideoSection />
          
          <HeroSection />
          
          <HowItWorksSection />
          
          <FAQSection />
        </div>
      </main>
    </div>
  );
};

export default LandingPage;