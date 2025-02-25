import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { default as IndexRoute } from './_index';

export async function loader(args: LoaderFunctionArgs) {
  return json({ problemId: args.params.id });
}

export default IndexRoute;
