import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

/** أي نص جاي من مستخدم (اسم/رسالة) بيتحط جوه الـ HTML من غير escaping ممكن
 * يكسر تصميم الإيميل أو يحقن تاجات — endpoint زي contact-support عام
 * ومن غير تسجيل دخول، فالنص ده مش موثوق فيه. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * إرسال إيميلات حقيقية عبر SMTP. لو إعدادات SMTP (MAIL_HOST/MAIL_USER/...)
 * مش موجودة في .env — بيقع تلقائيًا على "وضع تطوير": بيطبع الكود في اللوج
 * بدل ما يبعت إيميل حقيقي، عشان تقدر تكمل شغل/اختبار وانت مستني بيانات
 * SMTP الحقيقية. أول ما تتحط، الإرسال الحقيقي بيشتغل من غير أي تغيير تاني.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly transporter: nodemailer.Transporter | null
  private readonly fromAddress: string

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST')
    const port = this.configService.get<string>('MAIL_PORT')
    const user = this.configService.get<string>('MAIL_USER')
    const pass = this.configService.get<string>('MAIL_PASS')
    this.fromAddress = this.configService.get<string>('MAIL_FROM') ?? 'STEP <no-reply@step-edu.com>'

    if (!host || !user || !pass) {
      this.logger.warn(
        'إعدادات SMTP غير مكتملة في .env — الإيميلات هتتطبع في اللوج بدل ما تتبعت فعليًا.',
      )
      this.transporter = null
      return
    }

    const portNumber = port ? Number(port) : 587
    this.transporter = nodemailer.createTransport({
      host,
      port: portNumber,
      // بورت 465 = TLS مباشر (implicit). أي بورت تاني (587 عادةً) بيستخدم STARTTLS تلقائي.
      secure: portNumber === 465,
      auth: { user, pass },
    })
  }

  async sendOtpEmail(to: string, name: string, otp: string): Promise<void> {
    const subject = 'رمز التحقق — STEP'
    const text = `أهلاً ${name}،\n\nرمز التحقق بتاعك هو: ${otp}\n\nالرمز صالح لمدة ١٠ دقايق. لو محدش طلب ده منك، تجاهل الرسالة دي.`
    const html = this.renderEmailShell(`
      <p style="margin:0 0 14px;font-size:14.5px;line-height:1.8;">أهلاً <strong>${escapeHtml(name)}</strong>،</p>
      <p style="margin:0 0 18px;font-size:14.5px;line-height:1.8;">رمز التحقق بتاعك هو:</p>
      <div style="text-align:center;margin:0 0 20px;">
        <span style="display:inline-block;background:#eaeeff;color:#2347e8;font-family:'Spline Sans Mono',ui-monospace,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:10px;padding:14px 26px;border-radius:10px;">${escapeHtml(otp)}</span>
      </div>
      <p style="margin:0;font-size:12.5px;color:#6b7280;line-height:1.8;text-align:center;">الرمز صالح لمدة ١٠ دقايق. لو محدش طلب ده منك، تجاهل الرسالة دي.</p>
    `)

    if (!this.transporter) {
      this.logger.warn(`[DEV FALLBACK — مفيش SMTP حقيقي] كود التحقق لـ ${to}: ${otp}`)
      return
    }

    await this.transporter.sendMail({ from: this.fromAddress, to, subject, text, html })
  }

  /**
   * إشعار لصندوق الدعم برسالة "تواصل مع الدعم" من زائر مش مسجّل دخول.
   * replyTo بتبقى إيميل الزائر نفسه — أي حد في فريق الدعم يفتح الإيميل ويدوس
   * "رد" بيتبعت لصاحب الرسالة على طول، من غير أي رابط في التطبيق.
   */
  async sendContactSupportNotification(name: string | null, emailForReply: string, message: string): Promise<void> {
    const subject = `تواصل مع الدعم — ${name ?? emailForReply}`
    const text = `اسم المرسل: ${name ?? '(مش مكتوب)'}\nالإيميل: ${emailForReply}\n\nالرسالة:\n${message}`
    const html = this.renderEmailShell(`
      <div style="display:inline-block;font-size:11px;font-weight:700;color:#2347e8;background:#eaeeff;padding:4px 10px;border-radius:999px;margin-bottom:14px;">رسالة تواصل جديدة</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;width:70px;">الاسم</td>
          <td style="padding:6px 0;font-size:13.5px;font-weight:700;color:#0e1116;">${escapeHtml(name ?? '(مش مكتوب)')}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">الإيميل</td>
          <td style="padding:6px 0;font-size:13.5px;font-weight:700;color:#0e1116;direction:ltr;text-align:right;">${escapeHtml(emailForReply)}</td>
        </tr>
      </table>
      <div style="padding:14px 16px;background:#f5f7fb;border-radius:8px;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:6px;">الرسالة</div>
        <div style="font-size:13.5px;color:#0e1116;line-height:1.8;white-space:pre-wrap;">${escapeHtml(message)}</div>
      </div>
    `)

    if (!this.transporter) {
      this.logger.warn(`[DEV FALLBACK — مفيش SMTP حقيقي] رسالة تواصل مع الدعم من ${emailForReply}: ${message}`)
      return
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: this.fromAddress,
      replyTo: emailForReply,
      subject,
      text,
      html,
    })
  }

  /** الرد الفعلي على رسالة تواصل مع الدعم — بيتبعت كإيميل حقيقي لصاحب
   * الرسالة، بديل عن فتح mailto: خارج التطبيق. */
  async sendContactSupportReply(
    emailForReply: string,
    name: string | null,
    originalMessage: string,
    replyMessage: string,
  ): Promise<void> {
    const subject = 'رد على رسالتك — STEP'
    const text = `أهلاً ${name ?? ''}،\n\n${replyMessage}\n\n---\nرسالتك الأصلية:\n${originalMessage}`
    const html = this.renderEmailShell(`
      <p style="margin:0 0 14px;font-size:14.5px;line-height:1.8;">أهلاً <strong>${escapeHtml(name ?? '')}</strong>،</p>
      <p style="margin:0 0 20px;font-size:14.5px;line-height:1.85;white-space:pre-wrap;">${escapeHtml(replyMessage)}</p>
      <div style="padding:14px 16px;background:#f5f7fb;border-radius:8px;border-right:3px solid #2347e8;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:6px;">رسالتك الأصلية</div>
        <div style="font-size:12.5px;color:#6b7280;line-height:1.8;white-space:pre-wrap;">${escapeHtml(originalMessage)}</div>
      </div>
    `)

    if (!this.transporter) {
      this.logger.warn(`[DEV FALLBACK — مفيش SMTP حقيقي] رد على ${emailForReply}: ${replyMessage}`)
      return
    }

    await this.transporter.sendMail({ from: this.fromAddress, to: emailForReply, subject, text, html })
  }

  /** إطار موحّد لكل إيميلات STEP — هوية بصرية بسيطة (شوف tailwind.config.js
   * لنفس الألوان) بدل HTML عاري. Table-based + inline styles عمدًا عشان
   * يبقى متوافق مع Outlook/Gmail/Apple Mail (مفيش دعم كافي لـ <style> tags
   * أو flexbox/grid في عملاء الإيميل). */
  private renderEmailShell(bodyHtml: string): string {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;">
        <tr><td align="center" style="padding:0;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e9f2;">
            <tr>
              <td style="background:#0b1f66;padding:22px 28px;text-align:center;">
                <span style="font-family:Tahoma,Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:3px;color:#ffffff;">STEP</span>
                <div style="font-family:Tahoma,Arial,sans-serif;font-size:11px;color:#aab4e0;margin-top:5px;letter-spacing:.3px;">لوحة التحكم الأكاديمية</div>
              </td>
            </tr>
            <tr>
              <td dir="rtl" style="padding:30px 28px;font-family:Tahoma,Arial,sans-serif;text-align:right;color:#0e1116;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 20px;border-top:1px solid #e5e9f2;">
                <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:11.5px;color:#9aa1af;line-height:1.9;text-align:center;">
                  الرسالة دي اتبعتت تلقائيًا من منصة STEP — من فضلك متردّش عليها.<br>
                  © 2026 STEP
                </div>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>`
  }
}
