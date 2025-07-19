import { assert } from '~/utils/nut';

type UnknownFunction = (...args: never) => unknown;

type DropDependencies<F extends UnknownFunction> = F extends (dependencies: any, ...args: infer A) => infer R
  ? (...args: A) => R
  : never;

type CallableDependencies<Dependencies extends Record<string, Dependency>> = {
  [K in keyof Dependencies]: 'fn' extends keyof Dependencies[K]
    ? Dependencies[K]['fn'] extends UnknownFunction
      ? DropDependencies<Dependencies[K]['fn']>
      : never
    : Dependencies[K];
};

interface InjectableFunction<
  Dependencies extends Record<string, Dependency> = any,
  Args extends unknown[] = never,
  R = unknown,
> {
  dependencies: Dependencies;
  fn: (dependencies: CallableDependencies<Dependencies>, ...args: Args) => R;
  asCallString: (...args: Args) => string;
}

type Dependency = UnknownFunction | InjectableFunction;

function getAllDependencies(
  dependencies: Record<string, Dependency>,
  bindableNames: Set<string>,
  allDependencies: Record<string, UnknownFunction> = {},
) {
  for (const [key, value] of Object.entries(dependencies)) {
    if ('fn' in value) {
      allDependencies[key] = value.fn;
      bindableNames.add(key);
      getAllDependencies(value.dependencies, bindableNames, allDependencies);
    } else {
      allDependencies[key] = value;
    }
  }
  return allDependencies;
}

function bindDependencies(dependencies: Record<string, UnknownFunction>, bindableNames: string[]) {
  for (const name of bindableNames) {
    dependencies[name] = dependencies[name].bind(null, dependencies);
  }
  return dependencies;
}

function serializeValue(value: unknown): string {
  switch (typeof value) {
    case 'symbol':
      throw new Error("Symbols can't be serialized");
    case 'function':
      throw new Error('Functions should be injected as dependencies');
    case 'undefined':
      return 'undefined';
    case 'object':
      if (Array.isArray(value)) {
        return `[${value.map(serializeValue).join(', ')}]`;
      }
    // fallthrough
    default:
      return JSON.stringify(value);
  }
}

function asCallString(dependencies: Record<string, Dependency>, fn: UnknownFunction, ...args: unknown[]) {
  const bindableNames = new Set<string>();
  const dependenciesString = Object.entries(getAllDependencies(dependencies, bindableNames))
    .map(([key, value]) => `${JSON.stringify(key)}: ${value}`)
    .join(',\n');
  const boundDependencies = `(${bindDependencies})({\n${dependenciesString}\n}, [${Array.from(bindableNames)
    .map((name) => JSON.stringify(name))
    .join(', ')}])`;
  const argsString = args.map(serializeValue).join(', ');
  return `(${fn})(${boundDependencies}, ${argsString})`;
}

function validateDependencies(rootDependencies: Record<string, Dependency>, dependencies: Record<string, Dependency>) {
  for (const [key, value] of Object.entries(dependencies)) {
    assert(
      !(key in rootDependencies) || rootDependencies[key] === dependencies[key],
      `"${key}" dependency is not the same as the root dependency at the same key`,
    );
    if ('dependencies' in value) {
      validateDependencies(rootDependencies, value.dependencies);
    }
  }
}

export function createInjectableFunction<Dependencies extends Record<string, Dependency>, Args extends unknown[], R>(
  dependencies: Dependencies,
  fn: (dependencies: CallableDependencies<Dependencies>, ...args: Args) => R,
): InjectableFunction<Dependencies, Args, R> {
  validateDependencies(dependencies, dependencies);

  return {
    dependencies,
    fn,
    asCallString: asCallString.bind(null, dependencies, fn),
  };
}
