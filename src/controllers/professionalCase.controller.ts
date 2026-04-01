import { Request, Response } from "express";
import * as caseService from "../services/professionalCase.service";
import { ApiError } from "../utils/ApiError";

// =======================
// 🔹 1. Lấy hồ sơ theo ID
// =======================

export const getCaseById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const data = await caseService.getCaseById(id.toString());

  res.json({
    success: true,
    data,
  });
};

// =======================
// 🔹 2. Lấy toàn bộ hồ sơ
// =======================

export const getAllCases = async (req: Request, res: Response) => {
  const data = await caseService.getAllCases();

  res.json({
    success: true,
    data,
  });
};

// =======================
// 🔹 3. Tạo hồ sơ
// =======================

export const createCase = async (req: Request, res: Response) => {
  const { caseMonth, caseYear } = req.body;

  const data = await caseService.createCase({
    caseMonth,
    caseYear,
  });

  res.json({
    success: true,
    data,
  });
};

// =======================
// 🔹 4. Thêm dòng
// =======================

export const addCaseItem = async (req: Request, res: Response) => {
  const { workDate, ...rest } = req.body;

  const userId = req.user!.id.toString();

  const data = await caseService.addCaseItem({
    workDate: new Date(workDate),
    data: rest,
    userId: userId.toString(),
  });

  res.json({
    success: true,
    data,
  });
};

// =======================
// 🔹 5. Update dòng
// =======================

export const updateCaseItem = async (req: Request, res: Response) => {
  const rawItemId = req.params.itemId;

  if (!rawItemId || Array.isArray(rawItemId)) {
    throw new ApiError(400, "itemId không hợp lệ");
  }

  const userId = req.user!.id;

  const data = await caseService.updateCaseItem({
    itemId: rawItemId,
    data: req.body,
    userId: userId.toString(),
  });

  res.json({
    success: true,
    data,
  });
};

// =======================
// 🔹 6. Xoá dòng
// =======================

export const deleteCaseItem = async (req: Request, res: Response) => {
  const rawItemId = req.params.itemId;

  if (!rawItemId || Array.isArray(rawItemId)) {
    throw new ApiError(400, "itemId không hợp lệ");
  }

  const userId = req.user!.id;

  const data = await caseService.deleteCaseItem({
    itemId: rawItemId,
    userId: userId.toString(),
  });

  res.json({
    success: true,
    data,
  });
};

// =======================
// 🔹 7. Filter
// =======================

export const filterCaseItems = async (req: Request, res: Response) => {
  const {
    month,
    year,
    keyword,
    caseTypes,
    progressList,
    officerIds,
    fromDate,
    toDate,
    hasImages,
  } = req.query;

  const data = await caseService.filterCaseItems({
    month: month ? Number(month) : undefined,
    year: year ? Number(year) : undefined,
    keyword: keyword as string,

    caseTypes: caseTypes ? (caseTypes as string).split(",") : undefined,

    progressList: progressList
      ? (progressList as string).split(",")
      : undefined,

    officerIds: officerIds ? (officerIds as string).split(",") : undefined,

    fromDate: fromDate ? new Date(fromDate as string) : undefined,
    toDate: toDate ? new Date(toDate as string) : undefined,

    hasImages: hasImages !== undefined ? hasImages === "true" : undefined,
  });

  res.json({
    success: true,
    data,
  });
};

// =======================
// 🔹 8. Filter
// =======================
export const exportProfessionalExcel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Thiếu id" });
    }

    await caseService.exportProfessionalExcel(id.toString(), res);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      message: error.message || "Export thất bại",
    });
  }
};
