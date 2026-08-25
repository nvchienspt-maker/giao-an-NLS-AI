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
    // 3. CHÈN VÀO ĐÚNG HOẠT ĐỘNG (KHỞI ĐỘNG, LUYỆN TẬP...)
    else if (instruction.position === 'hoat_dong' && instruction.activity_keyword) {
      const actKey = normalize(instruction.activity_keyword);
      let startIndex = -1;

      // Bước 1: Quét tìm tiêu đề hoạt động (Bỏ qua phần Mục tiêu ở đầu trang)
      for (let i = Math.floor(chunks.length / 5); i < chunks.length; i++) {
        const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
        // Tìm dòng có chứa tên hoạt động (Ví dụ: "hoạt động 1", "khởi động")
        if (text.includes(actKey) && (text.includes('hoạt động') || text.includes('hđ'))) {
          startIndex = i;
          break;
        }
      }

      // Nếu không tìm thấy chữ "hoạt động", thử tìm mỗi từ khóa (Khởi động, luyện tập...)
      if (startIndex === -1) {
        for (let i = Math.floor(chunks.length / 5); i < chunks.length; i++) {
          const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
          if (text.includes(actKey)) {
            startIndex = i;
            break;
          }
        }
      }

      // Bước 2: Bắt đầu từ tên hoạt động đó, quét xuống tối đa 25 dòng để tìm "a) mục tiêu"
      if (startIndex !== -1) {
        const endIndex = Math.min(startIndex + 25, chunks.length);
        for (let i = startIndex; i < endIndex; i++) {
          const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
          if (text.includes('a) mục tiêu') || text.includes('a. mục tiêu') || text.includes('1. mục tiêu') || text.includes('- mục tiêu') || text.includes('+ mục tiêu') || (text.includes('mục tiêu:') && !text.includes('chung'))) {
            chunks[i] = chunks[i] + '</w:p>' + xmlFragment;
            break; 
          }
        }
      }
    }
  }

  const newXmlString = chunks.join('</w:p>');
  zip.file("word/document.xml", newXmlString);

  return await zip.generateAsync({ type: "blob" });
}