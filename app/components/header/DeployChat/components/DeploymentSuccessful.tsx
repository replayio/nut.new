const DeploymentSuccessful = ({
  deploySettings,
  setIsModalOpen,
}: {
  deploySettings: any;
  setIsModalOpen: (isOpen: boolean) => void;
}) => {
  return (
    <>
      <h2 className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary text-center">Deployment Succeeded! 🎉</h2>
      <div className="text-center">
        <p className="text-bolt-elements-textSecondary mb-6">
          Your application has been successfully deployed. You can now access it at the URL below.
        </p>
        <div className="flex justify-center gap-2">
          <a href={deploySettings?.siteURL} target="_blank" rel="noopener noreferrer">
            <button className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
              {deploySettings?.siteURL}
            </button>
          </a>
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-3 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

export default DeploymentSuccessful;
