import { Types } from "mongoose";
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
        caseId: updatedDoc._id.toString(),
        type: "AUTOPSY_CREATED",
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
        caseItemId: itemId,
        caseId: updatedDoc._id.toString(),
        type: "AUTOPSY_UPDATED",
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
        caseItemId: itemId,
        caseId: updatedDoc._id.toString(),
        type: "AUTOPSY_DELETED",
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
export const exportAutopsyExcel = async (res: any) => {
  const cases = await AutopsyCase.find().lean();

  const workbook = new ExcelJS.Workbook();

  for (const caseItem of cases) {
    const sheetName = `${caseItem.caseMonth}-${caseItem.caseYear}`;
    const sheet = workbook.addWorksheet(sheetName);

    sheet.columns = [
      { header: "STT", key: "stt", width: 6 },
      { header: "Ngày", key: "executionDate", width: 15 },
      { header: "Tử thi", key: "corpse", width: 25 },
      { header: "Hình thức", key: "form", width: 15 },
      { header: "Thời gian", key: "timeCategory", width: 20 },
      { header: "Nội dung", key: "summary", width: 30 },
      { header: "Cán bộ", key: "officers", width: 25 },
      { header: "Phân công", key: "hasAssignment", width: 15 },
      { header: "Đơn vị", key: "unit", width: 20 },
      { header: "Số tiền", key: "paymentAmount", width: 15 },
      { header: "Thanh toán", key: "paymentStatus", width: 15 },
    ];

    caseItem.mainContent.forEach((item: any, index: number) => {
      sheet.addRow({
        stt: index + 1,
        executionDate: item.executionDate?.toISOString().split("T")[0],
        corpse: `${item.corpseName} (${item.birthYear})`,
        form: item.form,
        timeCategory: item.timeCategory,
        summary: item.summary,
        officers: item.officers?.join(", "),
        hasAssignment: item.hasAssignment ? "Có" : "Không",
        unit: item.unit,
        paymentAmount: item.paymentAmount || 0,
        paymentStatus: item.paymentStatus === "PAID" ? "Đã thanh toán" : "Chưa",
      });
    });
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  res.setHeader("Content-Disposition", "attachment; filename=autopsy.xlsx");

  await workbook.xlsx.write(res);
  res.end();
};
