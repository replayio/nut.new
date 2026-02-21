import { type AppFeature } from '~/lib/persistence/messageAppSummary';

interface DatabaseChangesProps {
  feature: AppFeature;
}

const DatabaseChanges = ({ feature }: DatabaseChangesProps) => {
  return (
    <div className="border-t border-border/50">
      <div className="p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 bg-muted/30 px-2 py-1 rounded-md inline-block">
          Database Schema Changes
        </div>
        <div className="space-y-4">
          {feature?.databaseChange?.tables?.map((table, tableIdx) => (
            <div
              key={tableIdx}
              className="bg-muted rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01] group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full shadow-sm"></div>
                <span className="font-mono text-sm font-semibold text-foreground">{table.name}</span>
                <span className="text-xs text-muted-foreground bg-card/50 px-2 py-1 rounded-md">
                  ({table.columns?.length || 0} columns)
                </span>
              </div>

              {table.columns && table.columns.length > 0 && (
                <div className="space-y-1">
                  {table.columns.map((column, colIdx) => (
                    <div key={colIdx} className="flex items-center gap-2 text-xs">
                      <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                      <span className="font-mono text-foreground">{column.name}</span>
                      <span className="text-muted-foreground">{column.type}</span>
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
