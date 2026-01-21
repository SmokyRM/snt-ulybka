"use client";

import { useState, useEffect } from "react";

type DiagnosticsData = {
  currentUrl: string;
  nextTarget: string | null;
  hasSessionCookie: boolean;
  currentRole: string | null;
  lastLoginAttempt: {
    status: number | null;
    error: string | null;
    timestamp: number | null;
  } | null;
};

type StaffLoginDiagnosticsProps = {
  initialData: DiagnosticsData;
};

// Человекочитаемые сообщения об ошибках
const getErrorMessage = (error: string | null, status: number | null): string => {
  if (!error && !status) return "—";
  
  if (status === 401) {
    if (error === "invalid_credentials") {
      return "Неверный логин или пароль";
    }
    return "Ошибка аутентификации (401)";
  }
  
  if (status === 400) {
    if (error === "Неизвестная роль/логин") {
      return "Неизвестная роль или логин";
    }
    return "Некорректный запрос (400)";
  }
  
  if (status === 500) {
    return "Ошибка сервера (500)";
  }
  
  if (error) {
    // Безопасное отображение ошибки (не раскрываем секреты)
    const safeError = error.toLowerCase();
    if (safeError.includes("credentials") || safeError.includes("пароль") || safeError.includes("логин")) {
      return "Неверный логин или пароль";
    }
    if (safeError.includes("network") || safeError.includes("fetch")) {
      return "Ошибка сети";
    }
    return "Ошибка входа";
  }
  
  return status ? `HTTP ${status}` : "Неизвестная ошибка";
};

export default function StaffLoginDiagnostics({ initialData }: StaffLoginDiagnosticsProps) {
  // Sprint 4.4 fix: Используем ленивую инициализацию, чтобы избежать проблем с новым объектом на каждом рендере
  const [data, setData] = useState<DiagnosticsData>(() => initialData);
  const [isVisible, setIsVisible] = useState(false);

  // Sprint 4.4 fix: Синхронизация props->state зависит от примитивов, а не от объекта
  useEffect(() => {
    // Инициализация состояния из props - допустимо
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData((prev) => {
      // Проверяем, изменились ли примитивные значения
      const hasSessionChanged = prev.hasSessionCookie !== initialData.hasSessionCookie;
      const roleChanged = prev.currentRole !== initialData.currentRole;
      const lastAttemptChanged = 
        prev.lastLoginAttempt?.status !== initialData.lastLoginAttempt?.status ||
        prev.lastLoginAttempt?.error !== initialData.lastLoginAttempt?.error ||
        prev.lastLoginAttempt?.timestamp !== initialData.lastLoginAttempt?.timestamp;
      
      // Если ничего не изменилось, возвращаем предыдущее состояние
      if (!hasSessionChanged && !roleChanged && !lastAttemptChanged) {
        return prev;
      }
      
      // Обновляем только изменившиеся поля
      return {
        ...prev,
        hasSessionCookie: initialData.hasSessionCookie,
        currentRole: initialData.currentRole,
        lastLoginAttempt: initialData.lastLoginAttempt,
      };
    });
  }, [
    initialData.hasSessionCookie,
    initialData.currentRole,
    initialData.lastLoginAttempt?.status,
    initialData.lastLoginAttempt?.error,
    initialData.lastLoginAttempt?.timestamp,
  ]);

  // Sprint 4.4 fix: Эффект обновления URL с правильными зависимостями и cleanup
  useEffect(() => {
    const updateData = () => {
      const currentUrl = window.location.href;
      const nextTarget = new URLSearchParams(window.location.search).get("next");
      
      setData((prev) => {
        // Обновляем только если URL или nextTarget реально изменились
        if (prev.currentUrl === currentUrl && prev.nextTarget === nextTarget) {
          return prev;
        }
        
        return {
          ...prev,
          currentUrl,
          nextTarget,
        };
      });
    };
    
    // Обновляем при монтировании
    updateData();
    
    // Слушаем изменения истории браузера
    window.addEventListener("popstate", updateData);
    
    // Cleanup: удаляем слушатель при размонтировании
    return () => {
      window.removeEventListener("popstate", updateData);
    };
  }, []); // Пустой dependency array - эффект выполняется только при монтировании

  // Проверяем наличие cookie периодически
  useEffect(() => {
    const checkCookie = () => {
      const hasCookie = document.cookie.includes("snt_session=");
      setData((prev) => {
        // Обновляем только если значение изменилось
        if (prev.hasSessionCookie === hasCookie) {
          return prev;
        }
        
        return {
          ...prev,
          hasSessionCookie: hasCookie,
        };
      });
    };
    
    checkCookie();
    const interval = setInterval(checkCookie, 1000);
    
    // Cleanup: очищаем интервал при размонтировании
    return () => {
      clearInterval(interval);
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        type="button"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-zinc-600 px-3 py-1.5 text-xs font-medium text-white opacity-60 hover:opacity-100 transition-opacity"
        title="Показать диагностику входа"
      >
        🔍 Диагностика
      </button>
    );
  }

  const errorMessage = getErrorMessage(
    data.lastLoginAttempt?.error || null,
    data.lastLoginAttempt?.status || null
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-zinc-300 bg-white p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">🔍 Диагностика входа</h3>
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="text-zinc-400 hover:text-zinc-600"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-zinc-600">URL:</span>
          <span className="font-mono text-zinc-900 break-all text-right max-w-[60%]">
            {data.currentUrl}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-zinc-600">Next target:</span>
          <span className="font-mono text-zinc-900">
            {data.nextTarget || "—"}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-zinc-600">Session cookie:</span>
          <span className={data.hasSessionCookie ? "text-green-600 font-semibold" : "text-red-600"}>
            {data.hasSessionCookie ? "✓ Есть" : "✗ Нет"}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-zinc-600">Текущая роль:</span>
          <span className="font-semibold text-zinc-900">
            {data.currentRole || "—"}
          </span>
        </div>
        
        {data.lastLoginAttempt && (
          <div className="mt-3 pt-3 border-t border-zinc-200">
            <div className="flex justify-between mb-1">
              <span className="text-zinc-600">Последняя попытка:</span>
              <span className={data.lastLoginAttempt.status === 200 ? "text-green-600" : "text-red-600"}>
                {data.lastLoginAttempt.status === 200 ? "✓ Успешно" : `✗ ${data.lastLoginAttempt.status || "Ошибка"}`}
              </span>
            </div>
            {data.lastLoginAttempt.status !== 200 && (
              <div className="mt-1 text-red-600 text-xs">
                {errorMessage}
              </div>
            )}
            {data.lastLoginAttempt.timestamp && (
              <div className="mt-1 text-zinc-400 text-xs">
                {new Date(data.lastLoginAttempt.timestamp).toLocaleTimeString("ru-RU")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
