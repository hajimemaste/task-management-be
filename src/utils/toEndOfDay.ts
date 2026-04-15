export const toEndOfDay = (date: string | Date): Date => {
  let y: number, m: number, d: number;

  if (typeof date === "string") {
    // 🔥 lấy phần YYYY-MM-DD
    const datePart = date.split("T")[0];
    [y, m, d] = datePart.split("-").map(Number);
  } else {
    const tmp = new Date(date);
    y = tmp.getFullYear();
    m = tmp.getMonth() + 1;
    d = tmp.getDate();
  }

  return new Date(y, m - 1, d, 23, 59, 59, 999);
};
