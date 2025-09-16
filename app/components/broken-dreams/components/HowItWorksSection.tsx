export const HowItWorksSection = () => {
  const steps = [
    {
      number: 1,
      title: 'Create an account',
      description: "So we'll be able to give you the free credits.",
    },
    {
      number: 2,
      title: 'Submit your broken app',
      description: "We'll review your submission and give you your credits and instructions for rebuilding your app",
    },
    {
      number: 3,
      title: 'Rebuild your app',
      description: 'Start using your free credits, and our team will be on standby to help you if you get stuck.',
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mb-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-blue-500 mb-4">How it works</h2>
        <p className="text-bolt-elements-textSecondary text-lg">Simple steps to get your app working</p>
      </div>

      <div className="space-y-12">
        {steps.map((step) => (
          <div key={step.number} className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white text-black rounded-full flex items-center justify-center text-3xl font-bold border-2 border-bolt-elements-borderColor shadow-lg">
                {step.number}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-bolt-elements-textHeading mb-3">{step.title}</h3>
            <p className="text-bolt-elements-textSecondary text-lg max-w-2xl mx-auto">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
