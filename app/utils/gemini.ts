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

  let prompt = `BẠN LÀ MỘT HỆ THỐNG PHÂN TÍCH GIÁO ÁN SƯ PHẠM CHUYÊN NGHIỆP.
Bối cảnh: ${contextInfo} (Dùng thông tin Khối Lớp này để gắn mã Năng lực AI cho đúng).

--- QUY TẮC BẮT BUỘC (CỰC KỲ QUAN TRỌNG) ---
1. PHÂN BỔ VÀO HOẠT ĐỘNG: Chèn trực tiếp các Năng lực số và Năng lực AI vào MỤC TIÊU CỦA TỪNG HOẠT ĐỘNG cụ thể (Khởi động, Hoạt động 1, Luyện tập...). Không tự ý sáng tác thêm các năng lực khác ngoài Năng lực số và AI.
2. TUYỆT ĐỐI KHÔNG viết các mã màu (như 00008B, B8860B, 8B0000) vào trong nội dung văn bản (content).
3. ĐỊNH DẠNG MÃ NĂNG LỰC AI PHẢI CHÍNH XÁC TUYỆT ĐỐI THEO CHUẨN QĐ 2422/QĐ-BGDĐT: [Lớp].[Mã chủ đề].[Số thứ tự]. 
   - [Lớp]: 10, 11 hoặc 12 (Dựa vào bối cảnh bài học).
   - [Mã chủ đề]: Phải là một trong các mã: A1, A2, A3, B1, B2, B3, C1, C2, C3, C4, C5, D1, D2.
   - [Số thứ tự]: a, b, c...
   - Ví dụ đúng: 10.C2.a, 11.A1.b, 12.D2.a.
   - TUYỆT ĐỐI KHÔNG DÙNG CÁC MÀ TỰ CHẾ NHƯ "AI.1.1.CB".

--- CÁC TÙY CHỌN ĐƯỢC BẬT ---
- Năng lực số: LUÔN PHÂN BỔ vào tất cả các "hoat_dong".
`;

  if (options.ai) prompt += `- [ĐÃ BẬT] Phân bổ "Năng lực AI" chuẩn mã vào các "hoat_dong".\n`;
  if (options.inclusive) prompt += `- [ĐÃ BẬT] Chèn "Giáo dục hòa nhập" vào "cuoi_muc_tieu" và lồng ghép vào các "hoat_dong".\n`;
  if (options.foreignLang) prompt += `- [ĐÃ BẬT] Tích hợp năng lực ngoại ngữ (CLIL).\n`;
  if (options.bilingual) prompt += `- [ĐÃ BẬT] Tạo song ngữ Việt - Anh hoạt động Khởi động.\n`;
  if (appendixContent) prompt += `\n[PHỤ LỤC PHÂN PHỐI CHƯƠNG TRÌNH]\n${appendixContent}\n`;

  prompt += `
[GIÁO ÁN GỐC]
${lessonContent}

--- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (JSON ARRAY) ---
Trả về mảng JSON thuần túy (Sinh đủ object cho TẤT CẢ các hoạt động có trong giáo án):
[
  {
    "position": "cuoi_muc_tieu",
    "content": ["- Giải pháp giáo dục hòa nhập: ..."],
    "color": "8B0000"
  },
  {
    "position": "hoat_dong",
    "activity_keyword": "khởi động",
    "content": [
      "- Năng lực số (2.2.NC1a): ...", 
      "- Năng lực AI (10.C2.a): ..."
    ],
    "color": "00008B"
  },
  {
    "position": "hoat_dong",
    "activity_keyword": "hoạt động 1",
    "content": [
      "- Năng lực số (...): ...",
      "- Năng lực AI (...): ..."
    ],
    "color": "00008B"
  },
  {
    "position": "hoat_dong",
    "activity_keyword": "luyện tập",
    "content": ["- Năng lực số (...): ..."],
    "color": "00008B"
  }
]
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text(); 
  } catch (err: any) {
    throw new Error(err.message || "Lỗi kết nối AI.");
  }
}