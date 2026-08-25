import JSZip from 'jszip';

interface Instruction {
  target_text: string;
  insert_text: string;
  color: string;
}

// Hàm mã hóa ký tự đặc biệt để không làm hỏng cấu trúc XML của Word
function escapeXml(unsafe: string) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

export async function patchDocx(originalFile: File, instructions: Instruction[]): Promise<Blob> {
  const arrayBuffer = await originalFile.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  const xmlString = await zip.file("word/document.xml")?.async("text");
  if (!xmlString) throw new Error("Không thể đọc cấu trúc file Word");

  const normalize = (str: string) => str.replace(/\s+/g, ' ').trim().toLowerCase();

  // TÁCH CHUỖI AN TOÀN: Cắt file XML theo từng thẻ đóng đoạn văn </w:p>
  let chunks = xmlString.split('</w:p>');

  for (const instruction of instructions) {
    const target = normalize(instruction.target_text);
    if (!target) continue;

    // Mã hóa text an toàn trước khi tiêm vào XML
    const safeInsertText = escapeXml(instruction.insert_text);
    const colorVal = instruction.color.replace('#', '');
    
    // Tạo đoạn mã OOXML chứa nội dung mới (không đóng thẻ </w:p> vì hàm join ở cuối sẽ làm việc đó)
    const unclosedNewPXml = `<w:p><w:r><w:rPr><w:color w:val="${colorVal}"/></w:rPr><w:t>${safeInsertText}</w:t></w:r>`;

    for (let i = 0; i < chunks.length - 1; i++) {
      // Rút trích chữ thô từ đoạn XML hiện tại để so sánh tìm vị trí
      const textContent = normalize(chunks[i].replace(/<[^>]+>/g, ''));
      
      // Nếu tìm thấy đoạn văn chứa mỏ neo mục tiêu
      if (textContent.includes(target)) {
        // Nối đoạn XML mới vào ngay sau đoạn văn hiện tại
        chunks[i] = chunks[i] + '</w:p>' + unclosedNewPXml;
        break; // Chèn xong lệnh này thì ngắt vòng lặp, chuyển sang lệnh AI tiếp theo
      }
    }
  }

  // Gắn lại các đoạn văn bằng thẻ đóng </w:p>
  const newXmlString = chunks.join('</w:p>');
  zip.file("word/document.xml", newXmlString);

  return await zip.generateAsync({ type: "blob" });
}