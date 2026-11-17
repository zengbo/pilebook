import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { EmptyState, ErrorNote } from "../components/ui";
import type { Notice } from "../types";

export function MessagesPage() {
  const [notes, setNotes] = useState<Notice[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api<{ notifications: Notice[] }>("/api/notifications")
      .then((data) => setNotes(data.notifications))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not load messages."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display text-4xl">Messages</h1>
      <p className="mt-2 text-muted">Confirmations and reminders. In dev they are logged here and in the server console. SMS rows stay skipped on purpose.</p>
      {error ? <div className="mt-4"><ErrorNote>{error}</ErrorNote></div> : null}
      {loading ? <p className="mt-4 text-sm text-muted">Loading messages…</p> : null}
      {!loading && notes.length === 0 ? <div className="mt-4"><EmptyState title="No messages yet." body="A booking writes the confirmation here, even when email is only printed to the log." /></div> : null}
      <div className="mt-4 space-y-2">
        {notes.map((note) => (
          <button key={note.id} type="button" className="w-full rounded-2xl border border-line bg-card px-4 py-3 text-left" onClick={() => setOpen(open === note.id ? null : note.id)}>
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{note.subject || note.kind}</span>
              <span className="text-xs uppercase tracking-wide text-muted">{note.channel} · {note.status}</span>
            </span>
            <span className="mt-1 block text-sm text-muted">{note.toAddress} · {new Date(note.createdAt).toLocaleString()}</span>
            {open === note.id ? <pre className="mt-3 whitespace-pre-wrap font-sans text-sm">{note.body}</pre> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
