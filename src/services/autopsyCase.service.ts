import mongoose, { Types } from "mongoose";
import { AutopsyCase } from "../models/autopsyCase.model";
import { IAutopsyItem } from "../interfaces/autopsyCase.interface";
import { ApiError } from "../utils/ApiError";
import { sendNotificationToMany } from "./notification.service";
import ExcelJS from "exceljs";
import { User } from "../models/user.model";

// =======================
// 🔹 1. Lấy hồ sơ theo ID
// =======================

export const getCaseById = async (id: string) => {
  const doc = await AutopsyCase.findById(id).populate(
    "mainContent.officers",
    "name",
  );

  if (!doc) {
    throw new ApiError(404, "Hồ sơ không tồn tại");
  }

  doc.mainContent.sort(
    (a, b) =>
      new Date(b.executionDate).getTime() - new Date(a.executionDate).getTime(),
  );

  return doc;
};

// =======================
// 🔹 2. Lấy toàn bộ hồ sơ + auto create tháng
// =======================

export const getAllCases = async () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  await AutopsyCase.findOneAndUpdate(
    { caseMonth: month, caseYear: year },
    {
      $setOnInsert: {
        caseCode: `HS-${month.toString().padStart(2, "0")}-${year}`,
        mainContent: [],
      },
    },
    { upsert: true },
  );

  return AutopsyCase.find().sort({ caseYear: -1, caseMonth: -1 }).lean();
};

// =======================
// 🔹 3. Tạo hồ sơ
// =======================

export const createCase = async ({
  caseMonth,
  caseYear,
}: {
  caseMonth: number;
  caseYear: number;
}) => {
  const existed = await AutopsyCase.findOne({ caseMonth, caseYear });

  if (existed) {
    throw new ApiError(400, "Hồ sơ tháng này đã tồn tại");
  }

  const caseCode = `HS-${caseMonth.toString().padStart(2, "0")}-${caseYear}`;

  return AutopsyCase.create({
    caseMonth,
    caseYear,
    caseCode,
    mainContent: [],
  });
};

// =======================
// 🔹 4. Get or create tháng
// =======================

export const getOrCreateMonthlyCase = async (date: Date) => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  let doc = await AutopsyCase.findOne({
    caseMonth: month,
    caseYear: year,
  });

  if (!doc) {
    doc = await createCase({ caseMonth: month, caseYear: year });
  }

  return doc;
};

// =======================
// 🔹 5. Thêm dòng
// =======================

export const addCaseItem = async ({
  executionDate,
  data,
  userId,
}: {
  executionDate: Date;
  data: Partial<IAutopsyItem>;
  userId: string;
}) => {
  if (!executionDate) {
    throw new ApiError(400, "Thiếu ngày thực hiện");
  }

  if (!data.officers || !Array.isArray(data.officers)) {
    throw new ApiError(400, "Danh sách cán bộ không hợp lệ");
  }

  const doc = await getOrCreateMonthlyCase(executionDate);

  const newItem = {
    ...data,
    executionDate,
    createdBy: new Types.ObjectId(userId),
  };

  const updatedDoc = await AutopsyCase.findByIdAndUpdate(
    doc._id,
    { $push: { mainContent: newItem } },
    { new: true },
  );

  if (!updatedDoc) {
    throw new ApiError(500, "Tạo dòng thất bại");
  }

  // 🔔 notification
  const notifyUserIds = data.officers
    .map((id) => id.toString())
    .filter((id) => id !== userId);

  if (notifyUserIds.length) {
    await sendNotificationToMany({
      userIds: notifyUserIds,
      title: "Có hồ sơ khám nghiệm mới",
      body: data.summary || "Bạn được thêm vào hồ sơ khám nghiệm",
      type: "AUTOPSY_CREATED",
      data: {
        caseId: doc._id.toString(),
        type: "AUTOPSY_CREATED",
        name: doc.caseCode.toString(),
        month: doc.caseMonth.toString(),
        year: doc.caseYear.toString(),
      },
    });
  }

  const newAddedItem =
    updatedDoc.mainContent[updatedDoc.mainContent.length - 1];

  await updatedDoc.populate({
    path: "mainContent.officers",
    select: "name",
  });

  return newAddedItem;
};

// =======================
// 🔹 6. Update dòng
// =======================

