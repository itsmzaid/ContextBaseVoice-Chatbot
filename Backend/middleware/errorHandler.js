import { ApiError } from "../util/ApiError.js";

export const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: err.success,
      message: err.message,
      data: err.data,
      errors: err.errors,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    data: [],
    errors: [err.message],
  });
};
