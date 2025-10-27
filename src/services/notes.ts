import api from "./api";
import type { ApiResponse } from "../types";
import type { Note, NoteCreate, NoteUpdate } from "../types/notes";
import { openDB } from "idb";

const DB_NAME = "edulift-notes-db";
const DB_VERSION = 1;

interface NotesDB {
  notes: {
    key: number;
    value: Note;
    indexes: { lesson_id: number };
  };
}

// Initialize IndexedDB
export const initNotesDB = async () => {
  const db = await openDB<NotesDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("notes")) {
        const notesStore = db.createObjectStore("notes", { keyPath: "id" });
        notesStore.createIndex("lesson_id", "lesson_id");
      }
    },
  });
  return db;
};

// Get note from server or cache
export const getNote = async (lessonId: number): Promise<Note | null> => {
  try {
    const response = await api.get<ApiResponse<Note[]>>(
      `/notes?lessonId=${lessonId}`
    );
    const notes = response.data.data;
    return notes && notes.length > 0 ? notes[0] : null;
  } catch (error) {
    console.error("Failed to fetch note from server:", error);
    // Fallback to IndexedDB
    const db = await initNotesDB();
    const cachedNote = await db.get("notes", lessonId);
    return cachedNote || null;
  }
};

// Save note to server and cache
export const saveNote = async (noteData: NoteCreate): Promise<Note> => {
  const db = await initNotesDB();

  try {
    // Try to save to server first
    const response = await api.post<ApiResponse<Note>>("/notes", noteData);
    const note = response.data.data!;

    // Cache in IndexedDB
    await db.put("notes", note);

    return note;
  } catch (error) {
    console.error("Failed to save note to server:", error);

    // Save to IndexedDB for offline persistence
    const cachedNote = {
      id: Date.now(), // Temporary ID
      user_id: 1, // Get from localStorage or context
      lesson_id: noteData.lesson_id,
      content: noteData.content,
      updated_at: new Date().toISOString(),
    } as Note;

    await db.put("notes", cachedNote);

    // Queue for sync when online
    await queueNoteForSync(cachedNote);

    return cachedNote;
  }
};

// Update existing note
export const updateNote = async (noteData: NoteUpdate): Promise<Note> => {
  const db = await initNotesDB();

  try {
    const response = await api.patch<ApiResponse<Note>>(
      `/notes/${noteData.id}`,
      {
        content: noteData.content,
      }
    );
    const note = response.data.data!;

    // Update cache
    await db.put("notes", note);

    return note;
  } catch (error) {
    console.error("Failed to update note on server:", error);

    // Update in IndexedDB
    const existingNote = await db.get("notes", noteData.id);
    if (existingNote) {
      const updatedNote = {
        ...existingNote,
        content: noteData.content,
        updated_at: new Date().toISOString(),
      };
      await db.put("notes", updatedNote);

      // Queue for sync
      await queueNoteForSync(updatedNote);

      return updatedNote;
    }

    throw error;
  }
};

// Queue note for sync when online
const queueNoteForSync = async (note: Note) => {
  try {
    const db = await initNotesDB();
    const syncQueue = db
      .transaction("syncQueue", "readwrite")
      .objectStore("syncQueue");
    await syncQueue.add({ note, timestamp: Date.now(), synced: false });
  } catch {
    // Sync queue table might not exist yet
    console.warn("Sync queue not initialized");
  }
};

// Download note as text
export const downloadNoteAsText = (
  content: string,
  filename: string = "notes.txt"
) => {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Download note as PDF (simplified - basic implementation)
export const downloadNoteAsPDF = (
  content: string,
  filename: string = "notes.pdf"
) => {
  // For now, just download as text
  // In production, you would use a library like jsPDF or pdf.js
  downloadNoteAsText(content, filename.replace(".pdf", ".txt"));
};
