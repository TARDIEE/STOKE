import { readFile } from "fs/promises";
import path from "path";

type Submission = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

async function getSubmissions(): Promise<Submission[]> {
  try {
    const file = path.join(process.cwd(), "data", "messages.json");
    const raw = await readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as Submission[];
    return parsed.slice().reverse();
  } catch {
    return [];
  }
}

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const adminToken = process.env.ADMIN_TOKEN;
  const { token } = await searchParams;

  if (adminToken && token !== adminToken) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="mb-2 text-lg font-bold">Restricted</h1>
        <p className="text-sm text-neutral-500">
          Add the correct <code className="rounded bg-neutral-100 px-1">?token=</code> query
          parameter to view this page.
        </p>
      </main>
    );
  }

  const submissions = await getSubmissions();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-bold">Contact form submissions</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {submissions.length} recorded in{" "}
        <code className="rounded bg-neutral-100 px-1">data/messages.json</code>. In production
        (Vercel) that file doesn&apos;t persist between requests — the real delivery channel there
        is email (see <code className="rounded bg-neutral-100 px-1">WEB3FORMS_ACCESS_KEY</code>).
        This page is mainly useful in local development.
        {!adminToken && (
          <>
            {" "}
            Set <code className="rounded bg-neutral-100 px-1">ADMIN_TOKEN</code> in your
            environment to require a token before this page will render.
          </>
        )}
      </p>

      {submissions.length === 0 ? (
        <p className="text-neutral-500">No messages yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {submissions.map((s) => (
            <li key={s.id} className="rounded-lg border border-neutral-300 p-4">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-bold">{s.name}</span>
                <span className="text-neutral-500">
                  {new Date(s.createdAt).toLocaleString()}
                </span>
              </div>
              <a href={`mailto:${s.email}`} className="mb-2 block text-sm underline">
                {s.email}
              </a>
              <p className="whitespace-pre-wrap text-sm">{s.message}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
