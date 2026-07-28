/**
 * formatCurrency
 * Định dạng một số thành chuỗi tiền tệ VND.
 * @param {number} amount - Số tiền cần định dạng.
 * @returns {string} - Chuỗi đã định dạng (ví dụ: "2.500.000 ₫").
 */
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};