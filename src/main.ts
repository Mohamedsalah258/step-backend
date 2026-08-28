import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/all-exceptions.filter'
import { ResponseInterceptor } from './common/response.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // مسموح للفرونت (Vite dev server) يكلم الباك اند من أي origin وقت التطوير.
  // ضيّق الـ origin لدومين الإنتاج الحقيقي قبل ما تنشر.
  app.enableCors({ origin: true, credentials: true })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  // العقد الموحّد: كل رد ناجح { success, data, message }، كل رد فاشل
  // { success:false, error:{code,message,fields?} } — شوف common/response.interceptor.ts
  // وcommon/all-exceptions.filter.ts. مبيأثرش على endpoints بتستخدم @Res() مباشر
  // (export.csv, uploads download).
  app.useGlobalInterceptors(new ResponseInterceptor())
  app.useGlobalFilters(new AllExceptionsFilter())

  const config = new DocumentBuilder()
    .setTitle('STEP API')
    .setDescription(
      'الـ API الحقيقي بتاع لوحة تحكم STEP — مصدر الحقيقة الوحيد لعقد البيانات بين الباك اند والفرونت (ويب + موبايل لاحقًا).',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api-docs', app, document)

  const port = process.env.PORT ?? 3000
  await app.listen(port)
  // eslint-disable-next-line no-console
  console.log(`STEP API running on http://localhost:${port}`)
  // eslint-disable-next-line no-console
  console.log(`Swagger docs on http://localhost:${port}/api-docs`)
}
bootstrap()
