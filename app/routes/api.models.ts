import { json } from '~/lib/remix-types';
import { MODEL_LIST } from '~/utils/constants';

export async function loader() {
  return json(MODEL_LIST);
}
