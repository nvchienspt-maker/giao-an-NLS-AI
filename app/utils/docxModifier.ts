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
    // 3. CHÈN VÀO ĐÚNG HOẠT ĐỘNG (NGAY DƯỚI DÒNG "a) Mục tiêu")
    else if (instruction.position === 'hoat_dong' && instruction.activity_keyword) {
      // Chuẩn hóa từ khóa (Ví dụ: "hoạt động 1", "khởi động")
      const actKey = normalize(instruction.activity_keyword);
      let inserted = false;

      // Quét toàn bộ văn bản từ trên xuống dưới
      for (let i = 0; i < chunks.length; i++) {
        // Loại bỏ mọi thẻ HTML/XML ẩn của Word để đọc chữ thô
        const text = normalize(chunks[i].replace(/<[^>]+>/g, ''));
        
        // BƯỚC 1: Tìm xem dòng này có chứa tên hoạt động AI chỉ định không
        if (text.includes(actKey)) {
          
          // BƯỚC 2: Khi đã thấy tên hoạt động, quét xuống tối đa 20 dòng bên dưới
          const endIndex = Math.min(i + 20, chunks.length);
          for (let j = i; j < endIndex; j++) {
            const textAhead = normalize(chunks[j].replace(/<[^>]+>/g, ''));
            
            // BƯỚC 3: Bắt chính xác dòng chứa chữ mục tiêu của hoạt động đó
            if (textAhead.includes('a) mục tiêu') || 
                textAhead.includes('a. mục tiêu') || 
                textAhead.includes('1. mục tiêu') || 
                textAhead.includes('- mục tiêu') || 
                textAhead.includes('+ mục tiêu') || 
                (textAhead.includes('mục tiêu:') && !textAhead.includes('chung'))) {
              
              // CHÈN VÀO NGAY BÊN DƯỚI DÒNG ĐÓ
              chunks[j] = chunks[j] + '</w:p>' + xmlFragment;
              inserted = true;
              break; // Chèn xong thì thoát vòng lặp quét dòng
            }
          }
        }
        
        // Nếu đã chèn thành công cho hoạt động này, thoát vòng lặp quét văn bản để AI chuyển sang lệnh tiếp theo
        if (inserted) {
            break;
        }
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