import JSZip from 'jszip';

interface Instruction {
  target_text: string;
  insert_text: string;
  color: string;
}

export async function patchDocx(originalFile: File, instructions: Instruction[]): Promise<Blob> {
  const arrayBuffer = await originalFile.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // Trích xuất mã lõi cấu trúc của Word
  const xmlString = await zip.file("word/document.xml")?.async("text");
  if (!xmlString) throw new Error("Không thể đọc cấu trúc file Word");

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");
  const paragraphs = Array.from(doc.getElementsByTagName("w:p"));

  // Hàm chuẩn hóa chuỗi để so sánh chính xác (bỏ khoảng trắng thừa, đưa về chữ thường)
  const normalize = (str: string) => str.replace(/\s+/g, ' ').trim().toLowerCase();

  for (const instruction of instructions) {
    const target = normalize(instruction.target_text);
    if (!target) continue;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      // Gộp tất cả các chữ trong 1 đoạn văn (paragraph) lại để đọc
      const textNodes = Array.from(p.getElementsByTagName("w:t"));
      const pText = normalize(textNodes.map(n => n.textContent || "").join(""));

      // Nếu đoạn văn trong Word chứa đoạn mỏ neo AI chỉ định
      if (pText.includes(target)) {
        const colorVal = instruction.color.replace('#', '');
        
        // Tạo một đoạn văn OOXML mới hoàn toàn với màu sắc được chỉ định
        const newPXml = `
          <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
            <w:r>
              <w:rPr><w:color w:val="${colorVal}"/></w:rPr>
              <w:t>${instruction.insert_text}</w:t>
            </w:r>
          </w:p>`;
          
        const tempDoc = parser.parseFromString(newPXml, "application/xml");
        const newNode = doc.importNode(tempDoc.documentElement, true);

        // Tiêm đoạn văn mới vào ngay bên dưới đoạn mỏ neo tìm thấy
        p.parentNode?.insertBefore(newNode, p.nextSibling);
        break; // Chèn xong thì chuyển sang lệnh tiếp theo
      }
    }
  }

  // Đóng gói lại thành file .docx nguyên vẹn
  const serializer = new XMLSerializer();
  const newXmlString = serializer.serializeToString(doc);
  zip.file("word/document.xml", newXmlString);

  return await zip.generateAsync({ type: "blob" });
}