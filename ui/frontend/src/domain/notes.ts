import type {NoteTag, UserRole, WorkerNote} from '@/types';

export function createNote(workerId: string, text: string, tag: NoteTag, author: string, now: Date): WorkerNote {
  return {
    id: `note-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    workerId,
    text: text.trim(),
    tag,
    createdAt: now.toISOString(),
    author
  };
}

/** Health notes are sensitive and hidden from viewers. */
export function visibleNotes(notes: WorkerNote[], role: UserRole) {
  return role === 'viewer' ? notes.filter((note) => note.tag !== 'health') : notes;
}

export function notesForWorker(notes: WorkerNote[], workerId: string, role: UserRole) {
  return visibleNotes(notes, role)
    .filter((note) => note.workerId === workerId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function noteCounts(notes: WorkerNote[], role: UserRole) {
  const counts = new Map<string, number>();
  for (const note of visibleNotes(notes, role)) counts.set(note.workerId, (counts.get(note.workerId) ?? 0) + 1);
  return counts;
}
