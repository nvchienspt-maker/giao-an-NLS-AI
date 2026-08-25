import JSZip from 'jszip';

interface Instruction {
  position: 'nang_luc_chung' | 'cuoi_muc_tieu' | 'hoat_dong';
  activity_keyword?: string;
  content: string[] | string;
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

    let lines: string[] = [];
    if (Array.isArray(instruction.content)) {
        lines = instruction.content;
    } else if (typeof instruction.content === 'string') {
        lines = instruction.content.split('\n');
    }

    for (const line of lines) {
        if (line.trim() !== '') {
            const safeLine = escapeXml(line);
            xmlFragment += `<w:p><w:r><w:rPr><w:color w:val="${colorVal}"/></w:rPr><w:t>${safeLine}</w:t></w:r></w:p>`;
        }
    }

    if (xmlFragment.endsWith('</w:p>')) {
        xmlFragment = xmlFragment.slice(0, -6);
    }

    // 1. CHÈN VÀO NĂNG LỰC CHUNG
    if (instruction.position === 'nang_luc_chung') {
      for (let i = 0; i < chunks.length; i++) {
        const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
        // Tìm đúng tiêu đề Năng lực chung hoặc 2. Năng lực
        if (text.includes('năng lực chung') || text.includes('2. năng lực') || text.includes('về năng lực')) {
          chunks[i] = chunks[i] + '</w:p>' + xmlFragment;
          break;
        }
      }
    } 
    // 2. CHÈN VÀO CUỐI MỤC TIÊU TỔNG (Dành cho Giáo dục hòa nhập)
    else if (instruction.position === 'cuoi_muc_tieu') {
      for (let i = 0; i < chunks.length; i++) {
        const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
        // Rà soát đến khi gặp phần Thiết bị dạy học hoặc Hoạt động dạy học
        if (text.includes('thiết bị dạy học') || text.includes('chuẩn bị') || text.includes('ii. thiết bị') || text.includes('tiến trình dạy học')) {
          // Chèn vào NGAY TRƯỚC phần Thiết bị (Tức là cuối Mục tiêu)
          if (i > 0) {
              chunks[i-1] = chunks[i-1] + '</w:p>' + xmlFragment;
              break;
          }
        }
      }
    } 
    // 3. CHÈN VÀO MỤC TIÊU CỦA CÁC HOẠT ĐỘNG
    else if (instruction.position === 'hoat_dong' && instruction.activity_keyword) {
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