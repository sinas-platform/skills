import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSave: (url: string) => void;
}

function stripProto(s: string): string {
  return s.replace(/^https?:\/\//i, '').replace(/^\/+/, '');
}

export function WorkspaceModal({ open, initial, onClose, onSave }: Props) {
  const [value, setValue] = useState(stripProto(initial));

  useEffect(() => {
    if (open) setValue(stripProto(initial));
  }, [open, initial]);

  if (!open) return null;

  const full = value.trim() ? `https://${value.trim()}` : '';
  const valid = (() => {
    if (!full) return false;
    try {
      const u = new URL(full);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold">Switch workspace</h2>
        <p className="mb-4 text-sm text-gray-500">Enter your Sinas instance URL.</p>
        <div className="flex items-stretch overflow-hidden rounded-md border border-gray-300">
          <span className="bg-gray-50 px-3 py-2 text-sm text-gray-500">https://</span>
          <input
            autoFocus
            className="flex-1 px-3 py-2 text-sm outline-none"
            placeholder="workspace.example.com"
            value={value}
            onChange={(e) => setValue(stripProto(e.target.value))}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() => onSave(full)}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
