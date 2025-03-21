import { assert } from './ReplayProtocolClient';

type AnyFunction = (...args: never) => unknown;

type CallableDependencies<Dependencies extends Record<string, Dependency>> = {
  [K in keyof Dependencies]: 'fn' extends keyof Dependencies[K] ? Dependencies[K]['fn'] : Dependencies[K];
};

interface InjectableFunction<
  Dependencies extends Record<string, Dependency> = any,
  Args extends unknown[] = never,
  R = unknown,
> {
  dependencies: Dependencies;
  fn: (dependencies: CallableDependencies<Dependencies>, ...args: Args) => R;
  asCallString: () => string;
}

type Dependency = AnyFunction | InjectableFunction;

function getAllDependencies(
  dependencies: Record<string, Dependency>,
  allDependencies: Record<string, AnyFunction> = {},
) {
  for (const [key, value] of Object.entries(dependencies)) {
    if ('fn' in value) {
      allDependencies[key] = value.fn;
      getAllDependencies(value.dependencies, allDependencies);
    } else {
      allDependencies[key] = value;
    }
  }
  return allDependencies;
}

function asCallString(dependencies: Record<string, Dependency>, fn: AnyFunction) {
  const dependenciesString = Object.entries(getAllDependencies(dependencies))
    .map(([key, value]) => `${JSON.stringify(key)}: ${value}`)
    .join(',\n');
  return `(${fn})({\n${dependenciesString}\n})`;
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
    dependencies: dependencies,
    fn,
    asCallString: asCallString.bind(null, dependencies, fn),
  };
}
