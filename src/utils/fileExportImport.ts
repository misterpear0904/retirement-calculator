import { RetirementState } from '../types/retirement';

/**
 * Exports state object as a downloaded encoded file (.retire / .json) or text string.
 */
export function exportStateToFile(state: RetirementState, filename = 'retirement-inputs.retire') {
  try {
    const jsonStr = JSON.stringify(state, null, 2);
    // Base64 encode string to make it encoded/non-human-readable if desired
    const encodedData = btoa(encodeURIComponent(jsonStr));
    
    const blob = new Blob([encodedData], { type: 'application/octet-stream' });
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
 * Imports state from an encoded file or string.
 */
export function importStateFromFile(file: File): Promise<Partial<RetirementState>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          throw new Error('File is empty');
        }
        let parsedData: Partial<RetirementState>;
        
        // Attempt decoding base64 first (non-human-readable format)
        try {
          const jsonStr = decodeURIComponent(atob(text.trim()));
          parsedData = JSON.parse(jsonStr);
        } catch {
          // Fallback to direct JSON parse if user imports raw JSON
          parsedData = JSON.parse(text);
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
