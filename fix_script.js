const fs = require('fs');
let content = fs.readFileSync('client/src/components/BookingModal.jsx', 'utf8');

content = content.replace(
  '  const totalPrice = basePrice + insurancePrice + serviceFee + deliveryFee;\n  // Determine display',
  '  const totalPrice = basePrice + insurancePrice + serviceFee + deliveryFee;\n  const reservationFee = Math.round(totalPrice * 0.3);\n  const remainingPayment = totalPrice - reservationFee;\n  // Determine display'
);

content = content.replace(
  '- Phí giữ chỗ thanh toán ngay: 500.000đ (Đã thanh toán trực tuyến)\n- Tiền cọc đảm bảo trách nhiệm xe: 5.000.000đ\n- Số tiền còn lại Bên B phải trả khi nhận xe: ${formatCurrency(totalPayment - 500000)} (bao gồm tiền thuê xe và cọc đảm bảo, đã khấu trừ 500.000đ phí giữ chỗ)',
  '- Phí giữ chỗ thanh toán ngay: ${formatCurrency(reservationFee)} (Đã thanh toán trực tuyến)\n- Số tiền còn lại Bên B phải trả khi nhận xe: ${formatCurrency(remainingPayment)} (Đã khấu trừ ${formatCurrency(reservationFee)} phí giữ chỗ)'
);

content = content.replace(
  /if \(paymentChoice === 'wallet' && walletBalance < 500000\)/,
  "if (paymentChoice === 'wallet' && walletBalance < reservationFee)"
);

content = content.replace(
  /showToast\(`Số dư ví không đủ\. Cần tối thiểu \$\{formatCurrency\(500000\)\} để thanh toán phí giữ chỗ\.\`, 'warning'\);/,
  "showToast(`Số dư ví không đủ. Cần tối thiểu ${formatCurrency(reservationFee)} để thanh toán phí giữ chỗ.`, 'warning');"
);

content = content.replace(
  /if \(paymentChoice === 'wallet'\) \{\n\s*const newBalance = walletBalance - 500000;/g,
  "if (paymentChoice === 'wallet') {\n        const newBalance = walletBalance - reservationFee;"
);

content = content.replace(
  /if \(paymentChoice === 'wallet'\) \{\n\s*const newBalance = walletBalance - totalPayment;/g,
  "if (paymentChoice === 'wallet') {\n        const newBalance = walletBalance - reservationFee;"
);

content = content.replace(
  /  const formatCurrency = \(amount\) => \{\n    return new Intl\.NumberFormat\('vi-VN', \{ style: 'currency', currency: 'VND' \}\)\.format\(amount\);\n  \};\n\n  const reservationFee = 500000;\n  const remainingDeposit = securityDeposit - reservationFee;\n  const remainingPayment = totalPrice \+ remainingDeposit;/,
  "  const formatCurrency = (amount) => {\n    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);\n  };"
);

// Fallback in case my previous replace to Math.round is still there
content = content.replace(
  /  const formatCurrency = \(amount\) => \{\n    return new Intl\.NumberFormat\('vi-VN', \{ style: 'currency', currency: 'VND' \}\)\.format\(amount\);\n  \};\n\n  const reservationFee = Math\.round\(totalPrice \* 0\.3\);\n  const remainingPayment = totalPrice - reservationFee;/,
  "  const formatCurrency = (amount) => {\n    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);\n  };"
);

content = content.replace(
  /\{formatCurrency\(500000\)\}\n\s*<\/div>\n\s*<div style=\{\{ fontSize: '11px', marginTop: '4px', opacity: 0\.8 \}\}>\n\s*Khấu trừ khi thanh toán nhận xe\. Phần còn lại \{formatCurrency\(totalPayment - 500000\)\} và cọc sẽ thanh toán lúc nhận xe\./g,
  "{formatCurrency(reservationFee)}\n                </div>\n                <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>\n                  Khấu trừ khi thanh toán nhận xe. Phần còn lại {formatCurrency(remainingPayment)} sẽ thanh toán lúc nhận xe."
);

content = content.replace(/walletBalance >= 500000/g, "walletBalance >= reservationFee");
content = content.replace(/walletBalance < 500000/g, "walletBalance < reservationFee");
content = content.replace(/500000 - walletBalance/g, "reservationFee - walletBalance");
content = content.replace(/walletBalance - 500000/g, "walletBalance - reservationFee");

content = content.replace(
  /<strong style=\{\{ color: '#6366f1' \}\}>\{formatCurrency\(500000\)\}<\/strong>/g,
  "<strong style={{ color: '#6366f1' }}>{formatCurrency(reservationFee)}</strong>"
);

content = content.replace(
  /<strong>\{formatCurrency\(totalPayment\)\}<\/strong>/g,
  "<strong>{formatCurrency(totalPrice)}</strong>"
);

content = content.replace(
  /<span>-\{formatCurrency\(500000\)\}<\/span>/g,
  "<span>-{formatCurrency(reservationFee)}</span>"
);

content = content.replace(
  /<span style=\{\{ color: '#e11d48' \}\}>\{formatCurrency\(totalPayment - 500000\)\}<\/span>/g,
  "<span style={{ color: '#e11d48' }}>{formatCurrency(remainingPayment)}</span>"
);

content = content.replace(
  /số tiền còn lại \{formatCurrency\(totalPayment - 500000\)\} kèm cọc/g,
  "số tiền còn lại {formatCurrency(remainingPayment)}"
);

content = content.replace(
  /Tổng thanh toán QR:<\/span>\n\s*<strong style=\{\{ color: '#0f172a' \}\}>\{formatCurrency\(500000\)\}<\/strong>/g,
  "Tổng thanh toán QR:</span>\n                        <strong style={{ color: '#0f172a' }}>{formatCurrency(reservationFee)}</strong>"
);

fs.writeFileSync('client/src/components/BookingModal.jsx', content);
console.log('Replacements completed successfully.');
