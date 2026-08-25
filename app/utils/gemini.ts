import { GoogleGenerativeAI } from '@google/generative-ai';

interface LessonOptions {
  ai: boolean;
  inclusive: boolean;
  foreignLang: boolean;
  bilingual: boolean;
}

export async function generateLessonPlan(
  apiKey: string, 
  modelName: string, 
  lessonContent: string, 
  options: LessonOptions,
  contextInfo: string,
  appendixContent?: string
) {
  if (!apiKey) throw new Error("Vui lòng thiết lập API Key.");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: { 
        maxOutputTokens: 8192,
        temperature: 0.1 // Giữ nhiệt độ thấp để AI sao chép y nguyên HTML gốc
      } 
  });

  // TÍCH HỢP TỪ ĐIỂN HƯỚNG DẪN NĂNG LỰC SỐ VÀ AI VÀO SYSTEM PROMPT
  const AI_GUIDELINES = `
TỪ ĐIỂN MÃ CHỈ BÁO NĂNG LỰC SỐ VÀ AI:
- Năng lực số (NLS): Gồm các mức độ Cơ bản (CB1, CB2), Tiêu chuẩn (TC1, TC2), Nâng cao (NC1). VD: 1.1.NC1a (Đáp ứng nhu cầu thông tin), 2.1.TC1a (Tương tác qua công nghệ số)...
- Năng lực AI: Gồm 4 mạch NLa (Tư duy lấy con người làm trung tâm), NLb (Đạo đức AI), NLc (Kỹ thuật và ứng dụng AI), NLd (Thiết kế hệ thống AI).
- Quy tắc tích hợp: NLS và AI chỉ là công cụ hỗ trợ, học sinh phải duy trì tư duy phản biện. Tích hợp nhẹ nhàng vào mục "Mục tiêu" và "Tiến trình dạy học", không gây quá tải.
  `;

  let prompt = `BẠN LÀ MỘT HỆ THỐNG XỬ LÝ MÃ HTML CHUYÊN NGHIỆP TRONG GIÁO DỤC.
NHIỆM VỤ: Trả về ĐÚNG MỘT MÃ HTML DUY NHẤT. TUYỆT ĐỐI KHÔNG in ra luồng suy nghĩ (No Chain-of-Thought). KHÔNG giải thích. Bắt đầu ngay bằng thẻ HTML.

Bối cảnh: ${contextInfo}
${AI_GUIDELINES}
`;

  if (appendixContent) {
    prompt += `
[PHỤ LỤC PHÂN PHỐI CHƯƠNG TRÌNH (PPCT)]
1. Hãy tìm tên bài học của "Giáo án gốc" trong Phụ lục này.
2. Trích xuất mã năng lực tương ứng của bài đó.
3. Dựa vào "Từ điển mã" ở trên, tự động diễn giải nội dung năng lực và CHÈN THÊM vào phần "Mục tiêu bài học" của Giáo án gốc.
Nội dung Phụ lục PPCT:
${appendixContent}
`;
  }

  prompt += `
[GIÁO ÁN GỐC (Định dạng HTML)]
${lessonContent}

--- QUY TẮC CHÈN THÊM VÀ GIỮ NGUYÊN CẤU TRÚC (STRICT RULES) ---
1. BẢO TOÀN CẤU TRÚC: Giữ nguyên 100% các thẻ bảng biểu (<table>, <tr>, <td>), danh sách (<ul>, <ol>, <li>), thẻ tiêu đề (<h1>, <h2>...) và định dạng gốc. Chỉ được chèn thêm nội dung vào bên trong các thẻ đã có, tuyệt đối không viết lại hay xóa văn bản cũ.
2. KHÔNG IN ĐẬM: Tuyệt đối không dùng thẻ <b> hay <strong> cho các nội dung bạn tự chèn thêm.
3. QUY TẮC MÀU SẮC (Dùng thuộc tính style="color: ...;"):
   - BẤT KỲ nội dung "Năng lực số" nào được chèn thêm PHẢI bọc trong: <span style="color: #00008B;">(Nội dung)</span>
`;

  if (options.ai) {
    prompt += `   - CHÈN THÊM nội dung Năng lực AI vào mục tiêu hoặc hoạt động. Bọc trong: <span style="color: #B8860B;">(Nội dung)</span>\n`;
  }

  if (options.inclusive) {
    prompt += `   - CHÈN THÊM phương án Giáo dục hòa nhập (hỗ trợ HS khuyết tật) vào dưới các hoạt động. Bọc trong: <span style="color: #8B0000;">(Nội dung)</span>\n`;
  }

  if (options.foreignLang) {
    prompt += `   - CHÈN THÊM thuật ngữ Tiếng Anh chuyên ngành (CLIL) trong ngoặc đơn cạnh từ khóa tiếng Việt tương ứng.\n`;
  }

  if (options.bilingual) {
    prompt += `   - CHÈN THÊM phần dịch tiếng Anh ngay bên dưới các câu tiếng Việt tại 1 hoạt động Khởi động (Warm-up).\n`;
  }

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    // Dọn dẹp Markdown nếu AI lỡ sinh ra
    text = text.replace(/```html/g, '').replace(/```/g, '').trim();
    return text;
  } catch (err: any) {
    throw new Error(err.message || "Lỗi khi kết nối với AI.");
  }
}