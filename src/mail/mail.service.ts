import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

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
    const html = `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; text-align: right;">
        <p>أهلاً ${name}،</p>
        <p>رمز التحقق بتاعك هو:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        <p>الرمز صالح لمدة ١٠ دقايق. لو محدش طلب ده منك، تجاهل الرسالة دي.</p>
      </div>
    `

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
    const html = `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; text-align: right;">
        <p><strong>اسم المرسل:</strong> ${name ?? '(مش مكتوب)'}</p>
        <p><strong>الإيميل:</strong> ${emailForReply}</p>
        <p><strong>الرسالة:</strong></p>
        <p style="white-space: pre-wrap;">${message}</p>
      </div>
    `

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
    const html = `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; text-align: right;">
        <p>أهلاً ${name ?? ''}،</p>
        <p style="white-space: pre-wrap;">${replyMessage}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
        <p style="color: #888; font-size: 13px;">رسالتك الأصلية:</p>
        <p style="white-space: pre-wrap; color: #888; font-size: 13px;">${originalMessage}</p>
      </div>
    `

    if (!this.transporter) {
      this.logger.warn(`[DEV FALLBACK — مفيش SMTP حقيقي] رد على ${emailForReply}: ${replyMessage}`)
      return
    }

    await this.transporter.sendMail({ from: this.fromAddress, to: emailForReply, subject, text, html })
  }
}
