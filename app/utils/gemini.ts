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

  let prompt = `BẠN LÀ MỘT HỆ THỐNG PHÂN TÍCH GIÁO ÁN SƯ PHẠM.
Bối cảnh: ${contextInfo} (Dùng thông tin Khối Lớp này để gắn mã Năng lực AI cho đúng).

--- QUY TẮC BẮT BUỘC (CỰC KỲ QUAN TRỌNG) ---
1. PHÂN LUỒNG VỊ TRÍ CHÍNH XÁC:
   - "nang_luc_chung": Nơi chứa TỔNG HỢP Năng lực số và AI của toàn bài. BẮT BUỘC phải tách riêng để chèn vào phần I. MỤC TIÊU của giáo án.
   - "hoat_dong": Nơi chứa Năng lực số và AI được chi tiết hóa cho TỪNG HOẠT ĐỘNG (Khởi động, Hình thành kiến thức, Luyện tập...). Không được gộp chung tất cả vào 1 hoạt động.
   - "cuoi_muc_tieu": Nơi chứa Giải pháp giáo dục hòa nhập chung của bài.
2. ĐỊNH DẠNG MÃ NĂNG LỰC AI PHẢI CHÍNH XÁC TUYỆT ĐỐI THEO CHUẨN QĐ 2422/QĐ-BGDĐT: [Lớp].[Mã chủ đề].[Số thứ tự]. 
   - [Lớp]: 10, 11 hoặc 12.
   - [Mã chủ đề]: Phải là: A1, A2, A3, B1, B2, B3, C1, C2, C3, C4, C5, D1, D2.
   - [Số thứ tự]: a, b, c...
   - Ví dụ chuẩn: 10.C2.a, 11.A1.b, 12.D2.a.
3. TUYỆT ĐỐI KHÔNG viết các mã màu (như 00008B) vào trong văn bản.

--- CÁC TÙY CHỌN ĐƯỢC BẬT ---
- Năng lực số: LUÔN chèn vào "nang_luc_chung" và phân bổ vào "hoat_dong".
`;

  if (options.ai) prompt += `- [ĐÃ BẬT] Chèn "Năng lực AI" chuẩn mã vào "nang_luc_chung" và phân bổ vào "hoat_dong".\n`;
  if (options.inclusive) prompt += `- [ĐÃ BẬT] Chèn "Giáo dục hòa nhập" vào "cuoi_muc_tieu" và lồng ghép vào "hoat_dong".\n`;
  if (options.foreignLang) prompt += `- [ĐÃ BẬT] Tích hợp năng lực ngoại ngữ (CLIL).\n`;
  if (options.bilingual) prompt += `- [ĐÃ BẬT] Tạo song ngữ Việt - Anh hoạt động Khởi động.\n`;
  if (appendixContent) prompt += `\n[PHỤ LỤC PHÂN PHỐI CHƯƠNG TRÌNH]\n${appendixContent}\n`;

  prompt += `
[GIÁO ÁN GỐC]
${lessonContent}

--- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (JSON ARRAY) ---
Trả về mảng JSON thuần túy (Phân tách rõ ràng mục tiêu chung ở đầu và mục tiêu của từng hoạt động):
[
  {
    "position": "nang_luc_chung",
    "content": [
      "- Năng lực số:",
      "+ (Mã NLS): ...",
      "- Năng lực trí tuệ nhân tạo (AI):",
      "+ (Mã chuẩn AI): ..."
    ],
    "color": "00008B"
  },
  {
    "position": "cuoi_muc_tieu",
    "content": ["- Giải pháp giáo dục hòa nhập: ..."],
    "color": "8B0000"
  },
  {
    "position": "hoat_dong",
    "activity_keyword": "khởi động",
    "content": [
      "- Năng lực số (...): ...", 
      "- Năng lực AI (...): ..."
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