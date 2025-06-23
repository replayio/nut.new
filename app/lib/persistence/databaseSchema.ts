// Describes the database schemas included in AppSummary messages.

export interface DatabaseColumnSchema {
  name: string;

  // SQL type name for the column.
  type: string;

  // Whether the column can be null.
  nullable?: boolean;

  // Whether the column is indexed.
  indexed?: boolean;

  // Any table name for which this is the "id" of a row in that table.
  // If the other table's row is deleted, the column will be set to null if nullable,
  // otherwise the row will be deleted.
  foreignTableId?: string;
}

// A table in the database. All tables have an "id" column as the primary key
// which is a uuid the database will generate on each insert. This does not need to be
// explicitly specified in schema XML but will be added to the schema.
export interface DatabaseTableSchema {
  name: string;
  columns: DatabaseColumnSchema[];
}

export interface DatabaseSchema {
  tables: DatabaseTableSchema[];
}
