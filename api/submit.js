const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RECIPIENT = 'tomoaki19772002@gmail.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const botcheck = typeof body.botcheck === 'string' ? body.botcheck.trim() : '';

  if (botcheck) {
    // ボットのハニーポット入力。成功したふりをして無視する
    res.status(200).json({ success: true });
    return;
  }

  if (!message) {
    res.status(400).json({ success: false, error: 'ご意見箱の内容をご入力ください' });
    return;
  }

  if (email && !EMAIL_PATTERN.test(email)) {
    res.status(400).json({ success: false, error: 'メールアドレスの形式が正しくありません' });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    res.status(500).json({ success: false, error: '送信設定が未完了です（RESEND_API_KEY 未設定）' });
    return;
  }

  const displayName = name || '匿名';
  const textBody = [
    `お名前: ${displayName}`,
    `メールアドレス: ${email || '(未記入)'}`,
    '',
    'ご意見箱の内容:',
    message
  ].join('\n');

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: '川越あさひ眼科 ご意見箱 <onboarding@resend.dev>',
        to: [RECIPIENT],
        reply_to: email || undefined,
        subject: '【川越あさひ眼科】ご意見箱への投稿',
        text: textBody
      })
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend API error:', resendRes.status, errText);
      res.status(502).json({ success: false, error: 'メール送信に失敗しました' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Send error:', err);
    res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
};
