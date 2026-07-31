import express from 'express';
import { bankWebhookService } from '../services/bankWebhookService.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

const cskhOrAdminAuth = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'cskh')) return next();
  res.status(403).json({ message: 'Quyen CSKH hoac Admin duoc yeu cau.' });
};

// POST /api/webhooks/bank-transfer — nhan webhook bat dong bo tu ngan hang
router.post('/api/webhooks/bank-transfer', async (req, res) => {
  try {
    const secret = req.headers['x-webhook-secret'] || req.body.webhook_secret;
    const expected = process.env.WEBHOOK_SECRET || 'vivucar-demo-secret-2024';
    if (secret !== expected) {
      console.warn('[BankWebhook] Invalid secret from', req.ip);
      return res.status(401).json({ message: 'Webhook secret khong hop le.' });
    }
    const { transaction_id, amount, transfer_content, account_number, bank_name } = req.body;
    if (!transaction_id) return res.status(400).json({ message: 'transaction_id la bat buoc.' });
    if (!amount || isNaN(Number(amount))) return res.status(400).json({ message: 'amount phai la so hop le.' });
    res.status(200).json({ received: true, transaction_id });
    setImmediate(async () => {
      try {
        const result = await bankWebhookService.processWebhook({ transaction_id, amount: Number(amount), transfer_content: transfer_content || '', account_number: account_number || '', bank_name: bank_name || '' });
        console.log('[BankWebhook]', result.matched ? 'Matched: ' + result.type : result.duplicate ? 'Duplicate' : 'Unmatched: ' + result.reason);
      } catch(e) { console.error('[BankWebhook] async error:', e.message); }
    });
  } catch(e) {
    console.error('[BankWebhook] route error:', e);
    res.status(500).json({ message: 'Loi xu ly webhook.' });
  }
});

// POST /api/webhooks/bank-transfer/sync — demo simulator, dong bo, cho phep tat ca user dang nhap (Khach thue, CSKH, Admin)
router.post('/api/webhooks/bank-transfer/sync', auth, async (req, res) => {
  try {
    const { transaction_id, amount, transfer_content, account_number, bank_name } = req.body;
    if (!transaction_id) return res.status(400).json({ message: 'transaction_id la bat buoc.' });
    if (!amount || isNaN(Number(amount))) return res.status(400).json({ message: 'amount phai la so hop le.' });
    const result = await bankWebhookService.processWebhook({ transaction_id, amount: Number(amount), transfer_content: transfer_content || '', account_number: account_number || '', bank_name: bank_name || '' });
    if (result.matched) {
      return res.json({ success: true, matched: true, type: result.type, message: result.type === 'group' ? 'Da xac nhan coc Gio Hang #' + result.result.groupId + ' (' + (result.result.confirmedBookingIds ? result.result.confirmedBookingIds.length : 0) + ' don con).' : 'Da xac nhan coc Don dat xe #' + result.result.bookingId + '.', detail: result.result });
    }
    if (result.duplicate) return res.status(409).json({ success: false, matched: false, duplicate: true, message: result.reason });
    return res.status(422).json({ success: false, matched: false, message: result.reason || 'Khong tim thay don dat xe phu hop.' });
  } catch(e) {
    console.error('[BankWebhook Sync] error:', e);
    res.status(500).json({ message: 'Loi xu ly webhook dong bo.' });
  }
});

// GET /api/webhooks/bank-transactions — lich su giao dich (CSKH/Admin)
router.get('/api/webhooks/bank-transactions', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const transactions = await bankWebhookService.getTransactions(limit);
    res.json(transactions);
  } catch(e) {
    console.error('[BankWebhook] getTransactions error:', e);
    res.status(500).json({ message: 'Loi lay lich su giao dich.' });
  }
});

export default router;
