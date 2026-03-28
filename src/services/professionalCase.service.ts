import { Types } from "mongoose";
import { ProfessionalCase } from "../models/professionalCase.model";
import { ICaseItem } from "../interfaces/professionalCase.interface";
import { ApiError } from "../utils/ApiError";
import { sendNotificationToMany } from "../services/notification.service";
import ExcelJS from "exceljs";

// =======================
// 🔹 1. Lấy hồ sơ theo ID
// =======================

export const getCaseById = async (id: string) => {
  const doc = await ProfessionalCase.findById(id).populate(
    "mainContent.officers",
    "name",
  );

  if (!doc) {
    throw new ApiError(404, "Hồ sơ không tồn tại");
  }

  // 🔥 sort mới nhất trước (theo workDate)
  doc.mainContent.sort(
    (a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime(),
  );

  return doc;
};

// =======================
// 🔹 2. Lấy toàn bộ hồ sơ
// =======================

export const getAllCases = async () => {
  const now = new Date();

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // =======================
  // 🔹 1. Check tồn tại
  // =======================

  const existed = await ProfessionalCase.findOne({
    caseMonth: currentMonth,
    caseYear: currentYear,
  });

  // =======================
  // 🔹 2. Nếu chưa có → tạo mới
  // =======================

  if (!existed) {
    const caseCode = `HS-${currentMonth
      .toString()
      .padStart(2, "0")}-${currentYear}`;

    await ProfessionalCase.create({
      caseMonth: currentMonth,
      caseYear: currentYear,
      caseCode,
      mainContent: [],
    });
  }

  // =======================
  // 🔹 3. Trả về toàn bộ list
  // =======================

  return ProfessionalCase.find().sort({ caseYear: -1, caseMonth: -1 }).lean();
};

// =======================
// 🔹 3. Tạo hồ sơ (manual)
// =======================

export const createCase = async ({
  caseMonth,
  caseYear,
}: {
  caseMonth: number;
  caseYear: number;
}) => {
  const existed = await ProfessionalCase.findOne({
    caseMonth,
    caseYear,
  });

  if (existed) {
    throw new ApiError(400, "Hồ sơ tháng này đã tồn tại");
  }

  const caseCode = `HS-${caseMonth.toString().padStart(2, "0")}-${caseYear}`;

  return ProfessionalCase.create({
    caseMonth,
    caseYear,
    caseCode,
    mainContent: [],
  });
};

// =======================
// 🔹 4. Lấy hoặc tạo hồ sơ theo tháng
// =======================

export const getOrCreateMonthlyCase = async (date: Date) => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  let doc = await ProfessionalCase.findOne({
    caseMonth: month,
    caseYear: year,
  });

  if (!doc) {
    doc = await createCase({
      caseMonth: month,
      caseYear: year,
    });
  }

  return doc;
};

// =======================
// 🔹 5. Thêm dòng
// =======================

