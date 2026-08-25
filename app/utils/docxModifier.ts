import JSZip from 'jszip';

interface Instruction {
  position: 'general_goal' | 'activity_goal';
  activity_keyword?: string;
  content: string[]; // <-- Chuyển thành Mảng chuỗi (Array of strings)
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
    const colorVal = instruction.color ? instruction.color.replace('#', '') : '00008B';
    let xmlFragment = '';

    // Lặp qua từng dòng trong mảng để ép tạo thẻ đoạn văn mới (<w:p>) trong Word
    if (Array.isArray(instruction.content)) {
        for (const line of instruction.content) {
            if (line.trim() !== '') {
                const safeLine = escapeXml(line);
                xmlFragment += `<w:p><w:r><w:rPr><w:color w:val="${colorVal}"/></w:rPr><w:t>${safeLine}</w:t></w:r></w:p>`;
            }
        }
    }

    if (instruction.position === 'general_goal') {
      for (let i = 0; i < chunks.length; i++) {
        const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
        if (text.includes('mục tiêu') || text.includes('về năng lực')) {
          chunks[i] = chunks[i] + '</w:p>' + xmlFragment;
          break;
        }
      }
    } else if (instruction.position === 'activity_goal' && instruction.activity_keyword) {
      const actKey = normalize(instruction.activity_keyword);
      let foundActivity = false;
      
      for (let i = 0; i < chunks.length; i++) {
        const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
        if (text.includes(actKey)) {
          foundActivity = true;
        }
        if (foundActivity && (text.includes('a) mục tiêu') || text.includes('mục tiêu:') || text.includes('a) mục tiêu:'))) {
          chunks[i] = chunks[i] + '</w:p>' + xmlFragment;
          break;
        }
      }
    }
  }

  const newXmlString = chunks.join('</w:p>');
  zip.file("word/document.xml", newXmlString);

  return await zip.generateAsync({ type: "blob" });
}