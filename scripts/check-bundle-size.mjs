#!/usr/bin/env node

/**
 * Performance Budget Checker
 * Проверяет размер JS bundle для public страниц (/ и /login)
 * 
 * Использование: 
 *   node scripts/check-bundle-size.mjs
 *   BUNDLE_BUDGET_KB=300 node scripts/check-bundle-size.mjs
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, statSync } from "fs";
import { join } from "path";

const BUDGET_KB = parseInt(process.env.BUNDLE_BUDGET_KB || "350", 10);
const BUILD_DIR = join(process.cwd(), ".next");
const BUILD_MANIFEST = join(BUILD_DIR, "build-manifest.json");

// Страницы для проверки
const PUBLIC_PAGES = ["/", "/login"];

function getGzipSize(bytes) {
  // Приблизительный коэффициент сжатия gzip для JS: ~0.3
  return Math.round(bytes * 0.3);
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function parseBuildOutput(output) {
  const lines = output.split("\n");
  const pageSizes = {};
  
  for (const line of lines) {
    // Ищем строки вида: "○  /                   123 kB"
    // или: "●  /login                456 kB"
    // или: "λ  /login                456 kB"
    const match = line.match(/^[○●λ]\s+(\/[\w-]*)\s+(\d+(?:\.\d+)?)\s*(kB|KB|MB)/);
    if (match) {
      const route = match[1] || "/";
      const size = parseFloat(match[2]);
      const unit = match[3].toUpperCase();
      
      let bytes = size;
      if (unit === "MB") bytes = size * 1024 * 1024;
      else if (unit === "KB" || unit === "kB") bytes = size * 1024;
      
      pageSizes[route] = bytes;
    }
    
    // Также ищем "First Load JS shared by all" для общего размера
    const sharedMatch = line.match(/First Load JS shared by all\s+(\d+(?:\.\d+)?)\s*(kB|KB|MB)/);
    if (sharedMatch) {
      const size = parseFloat(sharedMatch[1]);
      const unit = sharedMatch[2].toUpperCase();
      let bytes = size;
      if (unit === "MB") bytes = size * 1024 * 1024;
      else if (unit === "KB" || unit === "kB") bytes = size * 1024;
      pageSizes["_shared"] = bytes;
    }
  }
  
  return pageSizes;
}

function getPageSizeFromManifest(page, manifest) {
  if (!manifest || !manifest.pages) return null;
  
  const pageKey = page === "/" ? "/index" : page;
  const pageFiles = manifest.pages[pageKey] || [];
  
  let totalSize = 0;
  for (const file of pageFiles) {
    if (file.endsWith(".js")) {
      const filePath = join(BUILD_DIR, "static", file);
      if (existsSync(filePath)) {
        const stats = statSync(filePath);
        totalSize += stats.size;
      }
    }
  }
  
  return totalSize;
}

function main() {
  console.log("🔍 Проверка размера bundle для public страниц...\n");
  
  // Проверяем, что build выполнен
  if (!existsSync(BUILD_DIR)) {
    console.error("❌ Ошибка: .next директория не найдена. Запустите 'npm run build' сначала.");
    process.exit(1);
  }
  
  // Пытаемся получить размеры из build output
  let pageSizes = {};
  try {
    // Запускаем build для получения актуальных размеров
    console.log("📦 Запуск build для получения размеров bundle...");
    const buildOutput = execSync("npm run build 2>&1", { encoding: "utf-8", stdio: "pipe" });
    pageSizes = parseBuildOutput(buildOutput);
  } catch (error) {
    // Build может завершиться с ошибкой, но output все равно есть
    const buildOutput = error.stdout || error.message || "";
    pageSizes = parseBuildOutput(buildOutput);
    
    if (Object.keys(pageSizes).length === 0) {
      console.warn("⚠️  Не удалось получить размеры из build output, пробуем через manifest...");
    }
  }
  
  // Если не получилось через output, пробуем через manifest
  if (Object.keys(pageSizes).length === 0 && existsSync(BUILD_MANIFEST)) {
    try {
      const manifest = JSON.parse(readFileSync(BUILD_MANIFEST, "utf-8"));
      for (const page of PUBLIC_PAGES) {
        const size = getPageSizeFromManifest(page, manifest);
        if (size) {
          pageSizes[page] = size;
        }
      }
    } catch (error) {
      console.warn("⚠️  Не удалось прочитать build-manifest.json");
    }
  }
  
  if (Object.keys(pageSizes).length === 0) {
    console.error("❌ Ошибка: Не удалось определить размеры bundle.");
    console.error("   Убедитесь, что 'npm run build' выполнен успешно.");
    process.exit(1);
  }
  
  // Проверяем размеры для каждой страницы
  let hasError = false;
  const results = [];
  
  console.log("📊 Результаты проверки:\n");
  
  for (const page of PUBLIC_PAGES) {
    const rawSize = pageSizes[page] || 0;
    if (rawSize === 0) {
      console.warn(`⚠️  ${page.padEnd(20)} Размер не найден`);
      continue;
    }
    
    const gzipSize = getGzipSize(rawSize);
    const gzipSizeKB = gzipSize / 1024;
    
    const isOverBudget = gzipSizeKB > BUDGET_KB;
    if (isOverBudget) hasError = true;
    
    const status = isOverBudget ? "❌" : "✅";
    results.push({
      page,
      rawSize,
      gzipSize,
      gzipSizeKB,
      isOverBudget,
      status,
    });
    
    console.log(
      `${status} ${page.padEnd(20)} ${formatBytes(gzipSize).padEnd(10)} (gzip) / ${formatBytes(rawSize)} (raw) ${isOverBudget ? `⚠️  Превышен лимит ${BUDGET_KB} KB` : ""}`
    );
  }
  
  // Показываем общий shared размер если есть
  if (pageSizes["_shared"]) {
    const sharedGzip = getGzipSize(pageSizes["_shared"]);
    console.log(`\n📦 Shared JS: ${formatBytes(sharedGzip)} (gzip) / ${formatBytes(pageSizes["_shared"])} (raw)`);
  }
  
  console.log(`\n📊 Лимит: ${BUDGET_KB} KB (gzip)`);
  
  if (hasError) {
    console.error("\n❌ Ошибка: Размер bundle превышает лимит!");
    console.error("   Оптимизируйте bundle или увеличьте лимит через BUNDLE_BUDGET_KB env переменную.");
    console.error("   Пример: BUNDLE_BUDGET_KB=400 npm run perf:budget");
    process.exit(1);
  }
  
  console.log("\n✅ Все страницы в пределах лимита!");
}

main();
