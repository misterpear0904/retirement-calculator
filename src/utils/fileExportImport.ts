import { RetirementState } from '../types/retirement';

/**
 * Exports state as human-readable JSON (.retire / .json).
 * Import still accepts legacy base64-encoded files.
 */
export function exportStateToFile(state: RetirementState, filename = 'retirement-inputs.retire') {
  try {
    const jsonStr = JSON.stringify({ v: 1, exportedAt: new Date().toISOString(), state }, null, 2);

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error exporting state file:', err);
    throw err;
  }
}

/**
 * Imports state from an exported file. Accepts:
 *  - current format: { v, state }
 *  - raw RetirementState JSON
 *  - legacy base64-encoded payloads
 */
export function importStateFromFile(file: File): Promise<Partial<RetirementState>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string)?.trim();
        if (!text) {
          throw new Error('File is empty');
        }
        let parsedData: Partial<RetirementState>;

        const unwrap = (obj: unknown): Partial<RetirementState> => {
          if (typeof obj !== 'object' || obj === null) throw new Error('Invalid state file content');
          const o = obj as Record<string, unknown>;
          if (o.state && typeof o.state === 'object') return o.state as Partial<RetirementState>;
          return o as Partial<RetirementState>;
        };

        // Attempt decoding base64 first (legacy non-human-readable format)
        try {
          const maybeJson = decodeURIComponent(atob(text));
          parsedData = unwrap(JSON.parse(maybeJson));
        } catch {
          // Fallback to direct JSON parse
          parsedData = unwrap(JSON.parse(text));
        }

        if (typeof parsedData !== 'object' || parsedData === null) {
          throw new Error('Invalid state file content');
        }

        resolve(parsedData);
      } catch (err) {
        console.error('Error parsing imported state file:', err);
        reject(new Error('Failed to parse file. Please ensure it is a valid backup file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
