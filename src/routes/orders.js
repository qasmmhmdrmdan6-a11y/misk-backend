const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { supabaseAdmin, requireAdmin } = require('../middleware/auth');

// حماية من تكرار الطلبات الوهمية: أقصى 10 طلبات كل 15 دقيقة من نفس الـ IP
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات كتير قوي، استني شوية وحاولي تاني' },
});

// POST /api/orders - عام (خطوة إتمام الشراء)
router.post('/', orderLimiter, async (req, res) => {
  const { name, phone, governorate, address, payMethod, items, total, senderPhone, receiptUrl } = req.body;

  if (
    !name || typeof name !== 'string' ||
    !phone || typeof phone !== 'string' ||
    !address || typeof address !== 'string' ||
    !Array.isArray(items) || items.length === 0 ||
    !total || Number(total) <= 0 ||
    !['vf', 'cod'].includes(payMethod)
  ) {
    return res.status(400).json({ error: 'بيانات الطلب ناقصة أو غير صحيحة' });
  }

  const ref = 'MSK-' + Math.floor(1000 + Math.random() * 9000);

  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert({
      ref,
      customer_name: name.trim(),
      phone: phone.trim(),
      governorate: governorate || '',
      address: address.trim(),
      pay_method: payMethod,
      items,
      total: Number(total),
      fulfilled: false,
      payment_status: 'pending',
      sender_phone: payMethod === 'vf' ? (senderPhone || '').trim() : null,
      receipt_url: payMethod === 'vf' ? (receiptUrl || '') : null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'تعذر إرسال الطلب، حاولي تاني' });
  res.status(201).json({ ref: data.ref });
});

// GET /api/orders - أدمن بس
router.get('/', requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'تعذر تحميل الطلبات' });
  res.json(data);
});

// PATCH /api/orders/:ref/fulfill - أدمن بس - تبديل حالة الشحن
router.patch('/:ref/fulfill', requireAdmin, async (req, res) => {
  const { data: current, error: findErr } = await supabaseAdmin
    .from('orders')
    .select('fulfilled')
    .eq('ref', req.params.ref)
    .single();

  if (findErr || !current) return res.status(404).json({ error: 'الطلب مش موجود' });

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ fulfilled: !current.fulfilled })
    .eq('ref', req.params.ref)
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'تعذر تحديث حالة الطلب' });
  res.json(data);
});

// PATCH /api/orders/:ref/mark-paid - أدمن بس - تبديل حالة الدفع (بعد مراجعة إيصال التحويل)
router.patch('/:ref/mark-paid', requireAdmin, async (req, res) => {
  const { data: current, error: findErr } = await supabaseAdmin
    .from('orders')
    .select('payment_status')
    .eq('ref', req.params.ref)
    .single();

  if (findErr || !current) return res.status(404).json({ error: 'الطلب مش موجود' });

  const newStatus = current.payment_status === 'paid' ? 'pending' : 'paid';
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ payment_status: newStatus })
    .eq('ref', req.params.ref)
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'تعذر تحديث حالة الدفع' });
  res.json(data);
});

module.exports = router;
