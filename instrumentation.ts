/**
 * Next.js Instrumentation API
 * Запускается один раз при старте сервера (как в dev, так и в production)
 * Используется для инициализации и проверок при старте
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Dev-time проверка AUTH_PASS_* переменных
  if (process.env.NODE_ENV !== "production") {
    const { checkAuthPassVars } = await import("@/lib/devEnvCheck");
    checkAuthPassVars();
  }

  // Production: можно добавить другие инициализации (APM, логирование и т.д.)
  // if (process.env.NODE_ENV === "production") {
  //   // Например, инициализация monitoring
  // }
}
