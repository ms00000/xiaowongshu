import { WordHistoryItem } from "../types";

export const exportHistoryToCSV = (history: WordHistoryItem[]) => {
  if (history.length === 0) return;

  // Define CSV Headers
  const headers = [
    "Word",
    "Reading",
    "Definition (CN)",
    "Definition (JP)",
    "Example (JP)",
    "Example (CN)",
    "Date Added"
  ];

  // Convert data to CSV rows
  const rows = history.map(item => {
    return [
      `"${item.word.replace(/"/g, '""')}"`,
      `"${item.reading.replace(/"/g, '""')}"`,
      `"${item.definition.replace(/"/g, '""')}"`,
      `"${item.definition_jp.replace(/"/g, '""')}"`,
      `"${item.example_jp.replace(/"/g, '""')}"`,
      `"${item.example_cn.replace(/"/g, '""')}"`,
      `"${new Date(item.timestamp).toLocaleDateString()}"`
    ].join(",");
  });

  // Combine headers and rows
  const csvContent = [headers.join(","), ...rows].join("\n");

  // Create a Blob
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for Excel BOM support
  const url = URL.createObjectURL(blob);

  // Create a temporary link to trigger download
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `little_yellow_book_vocabulary_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};