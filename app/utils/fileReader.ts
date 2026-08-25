import mammoth from 'mammoth';

export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  if (file.name.endsWith('.docx')) {
    // KHÔNG CẤM ẢNH NỮA: Cho phép mammoth trích xuất toàn bộ hình ảnh và bảng biểu
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value;
  }

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