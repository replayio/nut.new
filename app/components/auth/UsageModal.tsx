export const UsageModal = () => {
  return (
    <div
    className="bg-bolt-elements-background-depth-1 rounded-lg p-8 max-w-2xl w-full z-50 border border-bolt-elements-borderColor overflow-y-auto max-h-[95vh]"
    onClick={(e) => e.stopPropagation()}
  >
    <>
      <h2 className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary text-center">
        Peanut Usage
      </h2>
      <div className="text-center mb-6 text-bolt-elements-textSecondary">
        <p className="mb-2">
          Deploy your chat application to production using Netlify.
        </p>
        <p className="mb-2">This process will:</p>
        <div className="flex justify-center">
          <ul className="text-left list-disc list-inside mb-4 inline-block">
            <li>Create a new Netlify site or update an existing one</li>
            <li>Configure all necessary environment variables</li>
            <li>Deploy your application with production settings</li>
          </ul>
        </div>
        <p className="mb-2">You can leave all fields blank to deploy using default settings.</p>
      </div>
    </>
  </div>
  );
}
