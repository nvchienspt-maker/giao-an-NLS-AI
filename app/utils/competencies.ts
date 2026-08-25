// Định hướng và Từ điển chung cho AI
export const GENERAL_GUIDELINES = `
- Năng lực số (NLS): Mức Cơ bản (CB1, CB2), Tiêu chuẩn (TC1, TC2), Nâng cao (NC1).
- Năng lực AI: NLa (Tư duy con người trung tâm), NLb (Đạo đức AI), NLc (Kỹ thuật ứng dụng), NLd (Thiết kế hệ thống).
- Trọng tâm tích hợp: Phải nhẹ nhàng, tự nhiên, không làm quá tải bài học, phù hợp với lứa tuổi.
`;

// Quy tắc và màu sắc cho từng loại chức năng
export const INTEGRATION_RULES = {
  // Mặc định luôn có Năng lực số nếu chèn từ Phụ lục
  nls: `Mọi nội dung "Năng lực số" chèn thêm PHẢI được bọc trong thẻ: <span style="color: #00008B;">(Nội dung)</span>`,
  
  // 4 Tuỳ chọn nâng cao
  ai: `CHÈN THÊM hướng dẫn Năng lực Trí tuệ nhân tạo (AI) vào hoạt động. Bọc trong thẻ: <span style="color: #B8860B;">(Nội dung)</span>`,
  
  inclusive: `CHÈN THÊM giải pháp, phương án Giáo dục hòa nhập (hỗ trợ HS khuyết tật) dưới các hoạt động. Bọc trong thẻ: <span style="color: #8B0000;">(Nội dung)</span>`,
  
  foreignLang: `CHÈN THÊM thuật ngữ Tiếng Anh chuyên ngành (phương pháp CLIL) bằng cách đặt trong ngoặc đơn ngay cạnh từ khóa tiếng Việt tương ứng.`,
  
  bilingual: `CHÈN THÊM phần dịch tiếng Anh ngay bên dưới các câu tiếng Việt tại một hoạt động Khởi động (Warm-up).`
};