export const addCaseItem = async ({
  workDate,
  data,
  userId,
}: {
  workDate: Date;
  data: Partial<ICaseItem>;
  userId: string;
}) => {
  if (!workDate) {
    throw new ApiError(400, "Thiếu ngày làm");
  }

  if (!data.officers || !Array.isArray(data.officers)) {
    throw new ApiError(400, "Danh sách cán bộ không hợp lệ");
  }

  // =======================
  // 🔹 1. Lấy hồ sơ tháng
  // =======================
  const doc = await getOrCreateMonthlyCase(workDate);

  const newItem = {
    ...data,
    workDate,
    createdBy: new Types.ObjectId(userId),
  };

  // =======================
  // 🔹 2. Lưu DB
  // =======================
  const updatedDoc = await ProfessionalCase.findByIdAndUpdate(
    doc._id,
    {
      $push: { mainContent: newItem },
    },
    { new: true },
  );

  if (!updatedDoc) {
    throw new ApiError(500, "Tạo dòng dữ liệu thất bại");
  }

  // =======================
  // 🔔 3. Gửi notification
  // =======================

  const officers = data.officers.map((id) => id.toString());

  // ❌ loại bỏ người tạo
  const notifyUserIds = officers.filter((id) => id !== userId);

  if (notifyUserIds.length) {
    await sendNotificationToMany({
      userIds: notifyUserIds,
      title: "Có hồ sơ mới",
      body: data.content || "Bạn được thêm vào hồ sơ mới",
      type: "PROFESSIONAL_CREATED",
      data: {
        caseId: updatedDoc.toString(),
        type: "PROFESSIONAL_CREATED",
      },
    });
  }

  return updatedDoc;
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
  data: Partial<ICaseItem>;
  userId: string;
}) => {
  // =======================
  // 🔹 1. Tìm document chứa item
  // =======================

  const doc = await ProfessionalCase.findOne({
    "mainContent._id": itemId,
  });

  if (!doc) {
    throw new ApiError(404, "Dòng dữ liệu không tồn tại");
  }

  // =======================
  // 🔹 2. Lấy item cũ
  // =======================

  const oldItem = doc.mainContent.find(
    (item) => item._id?.toString() === itemId,
  );

  if (!oldItem) {
    throw new ApiError(404, "Không tìm thấy dữ liệu");
  }

  // =======================
  // 🔹 3. Build update object
  // =======================

  const updateData: any = {};

  Object.keys(data).forEach((key) => {
    updateData[`mainContent.$.${key}`] = (data as any)[key];
  });

  // =======================
  // 🔹 4. Update DB
  // =======================

  const updatedDoc = await ProfessionalCase.findOneAndUpdate(
    {
      "mainContent._id": new Types.ObjectId(itemId),
    },
    {
      $set: updateData,
    },
    { new: true },
  );

  if (!updatedDoc) {
    throw new ApiError(500, "Cập nhật thất bại");
  }

  // =======================
  // 🔔 5. Xử lý officers
  // =======================

  // officers mới (nếu có update)
  const newOfficers = data.officers
    ? data.officers.map((id) => id.toString())
    : oldItem.officers.map((id) => id.toString());

  // loại bỏ user hiện tại
  const notifyUserIds = [...new Set(newOfficers)].filter((id) => id !== userId);

  // =======================
  // 🔔 6. Gửi notification
  // =======================

  if (notifyUserIds.length) {
    await sendNotificationToMany({
      userIds: notifyUserIds,
      title: "Hồ sơ được cập nhật",
      body: data.content || oldItem.content || "Hồ sơ đã được chỉnh sửa",
      type: "PROFESSIONAL_UPDATED",
      data: {
        caseItemId: itemId,
        caseId: updatedDoc._id.toString(),
        type: "PROFESSIONAL_UPDATED",
      },
    });
  }

  return updatedDoc;
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
  // =======================
  // 🔹 1. Tìm document chứa item
  // =======================

  const doc = await ProfessionalCase.findOne({
    "mainContent._id": itemId,
  });

  if (!doc) {
    throw new ApiError(404, "Dòng dữ liệu không tồn tại");
  }

  // =======================
  // 🔹 2. Lấy item cũ (trước khi xoá)
  // =======================

  const oldItem = doc.mainContent.find(
    (item) => item._id?.toString() === itemId,
  );

  if (!oldItem) {
    throw new ApiError(404, "Không tìm thấy dữ liệu");
  }

  // =======================
  // 🔹 3. Xoá khỏi DB
  // =======================

  const updatedDoc = await ProfessionalCase.findOneAndUpdate(
    {
      "mainContent._id": new Types.ObjectId(itemId),
    },
    {
      $pull: {
        mainContent: { _id: new Types.ObjectId(itemId) },
      },
    },
    { new: true },
  );

  if (!updatedDoc) {
    throw new ApiError(500, "Xoá dữ liệu thất bại");
  }

  // =======================
  // 🔔 4. Lấy officers
  // =======================

  const officers = oldItem.officers.map((id) => id.toString());

  // ❌ loại bỏ người xoá
  const notifyUserIds = [...new Set(officers)].filter((id) => id !== userId);

  // =======================
  // 🔔 5. Gửi notification
  // =======================

  if (notifyUserIds.length) {
    await sendNotificationToMany({
      userIds: notifyUserIds,
      title: "Hồ sơ bị xoá",
      body: oldItem.content || "Một hồ sơ đã bị xoá",
      type: "PROFESSIONAL_DELETED",
      data: {
        caseItemId: itemId,
        caseId: updatedDoc._id.toString(),
        type: "PROFESSIONAL_DELETED",
      },
    });
  }

  return updatedDoc;
};

// =======================
// 🔹 8. Filter / search dòng
// =======================

