import mammoth from 'mammoth';

export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  // Xử lý file Word
  if (file.name.endsWith('.docx')) {
    // Dùng (mammoth as any) để bỏ qua lỗi TypeScript thiếu khai báo types
    // Sử dụng imgElement và trả về src rỗng để chặn render base64
    const options = {
      convertImage: (mammoth as any).images.imgElement(function() {
        return Promise.resolve({ src: "" }); 
      })
    };

    const result = await mammoth.convertToHtml({ arrayBuffer }, options);
    return result.value;
  }

  // Xử lý file PDF
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