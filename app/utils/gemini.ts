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
Bối cảnh: ${contextInfo} (Dùng Khối Lớp này để gắn mã AI).

--- QUY TẮC BẮT BUỘC (CỰC KỲ QUAN TRỌNG) ---
1. CẤU TRÚC JSON MỚI & SỐ LƯỢNG NĂNG LỰC:
   - Trong mỗi "hoat_dong", BẮT BUỘC chỉ chọn ĐÚNG 1 mã Năng lực số và ĐÚNG 1 mã Năng lực AI. TUYỆT ĐỐI không liệt kê dài dòng, không dùng từ 2 mã trở lên cho cùng 1 hoạt động.
   - Trả về dữ liệu bằng các trường (fields) riêng biệt: "nls", "ai", "gdhn".
2. ĐỊNH DẠNG MÃ NĂNG LỰC AI (CHUẨN QĐ 2422): [Lớp].[Mã chủ đề].[Số thứ tự]. 
   - Lớp: 10, 11 hoặc 12.
   - Mã chủ đề: A1, A2, A3, B1, B2, B3, C1, C2, C3, C4, C5, D1, D2.
   - Ví dụ chuẩn: 10.C2.a, 11.A1.b, 12.D2.a.
3. TUYỆT ĐỐI KHÔNG viết mã màu (như 00008B) vào văn bản.

--- CÁC TÙY CHỌN ĐƯỢC BẬT ---
- Năng lực số: LUÔN chèn vào "nang_luc_chung" và 1 mã vào mỗi "hoat_dong".
`;

  if (options.ai) prompt += `- [ĐÃ BẬT] Chèn "Năng lực AI" chuẩn mã vào "nang_luc_chung" và 1 mã vào mỗi "hoat_dong".\n`;
  if (options.inclusive) prompt += `- [ĐÃ BẬT] Chèn "Giáo dục hòa nhập" vào "cuoi_muc_tieu" và lồng ghép vào "hoat_dong".\n`;
  if (options.foreignLang) prompt += `- [ĐÃ BẬT] Tích hợp năng lực ngoại ngữ (CLIL).\n`;
  if (options.bilingual) prompt += `- [ĐÃ BẬT] Tạo song ngữ Việt - Anh hoạt động Khởi động.\n`;
  if (appendixContent) prompt += `\n[PHỤ LỤC PHÂN PHỐI CHƯƠNG TRÌNH]\n${appendixContent}\n`;

  prompt += `
[GIÁO ÁN GỐC]
${lessonContent}

--- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (JSON ARRAY) ---
Trả về mảng JSON thuần túy theo ĐÚNG cấu trúc các fields (nls, ai, gdhn) sau đây:
[
  {
    "position": "nang_luc_chung",
    "nls": [
      "- Năng lực số:",
      "+ (Mã NLS): ..."
    ],
    "ai": [
      "- Năng lực trí tuệ nhân tạo (AI):",
      "+ (Mã chuẩn AI): ..."
    ]
  },
  {
    "position": "cuoi_muc_tieu",
    "gdhn": ["- Giải pháp giáo dục hòa nhập: ..."]
  },
  {
    "position": "hoat_dong",
    "activity_keyword": "khởi động",
    "nls": "- Năng lực số (Mã): (Chỉ viết 1 năng lực ngắn gọn)", 
    "ai": "- Năng lực AI (Mã chuẩn): (Chỉ viết 1 năng lực ngắn gọn)",
    "gdhn": "- Giáo dục hòa nhập: ..."
  },
  {
    "position": "hoat_dong",
    "activity_keyword": "hoạt động 1",
    "nls": "- Năng lực số (...): (Chỉ viết 1 năng lực)",
    "ai": "- Năng lực AI (...): (Chỉ viết 1 năng lực)",
    "gdhn": "- Giáo dục hòa nhập: ..."
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