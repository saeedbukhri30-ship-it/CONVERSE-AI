import { type Conversation, type UserPreferences } from '../types';

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Formats a conversation and triggers a download as a .txt file.
 * @param conversation The conversation to export.
 * @param preferences User preferences to get the user's name.
 */
export function exportConversationAsTxt(conversation: Conversation, preferences: UserPreferences): void {
  let content = `Title: ${conversation.title}\n`;
  content += `Exported on: ${new Date().toLocaleString()}\n\n`;
  content += '========================================\n\n';

  conversation.messages.forEach(msg => {
    const author = msg.role === 'user' ? (preferences.userName || 'User') : 'AI';
    content += `[${formatTimestamp(msg.timestamp)}] ${author}:\n`;
    if (msg.imageUrl) {
      content += `[Image Attached]\n`;
    }
    if (msg.videoUrl) {
      content += `[Video Attached]\n`;
    }
    content += `${msg.content}\n\n`;
    content += '----------------------------------------\n\n';
  });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = `ConverseAI - ${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formats a conversation into a print-friendly HTML document and opens the print dialog.
 * @param conversation The conversation to export.
 * @param preferences User preferences to get the user's name.
 */
export function exportConversationAsPdf(conversation: Conversation, preferences: UserPreferences): void {
  const authorName = (role: 'user' | 'model') => role === 'user' ? (preferences.userName || 'User') : 'AI';

  const messagesHtml = conversation.messages.map(msg => `
    <div class="message ${msg.role}">
      <div class="author">${authorName(msg.role)}</div>
      <div class="content">
        ${msg.content.replace(/\n/g, '<br>')}
        ${msg.imageUrl ? `<br><img src="${msg.imageUrl}" class="image-attachment">` : ''}
      </div>
      <div class="timestamp">${formatTimestamp(msg.timestamp)}</div>
    </div>
  `).join('');

  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Export: ${conversation.title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 2rem; color: #111; }
        h1 { color: #000; }
        .message { border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 1rem; padding: 1rem; }
        .message.user { background-color: #f1f3f5; border-color: #dee2e6; }
        .message.model { background-color: #fff; border-color: #e9ecef; }
        .author { font-weight: bold; margin-bottom: 0.5rem; color: #495057; }
        .timestamp { font-size: 0.8rem; color: #868e96; text-align: right; margin-top: 0.5rem; }
        .content { white-space: pre-wrap; word-wrap: break-word; }
        .image-attachment { max-width: 100%; max-height: 400px; margin-top: 0.5rem; border-radius: 4px; }
        @media print {
          body { margin: 1cm; }
          .message { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>${conversation.title}</h1>
      <p>Exported on: ${new Date().toLocaleString()}</p>
      <hr>
      ${messagesHtml}
    </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  iframe.contentDocument?.write(printHtml);
  iframe.contentDocument?.close();
  
  const handlePrint = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Remove iframe after a delay to allow print dialog to open
      setTimeout(() => {
          document.body.removeChild(iframe);
      }, 1000);
  };
  
  if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
    handlePrint();
  } else {
    iframe.onload = handlePrint;
  }
}