export const updateCaseItem = async ({
  itemId,
  data,
  userId,
}: {
  itemId: string;
  data: Partial<IAutopsyItem>;
  userId: string;
}) => {
  const doc = await AutopsyCase.findOne({
    "mainContent._id": itemId,
  });

  if (!doc) {
    throw new ApiError(404, "Dòng dữ liệu không tồn tại");
  }

  const oldItem = doc.mainContent.find((i) => i._id?.toString() === itemId);

  if (!oldItem) {
    throw new ApiError(404, "Không tìm thấy dữ liệu");
  }

  const updateData: any = {};

  Object.keys(data).forEach((key) => {
    updateData[`mainContent.$.${key}`] = (data as any)[key];
  });

  const updatedDoc = await AutopsyCase.findOneAndUpdate(
    { "mainContent._id": new Types.ObjectId(itemId) },
    { $set: updateData },
    { new: true },
  );

  if (!updatedDoc) {
    throw new ApiError(500, "Cập nhật thất bại");
  }

  const updatedItem = updatedDoc.mainContent.find(
    (item) => item._id?.toString() === itemId,
  );

  if (!updatedItem) {
    throw new ApiError(500, "Không tìm thấy item sau update");
  }

  const newOfficers = data.officers
    ? data.officers.map((id) => id.toString())
    : oldItem.officers.map((id) => id.toString());

  const notifyUserIds = [...new Set(newOfficers)].filter((id) => id !== userId);

  if (notifyUserIds.length) {
    await sendNotificationToMany({
      userIds: notifyUserIds,
      title: "Hồ sơ khám nghiệm được cập nhật",
      body: data.summary || oldItem.summary || "Đã có chỉnh sửa",
      type: "AUTOPSY_UPDATED",
      data: {
        caseId: doc._id.toString(),
        type: "AUTOPSY_UPDATED",
        name: doc.caseCode.toString(),
        month: doc.caseMonth.toString(),
        year: doc.caseYear.toString(),
      },
    });
  }

  const officersData = await User.find({
    _id: { $in: updatedItem.officers },
  }).select("name");

  const officers = officersData.map((user) => ({
    id: user._id.toString(),
    name: user.name,
  }));

  const populatedItem = {
    ...JSON.parse(JSON.stringify(updatedItem)),
    officers,
  };

  return populatedItem;
};

// =======================
// 🔹 7. Xoá dòng
// =======================

export const deleteCaseItem = async ({
  itemId,
  userId,
}: {
  itemId: string;
  userId: string;
}) => {
  const doc = await AutopsyCase.findOne({
    "mainContent._id": itemId,
  });

  if (!doc) {
    throw new ApiError(404, "Dòng dữ liệu không tồn tại");
  }

  const oldItem = doc.mainContent.find((i) => i._id?.toString() === itemId);

  if (!oldItem) {
    throw new ApiError(404, "Không tìm thấy dữ liệu");
  }

  const updatedDoc = await AutopsyCase.findOneAndUpdate(
    { "mainContent._id": new Types.ObjectId(itemId) },
    {
      $pull: {
        mainContent: { _id: new Types.ObjectId(itemId) },
      },
    },
    { new: true },
  );

  if (!updatedDoc) {
    throw new ApiError(500, "Xoá thất bại");
  }

  const notifyUserIds = [
    ...new Set(oldItem.officers.map((id) => id.toString())),
  ].filter((id) => id !== userId);

  if (notifyUserIds.length) {
    await sendNotificationToMany({
      userIds: notifyUserIds,
      title: "Hồ sơ khám nghiệm bị xoá",
      body: oldItem.summary || "Một hồ sơ đã bị xoá",
      type: "AUTOPSY_DELETED",
      data: {
        caseId: doc._id.toString(),
        type: "AUTOPSY_DELETED",
        name: doc.caseCode.toString(),
        month: doc.caseMonth.toString(),
        year: doc.caseYear.toString(),
      },
    });
  }

  return updatedDoc;
};

// =======================
// 🔹 8. Filter
// =======================

