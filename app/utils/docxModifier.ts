import JSZip from 'jszip';

interface Instruction {
  position: 'nang_luc_chung' | 'cuoi_muc_tieu' | 'hoat_dong';
  activity_keyword?: string;
  nls?: string[] | string;
  ai?: string[] | string;
  gdhn?: string[] | string;
}

function escapeXml(unsafe: string) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;'; case '>': return '&gt;';
            case '&': return '&amp;'; case '\'': return '&apos;';
            case '"': return '&quot;'; default: return c;
        }
    });
}

// Hàm gán màu độc lập cho từng loại năng lực
function createXmlFragment(lines: string[] | string | undefined, colorHex: string) {
    if (!lines) return '';
    const colorVal = colorHex.replace('#', '');
    let xml = '';
    let arr: string[] = [];
    if (Array.isArray(lines)) arr = lines;
    else if (typeof lines === 'string') arr = lines.split('\n');

    for (const line of arr) {
        if (line.trim() !== '') {
            xml += `<w:p><w:r><w:rPr><w:color w:val="${colorVal}"/></w:rPr><w:t>${escapeXml(line)}</w:t></w:r></w:p>`;
        }
    }
    return xml;
}

export async function patchDocx(originalFile: File, instructions: Instruction[]): Promise<Blob> {
  const arrayBuffer = await originalFile.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  const xmlString = await zip.file("word/document.xml")?.async("text");
  if (!xmlString) throw new Error("Không thể đọc cấu trúc file Word");

  const normalize = (str: string) => str.replace(/\s+/g, ' ').trim().toLowerCase();
  let chunks = xmlString.split('</w:p>');

  for (const instruction of instructions) {
    // ÉP BUỘC THỨ TỰ BẰNG CODE: LUÔN LÀ NLS -> AI -> GDHN
    let xmlFragment = '';
    if (instruction.nls) xmlFragment += createXmlFragment(instruction.nls, '00008B'); // Xanh NLS
    if (instruction.ai) xmlFragment += createXmlFragment(instruction.ai, 'B8860B');   // Vàng AI
    if (instruction.gdhn) xmlFragment += createXmlFragment(instruction.gdhn, '8B0000'); // Đỏ GDHN

    if (xmlFragment === '') continue; // Bỏ qua nếu không có nội dung nào
    
    // Cắt thẻ đóng để nối mạch XML
    if (xmlFragment.endsWith('</w:p>')) {
        xmlFragment = xmlFragment.slice(0, -6);
    }

    // 1. CHÈN NĂNG LỰC CHUNG
    if (instruction.position === 'nang_luc_chung') {
      let targetIndex = -1;
      for (let i = 0; i < chunks.length; i++) {
        const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
        if (text.includes('năng lực chung')) { targetIndex = i; break; }
        if (targetIndex === -1 && (text.includes('2. năng lực') || text.includes('về năng lực'))) targetIndex = i;
      }
      if (targetIndex !== -1) chunks[targetIndex] += '</w:p>' + xmlFragment;
    } 
    
    // 2. CHÈN CUỐI MỤC TIÊU
    else if (instruction.position === 'cuoi_muc_tieu') {
      for (let i = 0; i < chunks.length; i++) {
        const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
        if (text.includes('thiết bị dạy học') || text.includes('chuẩn bị') || text.includes('ii. thiết bị') || text.includes('tiến trình dạy học')) {
          if (i > 0) { chunks[i-1] += '</w:p>' + xmlFragment; break; }
        }
      }
    } 
    
    // 3. CHÈN VÀO ĐÚNG HOẠT ĐỘNG
    else if (instruction.position === 'hoat_dong' && instruction.activity_keyword) {
      const actKey = normalize(instruction.activity_keyword);
      let inserted = false;
      let passedMainGoals = false;

      for (let i = 0; i < chunks.length; i++) {
        const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
        // Dấu hiệu nhận biết đã vào phần Thân bài
        if (text.includes('tiến trình dạy học') || text.includes('hoạt động dạy học') || text.includes('iii. tiến trình') || text.includes('ii. thiết bị')) {
          passedMainGoals = true;
        }

        if (passedMainGoals && text.includes(actKey)) {
          const endIndex = Math.min(i + 30, chunks.length);
          for (let j = i; j < endIndex; j++) {
            const textAhead = normalize(chunks[j].replace(/<[^>]+>/g, ''));
            if (textAhead.includes('a) mục tiêu') || textAhead.includes('a. mục tiêu') || textAhead.includes('1. mục tiêu') || textAhead.includes('- mục tiêu') || textAhead.includes('+ mục tiêu') || (textAhead.includes('mục tiêu:') && !textAhead.includes('chung'))) {
              chunks[j] = chunks[j] + '</w:p>' + xmlFragment;
              inserted = true;
              break; 
            }
          }
        }
        if (inserted) break;
      }

      // Quét dự phòng
      if (!inserted) {
        for (let i = 0; i < chunks.length; i++) {
          const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
          if (text.includes(actKey)) {
            const endIndex = Math.min(i + 30, chunks.length);
            for (let j = i; j < endIndex; j++) {
              const textAhead = normalize(chunks[j].replace(/<[^>]+>/g, ''));
              if (textAhead.includes('a) mục tiêu') || textAhead.includes('a. mục tiêu') || textAhead.includes('1. mục tiêu') || textAhead.includes('- mục tiêu') || textAhead.includes('+ mục tiêu') || (textAhead.includes('mục tiêu:') && !textAhead.includes('chung'))) {
                chunks[j] = chunks[j] + '</w:p>' + xmlFragment;
                inserted = true;
                break; 
              }
            }
          }
          if (inserted) break;
        }
      }
    }
  }

  const newXmlString = chunks.join('</w:p>');
  zip.file("word/document.xml", newXmlString);

  return await zip.generateAsync({ type: "blob" });
}