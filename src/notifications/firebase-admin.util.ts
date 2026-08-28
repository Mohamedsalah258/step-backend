import { cert, initializeApp, type App } from 'firebase-admin/app'
import { getMessaging, type Messaging } from 'firebase-admin/messaging'

/**
 * تهيئة Firebase Admin مرة واحدة بس (singleton). لو الـ env vars ناقصة
 * (مفيش مشروع Firebase لسه)، بترجع null بأمان — الـ push بيتجاهل والـ
 * in-app notifications بتفضل شغالة عادي.
 */
let app: App | null = null
let attempted = false

function initFirebase(): App | null {
  if (attempted) return app
  attempted = true

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKeyRaw) {
    // eslint-disable-next-line no-console
    console.log(
      '[Notifications] متغيرات Firebase مش موجودة في .env — الإشعارات هتتسجل in-app بس من غير push حقيقي.',
    )
    return null
  }

  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // .env بيخزن الأسطر الجديدة كـ \n هاربة حرفيًا — لازم فكها قبل التهيئة
      privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
    }),
  })
  return app
}

export function getFirebaseMessaging(): Messaging | null {
  const firebaseApp = initFirebase()
  return firebaseApp ? getMessaging(firebaseApp) : null
}
