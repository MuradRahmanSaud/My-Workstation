
/**
 * A robust CSV parser that handles quoted values, escaped characters, and empty fields.
 */
export const parseCSV = <T>(csvText: string): T[] => {
  if (!csvText || csvText.trim() === '') return [];
  
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  // Split lines while respecting newlines inside quotes
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if (char === '\n' && !inQuotes) {
      lines.push(currentLine);
      currentLine = '';
    } else if (char === '\r' && !inQuotes) {
      // Ignore \r or handle as part of \r\n
      if (csvText[i + 1] === '\n') {
        lines.push(currentLine);
        currentLine = '';
        i++; // Skip \n
      } else {
        lines.push(currentLine);
        currentLine = '';
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim() !== '') lines.push(currentLine);

  if (lines.length < 1) return [];

  // Helper to parse a single line into parts
  const parseLine = (text: string): string[] => {
    const parts: string[] = [];
    let part = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          // Escaped quote
          part += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        parts.push(part.trim());
        part = '';
      } else {
        part += char;
      }
    }
    parts.push(part.trim());
    return parts;
  };

  // Parse headers
  const headerLine = lines[0].replace(/^\uFEFF/, ''); // Remove BOM if present
  const rawHeaders = parseLine(headerLine);
  
  const headers: string[] = [];
  const headerCounts: Record<string, number> = {};

  rawHeaders.forEach((h, index) => {
      let headerName = h || `COLUMN_${index + 1}`;
      if (headerCounts[headerName]) {
          headerCounts[headerName]++;
          headers.push(`${headerName}_${headerCounts[headerName]}`);
      } else {
          headerCounts[headerName] = 1;
          headers.push(headerName);
      }
  });

  const result: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const lineParts = parseLine(lines[i]);
    // Skip entirely empty lines
    if (lineParts.every(p => p === '')) continue;

    const obj: any = {};
    headers.forEach((header, index) => {
      if (header) {
          obj[header] = lineParts[index] !== undefined ? lineParts[index] : '';
      }
    });
    result.push(obj as T);
  }

  return result;
};

export const extractSheetIdAndGid = (url: string): { id: string | null; gid: string | null } => {
  const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = url.match(/gid=([0-9]+)/);
  
  return {
    id: idMatch ? idMatch[1] : null,
    gid: gidMatch ? gidMatch[1] : '0',
  };
};
