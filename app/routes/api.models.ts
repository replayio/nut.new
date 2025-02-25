import { json } from '@remix-run/node';
import { MODEL_LIST } from '~/utils/constants';

export async function loader() {
  return json(MODEL_LIST);
}
