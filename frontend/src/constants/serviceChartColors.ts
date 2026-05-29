/** Màu slice — pie chart “Cơ cấu theo loại hình” only */
export const PIE_SERVICE_COLORS = {
  takeaway: '#61CB40',
  fourHours: '#3CB018',
  fullDay: '#256E05',
} as const;

export const PIE_SERVICE_TYPE_COLORS: Record<string, string> = {
  TAKEAWAY: PIE_SERVICE_COLORS.takeaway,
  PACKAGE_4H: PIE_SERVICE_COLORS.fourHours,
  FOUR_HOURS: PIE_SERVICE_COLORS.fourHours,
  FULLTIME: PIE_SERVICE_COLORS.fullDay,
  FULL_DAY: PIE_SERVICE_COLORS.fullDay,
};

/** Màu slice — pie chart “Cơ cấu theo phương thức thanh toán” */
export const PIE_PAYMENT_COLORS = {
  cash: '#5FC63E',
  transfer: '#256E05',
} as const;
