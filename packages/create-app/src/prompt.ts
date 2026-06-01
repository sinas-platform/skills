import prompts from 'prompts';

export interface UserInput {
  appName: string;
  appNamespace: string;
  instance_url: string;
  admin_token: string;
}

export async function promptUser(opts: { defaultAppName: string }): Promise<UserInput> {
  const answers = await prompts(
    [
      {
        type: 'text',
        name: 'appName',
        message: 'App name',
        initial: opts.defaultAppName,
        validate: (v: string) =>
          /^[a-z][a-z0-9-]*$/.test(v.trim()) ? true : 'kebab-case, lowercase, must start with a letter',
        format: (v: string) => v.trim(),
      },
      {
        type: 'text',
        name: 'appNamespace',
        message: 'Sinas namespace for the package',
        initial: (_prev, vals) => String(vals.appName ?? ''),
        validate: (v: string) =>
          /^[a-z][a-z0-9-]*$/.test(v.trim()) ? true : 'kebab-case, lowercase',
        format: (v: string) => v.trim(),
      },
      {
        type: 'text',
        name: 'instance_url',
        message: 'Sinas instance URL',
        initial: 'http://localhost:8000',
        validate: (v: string) =>
          /^https?:\/\/.+/.test(v.trim()) ? true : 'Must start with http:// or https://',
        format: (v: string) => v.trim().replace(/\/+$/, ''),
      },
      {
        type: 'password',
        name: 'admin_token',
        message: 'Admin API token (Bearer) — used by the CLI, never bundled into the app',
        validate: (v: string) => (v.trim().length > 0 ? true : 'Required'),
      },
    ],
    { onCancel: () => process.exit(130) },
  );

  return {
    appName: answers.appName,
    appNamespace: answers.appNamespace,
    instance_url: answers.instance_url,
    admin_token: answers.admin_token,
  };
}