export const filterCaseItems = async ({
  month,
  year,
  keyword,
  officerIds,
  form,
  timeCategory,
  hasAssignment,
  paymentStatus,
  fromDate,
  toDate,
}: any) => {
  const match: any = {};
  if (month) match.caseMonth = month;
  if (year) match.caseYear = year;

  const pipeline: any[] = [{ $match: match }, { $unwind: "$mainContent" }];

  const itemMatch: any = {};

  if (keyword) {
    itemMatch.$or = [
      { "mainContent.corpseName": { $regex: keyword, $options: "i" } },
      { "mainContent.summary": { $regex: keyword, $options: "i" } },
      { "mainContent.unit": { $regex: keyword, $options: "i" } },
    ];
  }

  if (form?.length) {
    itemMatch["mainContent.form"] = { $in: form };
  }

  if (timeCategory?.length) {
    itemMatch["mainContent.timeCategory"] = { $in: timeCategory };
  }

  if (paymentStatus?.length) {
    itemMatch["mainContent.paymentStatus"] = { $in: paymentStatus };
  }

  if (officerIds?.length) {
    itemMatch["mainContent.officers"] = {
      $in: officerIds.map((id: string) => new Types.ObjectId(id)),
    };
  }

  if (typeof hasAssignment === "boolean") {
    itemMatch["mainContent.hasAssignment"] = hasAssignment;
  }

  if (fromDate || toDate) {
    itemMatch["mainContent.executionDate"] = {};
    if (fromDate) itemMatch["mainContent.executionDate"].$gte = fromDate;
    if (toDate) itemMatch["mainContent.executionDate"].$lte = toDate;
  }

  if (Object.keys(itemMatch).length) {
    pipeline.push({ $match: itemMatch });
  }

  pipeline.push({
    $lookup: {
      from: "users",
      localField: "mainContent.officers",
      foreignField: "_id",
      as: "officerDocs",
    },
  });

  pipeline.push({
    $addFields: {
      "mainContent.officers": {
        $map: {
          input: "$officerDocs",
          as: "o",
          in: {
            _id: "$$o._id",
            name: "$$o.name",
          },
        },
      },
    },
  });

  pipeline.push({
    $sort: { "mainContent.executionDate": 1 },
  });

  pipeline.push({
    $replaceRoot: {
      newRoot: "$mainContent",
    },
  });

  return AutopsyCase.aggregate(pipeline);
};

// =======================
// 🔹 9. Xuất excel
// =======================
export const exportAutopsyExcel = async (id: string, res: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID không hợp lệ");
  }

  const caseItem = await AutopsyCase.findById(id)
    .populate("mainContent.officers", "name") // 👈 lấy tên
    .lean();

  if (!caseItem) {
    throw new Error("Không tìm thấy hồ sơ");
  }

  const workbook = new ExcelJS.Workbook();
  const sheetName = `${caseItem.caseMonth}-${caseItem.caseYear}`;
  const sheet = workbook.addWorksheet(sheetName);

  // ✅ HEADER IN HOA
  sheet.columns = [
    { header: "STT", key: "stt", width: 6 },
    { header: "NGÀY", key: "executionDate", width: 15 },
    { header: "TỬ THI", key: "corpse", width: 25 },
    { header: "HÌNH THỨC", key: "form", width: 15 },
    { header: "THỜI GIAN", key: "timeCategory", width: 20 },
    { header: "NỘI DUNG", key: "summary", width: 30 },
    { header: "CÁN BỘ", key: "officers", width: 25 },
    { header: "PHÂN CÔNG", key: "hasAssignment", width: 15 },
    { header: "ĐƠN VỊ", key: "unit", width: 20 },
    { header: "SỐ TIỀN", key: "paymentAmount", width: 15 },
    { header: "THANH TOÁN", key: "paymentStatus", width: 15 },
  ];

  // ✅ STYLE HEADER
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // =======================
  // 🔥 SORT THEO executionDate
  // =======================
  const sortedData = [...caseItem.mainContent].sort((a: any, b: any) => {
    return (
      new Date(a.executionDate).getTime() - new Date(b.executionDate).getTime()
    );
  });

  // =======================
  // 🔥 FORMAT DATE dd/mm/yyyy
  // =======================
  const formatDate = (date: Date) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // =======================
  // DATA
  // =======================
  sortedData.forEach((item: any, index: number) => {
    sheet.addRow({
      stt: index + 1,
      executionDate: formatDate(item.executionDate),
      corpse: `${item.corpseName} (${item.birthYear})`,
      form: item.form,
      timeCategory: item.timeCategory,
      summary: item.summary,

      // ✅ officers → tên
      officers: item.officers
        ?.map((o: any) => o?.name)
        .filter(Boolean)
        .join(", "),

      hasAssignment: item.hasAssignment ? "Có" : "Không",
      unit: item.unit,
      paymentAmount: item.paymentAmount || 0,
      paymentStatus: item.paymentStatus === "PAID" ? "Đã thanh toán" : "Chưa",
    });
  });

  // =======================
  // STYLE ROW
  // =======================
  sheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: "middle", wrapText: true };

    if (rowNumber > 1) {
      row.getCell("stt").alignment = { horizontal: "center" };
      row.getCell("executionDate").alignment = { horizontal: "center" };
      row.getCell("timeCategory").alignment = { horizontal: "center" };
      row.getCell("hasAssignment").alignment = { horizontal: "center" };
      row.getCell("unit").alignment = { horizontal: "center" };
      row.getCell("paymentAmount").alignment = { horizontal: "center" };
      row.getCell("paymentStatus").alignment = { horizontal: "center" };
    }
  });

  // Freeze header
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  // Response
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=autopsy-${caseItem.caseMonth}-${caseItem.caseYear}.xlsx`,
  );

  await workbook.xlsx.write(res);
  res.end();
};
