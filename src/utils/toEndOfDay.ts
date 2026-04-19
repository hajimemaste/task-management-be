export const toEndOfDay = (date: string | Date): Date => {
  let y: number, m: number, d: number;

  if (typeof date === "string") {
    // ✅ luôn parse thủ công, tránh timezone bug
    const [year, month, day] = date.split("T")[0].split("-").map(Number);
    y = year;
    m = month;
    d = day;
  } else {
    // ⚠️ tránh lệch timezone
    y = date.getFullYear();
    m = date.getMonth() + 1;
    d = date.getDate();
  }

  // ✅ luôn tạo theo local VN
  return new Date(y, m - 1, d, 23, 59, 59, 999);
};
