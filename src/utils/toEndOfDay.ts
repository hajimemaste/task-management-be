export const toEndOfDay = (date: string | Date): Date => {
  let y: number, m: number, d: number;

  if (typeof date === "string") {
    const [year, month, day] = date.split("T")[0].split("-").map(Number);
    y = year;
    m = month;
    d = day;
  } else {
    // 🔥 dùng LOCAL (không dùng UTC)
    y = date.getFullYear();
    m = date.getMonth() + 1;
    d = date.getDate();
  }

  return new Date(y, m - 1, d, 0, 0, 0, 0);
};
