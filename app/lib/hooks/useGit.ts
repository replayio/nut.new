import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import git, { type GitAuth, type PromiseFsClient } from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';
import type { ProtocolFile } from '../replay/SimulationPrompt';
import type { FileMap } from '../stores/files';

const lookupSavedPassword = (url: string) => {
  const domain = url.split('/')[2];
  const gitCreds = Cookies.get(`git:${domain}`);

  if (!gitCreds) {
    return null;
  }

  try {
    const { username, password } = JSON.parse(gitCreds || '{}');
    return { username, password };
  } catch (error) {
    console.log(`Failed to parse Git Cookie ${error}`);
    return null;
  }
};

const saveGitAuth = (url: string, auth: GitAuth) => {
  const domain = url.split('/')[2];
  Cookies.set(`git:${domain}`, JSON.stringify(auth));
};

export function useGit() {
  const [ready, setReady] = useState(false);
  const [fs, setFs] = useState<PromiseFsClient>();
  const fileData = useRef<FileMap>({});
  useEffect(() => {
    setFs(getFs(fileData.current));
    setReady(true);
  }, []);

  const gitClone = useCallback(
    async (url: string) => {
      if (!fs || !ready) {
        throw 'Not initialized';
      }

      const headers: {
        [x: string]: string;
      } = {
        'User-Agent': 'bolt.diy',
      };

      const auth = lookupSavedPassword(url);

      if (auth) {
        headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`;
      }

      try {
        await git.clone({
          fs,
          http,
          dir: "/",
          url,
          depth: 1,
          singleBranch: true,
          corsProxy: '/api/git-proxy',
          headers,

          onAuth: (url) => {
            let auth = lookupSavedPassword(url);

            if (auth) {
              return auth;
            }

            if (confirm('This repo is password protected. Ready to enter a username & password?')) {
              auth = {
                username: prompt('Enter username'),
                password: prompt('Enter password'),
              };
              return auth;
            } else {
              return { cancel: true };
            }
          },
          onAuthFailure: (url, _auth) => {
            toast.error(`Error Authenticating with ${url.split('/')[2]}`);
          },
          onAuthSuccess: (url, auth) => {
            saveGitAuth(url, auth);
          },
        });

        return { workdir: "/", data: fileData.current };
      } catch (error) {
        console.error('Git clone error:', error);
        throw error;
      }
    },
    [fs, ready],
  );

  return { ready, gitClone };
}

function createFileFromEncoding(path: string, data: any, encoding: string | undefined): ProtocolFile {
  if (typeof data == "string") {
    return { path, content: data };
  }

  console.error("CreateFileFromEncodingFailed", { data, encoding });
  return { path, content: "CreateFileFromEncodingFailed" };
}

const getFs = (files: FileMap) => ({
  promises: {
    readFile: async (path: string, options: any) => {
      const encoding = options?.encoding;

      try {
        const result = files[path]?.content;

        return result;
      } catch (error) {
        throw error;
      }
    },
    writeFile: async (path: string, data: any, options: any) => {
      const encoding = options.encoding;
      files[path] = createFileFromEncoding(path, data, encoding);
    },
    mkdir: async (path: string, options: any) => {
    },
    readdir: async (path: string, options: any) => {
      throw new Error("NYI");
    },
    rm: async (path: string, options: any) => {
      throw new Error("NYI");
    },
    rmdir: async (path: string, options: any) => {
      throw new Error("NYI");
    },
    unlink: async (path: string) => {
      throw new Error("NYI");
    },
    stat: async (path: string) => {
      throw new Error("NYI");
    },
    lstat: async (path: string) => {
      throw new Error("NYI");
    },
    readlink: async (path: string) => {
      throw new Error("NYI");
    },
    symlink: async (target: string, path: string) => {
      throw new Error("NYI");
    },
    chmod: async (_path: string, _mode: number) => {
    },
  },
});
