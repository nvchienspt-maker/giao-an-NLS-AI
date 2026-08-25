import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Sử dụng worker từ CDN để tránh lỗi cấu hình Webpack trên Next.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  // Xử lý file Word
  if (file.name.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  // Xử lý file PDF
  if (file.name.endsWith('.pdf')) {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  }

  throw new Error('Định dạng file không được hỗ trợ. Vui lòng tải lên .docx hoặc .pdf');
}