const { createClient } = require('@supabase/supabase-js');

// عميل Supabase بمفتاح service_role - يشتغل في السيرفر بس، وليه صلاحية كاملة
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ميدل وير: يتأكد إن اللي بيبعت الطلب مسجل دخول فعلاً وهو أدمن معتمد
async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'لازم تسجّلي دخول الأول' });
  }

  // نتأكد إن الـ token ده صادر فعلاً من Supabase Auth ومش منتهي
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'الجلسة انتهت، سجّلي دخول تاني' });
  }

  // نتأكد إن اليوزر ده موجود في جدول admins (يعني معتمد كأدمن فعلاً)
  const { data: adminRow, error: adminErr } = await supabaseAdmin
    .from('admins')
    .select('user_id')
    .eq('user_id', data.user.id)
    .single();

  if (adminErr || !adminRow) {
    return res.status(403).json({ error: 'الحساب ده مش أدمن معتمد' });
  }

  req.user = data.user;
  next();
}

module.exports = { supabaseAdmin, requireAdmin };
