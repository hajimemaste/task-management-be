import { Request, Response } from "express";
import * as autopsyService from "../services/autopsyCase.service";
import { ApiError } from "../utils/ApiError";

// =======================
// 🔹 1. Lấy hồ sơ theo ID
// =======================

export const getCaseById = async (req: Request, res: Response) => {
  const rawId = req.params.id;

  if (!rawId || Array.isArray(rawId)) {
    throw new ApiError(400, "id không hợp lệ");
  }

  const data = await autopsyService.getCaseById(rawId);

  res.json({
    success: true,
    data,
  });
};

// =======================
// 🔹 2. Lấy toàn bộ hồ sơ
// =======================

export const getAllCases = async (req: Request, res: Response) => {
  const data = await autopsyService.getAllCases();

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

  const data = await autopsyService.createCase({
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
  const { executionDate, ...rest } = req.body;

  const userId = req.user!.id.toString();

  const data = await autopsyService.addCaseItem({
    executionDate: new Date(executionDate),
    data: rest,
    userId,
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

  const userId = req.user!.id.toString();

  const data = await autopsyService.updateCaseItem({
    itemId: rawItemId,
    data: req.body,
    userId,
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

  const userId = req.user!.id.toString();

  const data = await autopsyService.deleteCaseItem({
    itemId: rawItemId,
    userId,
  });

  res.json({
    success: true,
    data,
  });
};

// =======================
// 🔹 7. Filter (admin)
// =======================

export const filterCaseItems = async (req: Request, res: Response) => {
  const {
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
  } = req.query;

  const data = await autopsyService.filterCaseItems({
    month: month ? Number(month) : undefined,
    year: year ? Number(year) : undefined,
    keyword: keyword as string,

    officerIds: officerIds ? (officerIds as string).split(",") : undefined,

    form: form ? (form as string).split(",") : undefined,
    timeCategory: timeCategory
      ? (timeCategory as string).split(",")
      : undefined,

    hasAssignment:
      hasAssignment !== undefined ? hasAssignment === "true" : undefined,

    paymentStatus: paymentStatus
      ? (paymentStatus as string).split(",")
      : undefined,

    fromDate: fromDate ? new Date(fromDate as string) : undefined,
    toDate: toDate ? new Date(toDate as string) : undefined,
  });

  res.json({
    success: true,
    data,
  });
};

// =======================
// 🔹 8. Filter
// =======================
export const exportAutopsy = async (req: Request, res: Response) => {
  await autopsyService.exportAutopsyExcel(res);
};
