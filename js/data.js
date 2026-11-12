/* Dữ liệu học: từ vựng, câu hỏi Part 5, việc hàng ngày, cấu trúc bài thi.
   Mỗi từ: [từ, loại từ, nghĩa, câu ví dụ] */
(function (root) {
  var TN = (root.TN = root.TN || {});
  TN.data = {
    VOCAB: [
      ["reimburse", "v", "hoàn trả (chi phí)", "The company will reimburse you for your travel expenses."],
      ["agenda", "n", "chương trình nghị sự", "Please review the agenda before the meeting."],
      ["postpone", "v", "hoãn lại", "The launch was postponed until next month."],
      ["invoice", "n", "hóa đơn", "Send the invoice to the accounting department."],
      ["candidate", "n", "ứng viên", "Each candidate will have a thirty-minute interview."],
      ["deadline", "n", "hạn chót", "The deadline for applications is October 15."],
      ["renew", "v", "gia hạn", "You must renew your contract before it expires."],
      ["supervisor", "n", "người giám sát", "Ask your supervisor to approve the request."],
      ["itinerary", "n", "lịch trình chuyến đi", "The itinerary includes two nights in Singapore."],
      ["negotiate", "v", "đàm phán", "They negotiated a lower price with the supplier."],
      ["warranty", "n", "bảo hành", "The printer comes with a two-year warranty."],
      ["merchandise", "n", "hàng hóa", "All merchandise must be returned within 30 days."],
      ["appoint", "v", "bổ nhiệm", "She was appointed regional manager in March."],
      ["attach", "v", "đính kèm", "Please see the attached file."],
      ["budget", "n", "ngân sách", "The marketing budget was cut by ten percent."],
      ["colleague", "n", "đồng nghiệp", "I will ask a colleague to cover my shift."],
      ["confirm", "v", "xác nhận", "Please confirm your attendance by Monday."],
      ["delivery", "n", "việc giao hàng", "Delivery takes three to five business days."],
      ["efficient", "adj", "hiệu quả", "The new system is more efficient than the old one."],
      ["expire", "v", "hết hạn", "Your passport will expire next year."],
      ["inventory", "n", "hàng tồn kho", "We check the inventory every Friday."],
      ["launch", "v", "ra mắt", "The company will launch its new app in May."],
      ["outstanding", "adj", "còn nợ; xuất sắc", "There is an outstanding balance of $200."],
      ["personnel", "n", "nhân sự", "Only authorized personnel may enter this area."],
      ["proposal", "n", "đề xuất", "The board approved the proposal."],
      ["quarter", "n", "quý", "Revenue rose in the second quarter."],
      ["refund", "n", "tiền hoàn lại", "You can request a full refund within a week."],
      ["registration", "n", "việc đăng ký", "Registration closes on Friday."],
      ["vacancy", "n", "vị trí còn trống", "There is a vacancy in the sales department."],
      ["workshop", "n", "buổi hội thảo thực hành", "The workshop starts at nine o'clock."]
    ],
    /* Mỗi câu: [câu hỏi, [4 đáp án], vị trí đáp án đúng, giải thích] */
    QUIZ: [
      ["Ms. Tran asked all staff to submit their expense reports ------ Friday.", ["by", "until", "during", "since"], 0, "By dùng với mốc hạn chót: nộp chậm nhất vào thứ Sáu."],
      ["The new software is ------ easier to use than the old version.", ["much", "very", "so", "too"], 0, "Much đứng trước so sánh hơn (easier). Very, so, too không đi với so sánh hơn."],
      ["Please ------ the attached invoice before the end of the month.", ["review", "reviewing", "reviewed", "reviews"], 0, "Câu mệnh lệnh bắt đầu bằng please + động từ nguyên mẫu."],
      ["------ the heavy rain, the outdoor event went ahead as planned.", ["Although", "Despite", "Because", "However"], 1, "Despite + cụm danh từ (the heavy rain). Although và because cần một mệnh đề."],
      ["Mr. Kim is responsible ------ training new employees.", ["at", "for", "with", "to"], 1, "Be responsible for + danh từ hoặc V-ing."],
      ["The manager was impressed by the candidate's ------ experience.", ["extend", "extensive", "extensively", "extension"], 1, "Trước danh từ experience cần tính từ: extensive."],
      ["All employees must wear ID badges while ------ the building.", ["enter", "entered", "entering", "entrance"], 2, "While + V-ing khi rút gọn mệnh đề cùng chủ ngữ."],
      ["Sales increased ------ in the third quarter.", ["significant", "significance", "significantly", "signify"], 2, "Bổ nghĩa cho động từ increased cần trạng từ: significantly."]
    ],
    TASKS: ["Ôn thẻ từ vựng đến hạn", "Làm bài Part 5 (8 câu)", "Nghe 1 đoạn Part 3 hoặc 4", "Đọc 1 bài Part 7"],
    PARTS: [
      ["1", "Nghe", 6, "Mô tả tranh", "Chú ý động từ chỉ hành động và vị trí của đồ vật."],
      ["2", "Nghe", 25, "Hỏi đáp", "Nghe từ để hỏi đầu câu: who, when, where, why, how."],
      ["3", "Nghe", 39, "Đoạn hội thoại", "Đọc lướt câu hỏi và đáp án trước khi nghe."],
      ["4", "Nghe", 30, "Bài nói ngắn", "Đoán loại bài (thông báo, quảng cáo, voicemail) từ câu mở đầu."],
      ["5", "Đọc", 30, "Hoàn thành câu", "Xác định loại từ cần điền trước, rồi mới xét nghĩa."],
      ["6", "Đọc", 16, "Hoàn thành đoạn văn", "Câu điền thêm phải khớp ý với câu trước và sau."],
      ["7", "Đọc", 54, "Đọc hiểu", "Đọc câu hỏi trước, tìm từ khóa trong bài rồi mới đọc kỹ."]
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
