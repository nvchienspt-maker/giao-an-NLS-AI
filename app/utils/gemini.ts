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
        responseMimeType: "application/json", 
        temperature: 0.1, 
      } 
  });

  let prompt = `BẠN LÀ MỘT HỆ THỐNG PHÂN TÍCH VÀ ĐỊNH VỊ CẤU TRÚC GIÁO ÁN SƯ PHẠM.
Bối cảnh: ${contextInfo}

--- NHIỆM VỤ QUAN TRỌNG ---
Bạn phải tìm và lập danh sách các vị trí cần chèn nội dung tích hợp vào **HAI NƠI**:
1. **Mục tiêu chung của bài học** (Phần đầu giáo án).
2. **Mục tiêu của từng Hoạt động** (Tìm chính xác các dòng có chữ dạng: "a) Mục tiêu:", "Mục tiêu:", hoặc dòng mở đầu phần nội dung của Hoạt động 1, Hoạt động 2...).

--- QUY TẮC ĐỊNH DẠNG VÀ MÀU SẮC (BẮT BUỘC) ---
- Định dạng: Viết dưới dạng gạch đầu dòng chuẩn sư phạm. Ví dụ: "- Phát triển năng lực số (Mã): Nội dung..." hoặc "- Năng lực AI: Nội dung..."
- MÀU SẮC (Mã màu Hex cho file Word):
  * Năng lực số: #00008B (Xanh dương tối)
  * Năng lực AI: #B8860B (Vàng tối)
  * Giáo dục hòa nhập: #8B0000 (Đỏ tối)
`;

  if (appendixContent) {
    prompt += `\n[PHỤ LỤC PPCT]\nDùng để tra cứu tên bài và chọn mã Năng lực số (VD: 3.4.NC1a, 5.3.NC1b...) phù hợp:\n${appendixContent}\n`;
  }

  prompt += `
[GIÁO ÁN GỐC]
${lessonContent}

--- CÁC TÙY CHỌN TÍCH HỢP (CHỈ CHÈN KHI ĐƯỢC BẬT) ---
- Luôn luôn chèn Năng lực số vào Mục tiêu chung VÀ Mục tiêu của các Hoạt động giảng dạy. (Màu: 00008B)
`;

  if (options.ai) {
    prompt += `- [ĐÃ BẬT] Chèn tích hợp "Năng lực AI" vào mục tiêu hoạt động phù hợp. (Mã màu: B8860B)\n`;
  }
  if (options.inclusive) {
    prompt += `- [ĐÃ BẬT] Chèn giải pháp "Giáo dục hòa nhập" hỗ trợ học sinh khuyết tật vào phần mục tiêu/nội dung hoạt động. (Mã màu: 8B0000)\n`;
  }
  if (options.foreignLang) {
    prompt += `- [ĐÃ BẬT] Chèn thuật ngữ Tiếng Anh chuyên ngành (CLIL).\n`;
  }
  if (options.bilingual) {
    prompt += `- [ĐÃ BẬT] Chèn bản dịch tiếng Anh vào hoạt động Khởi động.\n`;
  }

  prompt += `
--- ĐẦU RA BẮT BUỘC (JSON ARRAY) ---
Trả về mảng JSON chứa danh sách các điểm mỏ neo cần chèn:
[
  {
    "target_text": "Copy CHÍNH XÁC một câu hoặc đoạn ngắn có thật nằm ngay tại dòng 'a) Mục tiêu:' của một hoạt động hoặc phần mục tiêu chung",
    "insert_text": "- Phát triển năng lực số (Mã): Nội dung chi tiết...",
    "color": "00008B"
  }
]
CHỈ TRẢ VỀ JSON, KHÔNG KÈM GÌ KHÁC.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text(); 
  } catch (err: any) {
    throw new Error(err.message || "Lỗi khi kết nối với AI.");
  }
}