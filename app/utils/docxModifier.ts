import JSZip from 'jszip';

interface Instruction {
  target_text: string;
  insert_text: string;
  color: string;
}

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

  let chunks = xmlString.split('</w:p>');

  for (const instruction of instructions) {
    const target = normalize(instruction.target_text);
    if (!target) continue;

    const safeInsertText = escapeXml(instruction.insert_text);
    const colorVal = instruction.color ? instruction.color.replace('#', '') : '00008B';
    
    // Tạo đoạn văn bản XML mới với màu sắc chuẩn xác theo yêu cầu
    const unclosedNewPXml = `<w:p><w:r><w:rPr><w:color w:val="${colorVal}"/></w:rPr><w:t>${safeInsertText}</w:t></w:r>`;

    for (let i = 0; i < chunks.length - 1; i++) {
      const textContent = normalize(chunks[i].replace(/<[^>]+>/g, ''));
      
      if (textContent.includes(target)) {
        // Tiêm vào ngay bên dưới đoạn văn tìm thấy (Hỗ trợ chèn ở cả mục tiêu chung lẫn mục tiêu hoạt động)
        chunks[i] = chunks[i] + '</w:p>' + unclosedNewPXml;
        break; 
      }
    }
  }

  const newXmlString = chunks.join('</w:p>');
  zip.file("word/document.xml", newXmlString);

  return await zip.generateAsync({ type: "blob" });
}