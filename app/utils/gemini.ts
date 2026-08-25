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
Bối cảnh: ${contextInfo}

--- QUY TẮC BẮT BUỘC (CỰC KỲ QUAN TRỌNG) ---
1. TUYỆT ĐỐI KHÔNG được viết các mã màu (như 00008B, B8860B, 8B0000) vào trong nội dung văn bản (content).
2. Phải tách riêng biệt từng hoạt động (Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng) thành các object riêng trong JSON. Không được gộp chung.

--- CÁC TÙY CHỌN ĐƯỢC BẬT ---
- Năng lực số: LUÔN chèn vào "nang_luc_chung" và tất cả các "hoat_dong".
`;

  if (options.ai) prompt += `- [ĐÃ BẬT] Chèn "Năng lực AI" vào "nang_luc_chung" và "hoat_dong".\n`;
  if (options.inclusive) prompt += `- [ĐÃ BẬT] Chèn "Giáo dục hòa nhập" vào "cuoi_muc_tieu" và "hoat_dong".\n`;
  if (options.foreignLang) prompt += `- [ĐÃ BẬT] Tích hợp năng lực ngoại ngữ (CLIL).\n`;
  if (options.bilingual) prompt += `- [ĐÃ BẬT] Tạo song ngữ Việt - Anh hoạt động Khởi động.\n`;
  if (appendixContent) prompt += `\n[PHỤ LỤC PHÂN PHỐI CHƯƠNG TRÌNH]\n${appendixContent}\n`;

  prompt += `
[GIÁO ÁN GỐC]
${lessonContent}

--- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (JSON ARRAY) ---
Trả về mảng JSON thuần túy (Sinh đủ object cho tất cả các hoạt động có trong giáo án):
[
  {
    "position": "nang_luc_chung",
    "content": ["- Năng lực số:", "+ 5.1.NC1a: ..."],
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
    "content": ["- Năng lực số: Nhận diện...", "- Năng lực AI: ..."],
    "color": "00008B"
  },
  {
    "position": "hoat_dong",
    "activity_keyword": "hình thành kiến thức",
    "content": ["- Năng lực số: Thực hành cấu hình..."],
    "color": "00008B"
  },
  {
    "position": "hoat_dong",
    "activity_keyword": "luyện tập",
    "content": ["- Năng lực số: ..."],
    "color": "00008B"
  },
  {
    "position": "hoat_dong",
    "activity_keyword": "vận dụng",
    "content": ["- Năng lực số: ..."],
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