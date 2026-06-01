import { useAuth } from '../lib/authContext';

export function HomePage() {
  const { user, signOut } = useAuth();

  return (
    <div className="mx-auto max-w-2xl p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{{appName}}</h1>
        <button
          onClick={() => void signOut()}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Sign out
        </button>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Signed in as</h2>
        <p className="text-base">{user?.email}</p>
        {user?.roles?.length ? (
          <p className="mt-2 text-xs text-gray-500">Roles: {user.roles.join(', ')}</p>
        ) : null}
      </section>

      <section className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Next steps</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>
            Add a query: <code className="rounded bg-gray-100 px-1">sinas add query my-query</code>
          </li>
          <li>
            Validate & install: <code className="rounded bg-gray-100 px-1">sinas validate &amp;&amp; sinas install</code>
          </li>
          <li>
            Read its data here with <code className="rounded bg-gray-100 px-1">useQuery('{{appNamespace}}/my-query')</code> from <code className="rounded bg-gray-100 px-1">@sinas/sdk</code>.
          </li>
        </ul>
      </section>
    </div>
  );
}
