import JSZip from 'jszip';

interface Instruction {
  position: 'general_goal' | 'activity_goal';
  activity_keyword?: string;
  content: string[] | string; // Hỗ trợ an toàn cả dạng Mảng và Chuỗi
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
  
  // Cắt file XML theo thẻ đóng đoạn văn
  let chunks = xmlString.split('</w:p>');

  for (const instruction of instructions) {
    const colorVal = instruction.color ? instruction.color.replace('#', '') : '00008B';
    let xmlFragment = '';

    // Xử lý an toàn: Đưa nội dung về mảng để lặp
    let lines: string[] = [];
    if (Array.isArray(instruction.content)) {
        lines = instruction.content;
    } else if (typeof instruction.content === 'string') {
        lines = instruction.content.split('\n');
    }

    // Lặp qua từng dòng để tạo các đoạn văn gạch đầu dòng (<w:p>)
    for (const line of lines) {
        if (line.trim() !== '') {
            const safeLine = escapeXml(line);
            xmlFragment += `<w:p><w:r><w:rPr><w:color w:val="${colorVal}"/></w:rPr><w:t>${safeLine}</w:t></w:r></w:p>`;
        }
    }

    // BẢN VÁ LỖI CẤU TRÚC: Cắt bỏ thẻ đóng </w:p> cuối cùng (độ dài 6 ký tự)
    // Để khi hàm chunks.join chạy ở cuối, nó sẽ tự động nối thẻ đóng vào vừa khít
    if (xmlFragment.endsWith('</w:p>')) {
        xmlFragment = xmlFragment.slice(0, -6);
    }

    // Tiến hành tiêm dữ liệu
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
        // Tìm thấy dòng Mục tiêu của hoạt động
        if (foundActivity && (text.includes('a) mục tiêu') || text.includes('mục tiêu:') || text.includes('a) mục tiêu:'))) {
          chunks[i] = chunks[i] + '</w:p>' + xmlFragment;
          break;
        }
      }
    }
  }

  // Khâu cuối: Nối toàn bộ file XML lại, các chỗ bị thiếu </w:p> ở bản vá sẽ được đắp vào đây
  const newXmlString = chunks.join('</w:p>');
  zip.file("word/document.xml", newXmlString);

  return await zip.generateAsync({ type: "blob" });
}