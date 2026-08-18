const router = require('express').Router();
const { supabaseAdmin, requireAdmin } = require('../middleware/auth');

// GET /api/products - عام، أي زائر يقدر يشوف المنتجات
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ error: 'تعذر تحميل المنتجات' });
  res.json(data);
});

// POST /api/products - أدمن بس
router.post('/', requireAdmin, async (req, res) => {
  const { name, description, price, category, color, image_url } = req.body;

  if (!name || typeof name !== 'string' || !price || Number(price) <= 0 || !category) {
    return res.status(400).json({ error: 'اسم المنتج والسعر والقسم مطلوبين' });
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({
      name: name.trim(),
      description: (description || '').trim(),
      price: Number(price),
      category,
      color: color || '#B08D3E',
      image_url: (image_url || '').trim(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'تعذر إضافة المنتج' });
  res.status(201).json(data);
});

// PUT /api/products/:id - أدمن بس
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, description, price, category, color, image_url } = req.body;

  if (!name || !price || Number(price) <= 0 || !category) {
    return res.status(400).json({ error: 'اسم المنتج والسعر والقسم مطلوبين' });
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .update({
      name: name.trim(),
      description: (description || '').trim(),
      price: Number(price),
      category,
      color,
      image_url: (image_url || '').trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'تعذر تعديل المنتج' });
  res.json(data);
});

// DELETE /api/products/:id - أدمن بس
router.delete('/:id', requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: 'تعذر حذف المنتج' });
  res.json({ success: true });
});

module.exports = router;
