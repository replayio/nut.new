import { json, type LoaderFunctionArgs } from '~/lib/remix-types';
import { default as IndexRoute } from './_index';

export async function loader(args: LoaderFunctionArgs) {
  return json({ appId: args.params.id });
}

export default IndexRoute;
