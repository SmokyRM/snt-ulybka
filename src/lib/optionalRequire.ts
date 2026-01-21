/**
 * Динамический optional require для модулей, которые могут быть не установлены
 * Используется для избежания статического резолвинга модулей в Turbopack/Webpack
 * 
 * @param moduleParts - части имени модуля (например, ["@sentry", "nextjs"])
 * @returns модуль или null, если модуль не установлен
 */
export function optionalRequire<T = unknown>(moduleParts: string[]): T | null {
  try {
    // Собираем имя модуля динамически, чтобы избежать статического резолвинга
    const moduleName = moduleParts.join("/");
    // Используем Function constructor для полной динамики
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const requireFn = new Function('moduleName', 'return require(moduleName)');
    return requireFn(moduleName) as T;
  } catch {
    // Модуль не установлен - это нормально
    return null;
  }
}
