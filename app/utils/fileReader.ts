import mammoth from 'mammoth';

export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  // Xử lý file Word
  if (file.name.endsWith('.docx')) {
    // SỬ DỤNG convertToHtml ĐỂ GIỮ NGUYÊN CẤU TRÚC BẢNG BIỂU VÀ ĐỊNH DẠNG HTML
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value;
  }

  // Xử lý file PDF (PDF không hỗ trợ xuất HTML dễ dàng như Word, nên vẫn lấy Text)
  if (file.name.endsWith('.pdf')) {
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