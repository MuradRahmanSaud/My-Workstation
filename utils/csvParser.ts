

/**
 * specific CSV parser that handles basic CSV structures.
 * For production, use a library like PapaParse.
 */
export const parseCSV = <T>(csvText: string): T[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  // Helper regex for CSV parsing
  const parseLine = (text: string) => {
    const regex = /(?:,|\n|^)("(?:(?:"")*|[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        if (match[1] !== undefined) {
             matches.push(match[1].replace(/^"|"$/g, '').replace(/""/g, '"').trim());
        }
    }
    return matches;
  };

  // Parse headers
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const rawHeaders = parseLine(headerLine);
  
  // Handle duplicate headers
  const headers: string[] = [];
  const headerCounts: Record<string, number> = {};

  rawHeaders.forEach(h => {
      let headerName = h || 'UNKNOWN';
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
    const line = lines[i];
    const matches = parseLine(line);
    
    // Fallback if regex fails (rare) or returns empty
    const values = matches.length > 0 ? matches : line.split(',');

    const obj: any = {};
    headers.forEach((header, index) => {
      // Map header to object key
      if (header) {
          obj[header] = values[index] || '';
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
