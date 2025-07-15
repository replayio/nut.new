import { type AppFeature } from '~/lib/persistence/messageAppSummary';

interface DatabaseChangesProps {
  feature: AppFeature;
}

const DatabaseChanges = ({ feature }: DatabaseChangesProps) => {
  return (
    <div className="border-t border-bolt-elements-borderColor">
      <div className="p-3">
        <div className="text-xs font-medium text-bolt-elements-textTertiary uppercase tracking-wider mb-3">
          Database Schema Changes
        </div>
        <div className="space-y-3">
          {feature?.databaseChange?.tables?.map((table, tableIdx) => (
            <div
              key={tableIdx}
              className="bg-bolt-elements-background-depth-1 rounded-lg p-3 border border-bolt-elements-borderColor"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span className="font-mono text-sm font-semibold text-bolt-elements-textPrimary">{table.name}</span>
                <span className="text-xs text-bolt-elements-textSecondary">({table.columns?.length || 0} columns)</span>
              </div>

              {table.columns && table.columns.length > 0 && (
                <div className="space-y-1">
                  {table.columns.map((column, colIdx) => (
                    <div key={colIdx} className="flex items-center gap-2 text-xs">
                      <div className="w-1 h-1 bg-bolt-elements-textSecondary rounded-full"></div>
                      <span className="font-mono text-bolt-elements-textPrimary">{column.name}</span>
                      <span className="text-bolt-elements-textSecondary">{column.type}</span>
                      {column.nullable && <span className="text-orange-500 text-xs">nullable</span>}
                      {column.foreignTableId && (
                        <span className="text-blue-500 text-xs">→ {column.foreignTableId}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DatabaseChanges;
