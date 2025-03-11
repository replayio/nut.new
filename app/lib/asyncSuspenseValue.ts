type SuspenseRecord<T> =
  | {
      status: 'resolved';
      value: T;
    }
  | {
      status: 'rejected';
      error: Error;
    }
  | {
      status: 'pending';
      promise: Promise<T>;
    };

export function createAsyncSuspenseValue<T>(getValue: () => Promise<T>) {
  let record: SuspenseRecord<T> | undefined;

  const load = () => {
    const promise = getValue().then(
      (value) => {
        record = { status: 'resolved', value };
        return value;
      },
      (error) => {
        record = { status: 'rejected', error };
        throw error;
      },
    );

    record = { status: 'pending', promise };

    return promise;
  };

  const asyncValue = {
    load: async () => {
      if (!record) {
        return load();
      }

      switch (record.status) {
        case 'pending':
          return record.promise;
        case 'resolved':
          return record.value;
        case 'rejected':
          throw record.error;
      }
    },

    read() {
      if (!record) {
        throw load();
      }

      switch (record.status) {
        case 'pending':
          throw record.promise;
        case 'resolved':
          return record.value;
        case 'rejected':
          throw record.error;
      }
    },
    preload() {
      if (record) {
        return;
      }

      load().catch(() => {});
    },
  };

  return asyncValue;
}
