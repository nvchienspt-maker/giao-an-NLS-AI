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

    // 1. CHÈN VÀO NĂNG LỰC CHUNG (ĐÃ SỬA LỖI VỊ TRÍ)
    if (instruction.position === 'nang_luc_chung') {
      let targetIndex = -1;
      
      for (let i = 0; i < chunks.length; i++) {
        const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
        
        // Ưu tiên tuyệt đối 1: Tìm thấy chữ "năng lực chung" thì chốt luôn vị trí này
        if (text.includes('năng lực chung')) {
          targetIndex = i;
          break; 
        }
        
        // Ưu tiên 2: Nếu chưa thấy, tạm lưu vị trí "2. năng lực" phòng trường hợp giáo án bị thiếu chữ "Năng lực chung"
        if (targetIndex === -1 && (text.includes('2. năng lực') || text.includes('về năng lực'))) {
          targetIndex = i;
        }
      }

      // Thực hiện chèn vào vị trí hoàn hảo nhất đã tìm được
      if (targetIndex !== -1) {
        chunks[targetIndex] = chunks[targetIndex] + '</w:p>' + xmlFragment;
      }
    } 
    // 2. CHÈN VÀO CUỐI MỤC TIÊU TỔNG
    else if (instruction.position === 'cuoi_muc_tieu') {
      for (let i = 0; i < chunks.length; i++) {
        const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
        if (text.includes('thiết bị dạy học') || text.includes('chuẩn bị') || text.includes('ii. thiết bị') || text.includes('tiến trình dạy học')) {
          if (i > 0) {
              chunks[i-1] = chunks[i-1] + '</w:p>' + xmlFragment;
              break;
          }
        }
      }
    } 
    // 3. CHÈN VÀO ĐÚNG HOẠT ĐỘNG (KHỞI ĐỘNG, HOẠT ĐỘNG 1, 2, 3, 4...)
    else if (instruction.position === 'hoat_dong' && instruction.activity_keyword) {
      const actKey = normalize(instruction.activity_keyword);
      let inserted = false;
      let passedMainGoals = false;

      // Lần 1: Quét an toàn (bỏ qua phần mục tiêu chung ở đầu để tránh chèn nhầm)
      for (let i = 0; i < chunks.length; i++) {
        const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
        
        // Đánh dấu khi đã qua phần Mục tiêu chung, vào phần thân bài
        if (text.includes('tiến trình dạy học') || text.includes('hoạt động dạy học') || text.includes('iii. tiến trình') || text.includes('ii. thiết bị')) {
          passedMainGoals = true;
        }

        if (passedMainGoals && text.includes(actKey)) {
          // Khi thấy "hoạt động 1", quét tiếp tối đa 30 dòng bên dưới để tìm chữ "mục tiêu" của nó
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

      // Lần 2 (Dự phòng): Nếu lần 1 tìm trượt do giáo án không có chữ "Tiến trình dạy học", sẽ quét lại từ đầu
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