export const filterCaseItems = async ({
  month,
  year,
  keyword,
  caseTypes,
  progressList,
  officerIds,
  fromDate,
  toDate,
  hasImages,
}: {
  month?: number;
  year?: number;
  keyword?: string;

  caseTypes?: string[];
  progressList?: string[];
  officerIds?: string[];

  fromDate?: Date;
  toDate?: Date;

  hasImages?: boolean;
}) => {
  const match: any = {};

  if (month) match.caseMonth = month;
  if (year) match.caseYear = year;

  const pipeline: any[] = [{ $match: match }, { $unwind: "$mainContent" }];

  const itemMatch: any = {};

  // =======================
  // 🔍 KEYWORD SEARCH (multi field)
  // =======================

  if (keyword) {
    itemMatch.$or = [
      {
        "mainContent.content": {
          $regex: keyword,
          $options: "i",
        },
      },
      {
        "mainContent.traces": {
          $regex: keyword,
          $options: "i",
        },
      },
      {
        "mainContent.unit": {
          $regex: keyword,
          $options: "i",
        },
      },
    ];
  }

  // =======================
  // 📌 CASE TYPE (list)
  // =======================

  if (caseTypes?.length) {
    itemMatch["mainContent.caseType"] = {
      $in: caseTypes,
    };
  }

  // =======================
  // 📌 PROGRESS (list)
  // =======================

  if (progressList?.length) {
    itemMatch["mainContent.progress"] = {
      $in: progressList,
    };
  }

  // =======================
  // 👤 OFFICERS (list)
  // =======================

  if (officerIds?.length) {
    itemMatch["mainContent.officers"] = {
      $in: officerIds.map((id) => new Types.ObjectId(id)),
    };
  }

  // =======================
  // 📅 DATE RANGE
  // =======================

  if (fromDate || toDate) {
    itemMatch["mainContent.workDate"] = {};

    if (fromDate) {
      itemMatch["mainContent.workDate"].$gte = fromDate;
    }

    if (toDate) {
      itemMatch["mainContent.workDate"].$lte = toDate;
    }
  }

  // =======================
  // 🖼 HAS IMAGES
  // =======================

  if (typeof hasImages === "boolean") {
    itemMatch["mainContent.hasImages"] = hasImages;
  }

  // =======================
  // APPLY MATCH
  // =======================

  if (Object.keys(itemMatch).length) {
    pipeline.push({ $match: itemMatch });
  }

  // =======================
  // SORT
  // =======================

  pipeline.push({
    $sort: {
      "mainContent.workDate": -1,
    },
  });

  // =======================
  // PROJECT (optional clean)
  // =======================

  pipeline.push({
    $project: {
      caseMonth: 1,
      caseYear: 1,
      caseCode: 1,
      mainContent: 1,
    },
  });

  return ProfessionalCase.aggregate(pipeline);
};

// =======================
// 🔹 9. Xuất excel
// =======================

export const exportProfessionalExcel = async (res: any) => {
  const cases = await ProfessionalCase.find().lean();

  const workbook = new ExcelJS.Workbook();

  for (const caseItem of cases) {
    const sheetName = `${caseItem.caseMonth}-${caseItem.caseYear}`;
    const sheet = workbook.addWorksheet(sheetName);

    // Header
    sheet.columns = [
      { header: "STT", key: "stt", width: 6 },
      { header: "Ngày làm", key: "workDate", width: 15 },
      { header: "Nội dung vụ việc", key: "content", width: 30 },
      { header: "Dấu vết", key: "traces", width: 25 },
      { header: "Cán bộ thực hiện", key: "officers", width: 25 },
      { header: "Ghi chú", key: "note", width: 25 },
      { header: "Loại vụ việc", key: "caseType", width: 15 },
      { header: "Đơn vị thụ lý", key: "unit", width: 20 },
      { header: "Tiến độ", key: "progress", width: 25 },
      { header: "Số ảnh", key: "imageCount", width: 10 },
      { header: "Có ảnh", key: "hasImages", width: 10 },
    ];

    caseItem.mainContent.forEach((item: any, index: number) => {
      sheet.addRow({
        stt: index + 1,
        workDate: item.workDate?.toISOString().split("T")[0],
        content: item.content,
        traces: item.traces,
        officers: item.officers?.join(", "),
        note: item.note,
        caseType: item.caseType,
        unit: item.unit,
        progress: item.progress,
        imageCount: item.imageCount || 0,
        hasImages: item.hasImages ? "Có" : "Không",
      });
    });
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=professional.xlsx",
  );

  await workbook.xlsx.write(res);
  res.end();
};
