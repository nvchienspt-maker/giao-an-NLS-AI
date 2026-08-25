import mammoth from 'mammoth';

export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  // Xử lý file Word
  if (file.name.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  // Xử lý file PDF
  if (file.name.endsWith('.pdf')) {
    // [ĐÃ SỬA] Sử dụng dynamic import để tránh lỗi DOMMatrix khi Next.js build trên server Node.js
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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