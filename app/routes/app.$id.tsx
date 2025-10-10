import { useEffect } from 'react';
import { json, type LoaderFunctionArgs } from '~/lib/remix-types';
import { default as IndexRoute } from './_index';
import { getAppPermissions, isAppOwner } from '~/lib/api/permissions';
import { setPermissions, setIsAppOwner } from '~/lib/stores/permissions';
import { useParams } from '@remix-run/react';
import { useStore } from '@nanostores/react';
import { userStore } from '~/lib/stores/userAuth';

export async function loader(args: LoaderFunctionArgs) {
  return json({ id: args.params.id });
}

export default function AppRoute() {
  const params = useParams();
  const appId = params.id;
  const user = useStore(userStore.user);

  useEffect(() => {
    if (!appId) {
      return;
    }

    const loadPermissions = async () => {
      try {
        const permissions = await getAppPermissions(appId);
        setPermissions(permissions);
      } catch (error) {
        console.error('Failed to load permissions:', error);
        setPermissions([]);
      }
    };

    loadPermissions();
  }, [appId]);

  useEffect(() => {
    if (!appId || !user) {
      return;
    }

    const loadIsOwner = async () => {
      try {
        const isOwner = await isAppOwner(appId, user?.id || '');
        setIsAppOwner(isOwner);
      } catch (error) {
        console.error('Failed to load is owner:', error);
        setIsAppOwner(false);
      }
    };

    loadIsOwner();
  }, [appId, user]);
  return <IndexRoute />;
}
