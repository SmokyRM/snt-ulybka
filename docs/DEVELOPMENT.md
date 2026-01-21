# Разработка

## Коды доступа (AUTH_PASS_*)

Для входа сотрудников (`/staff-login`, `/staff/login`) нужны переменные:

| Переменная | Роль | Логин (пример) |
|------------|------|----------------|
| `AUTH_PASS_ADMIN` | Администратор | админ, admin |
| `AUTH_PASS_CHAIRMAN` | Председатель | председатель, chairman, пред |
| `AUTH_PASS_SECRETARY` | Секретарь | секретарь, secretary, сек |
| `AUTH_PASS_ACCOUNTANT` | Бухгалтер | бухгалтер, accountant, бух |
| `AUTH_PASS_RESIDENT` | Житель (для QA/кодов) | по коду на /login |

**Минимум для dev:** задайте `AUTH_PASS_ADMIN` (и при необходимости остальные).

Если переменная не задана, при попытке входа появится **«Код доступа для роли &lt;role&gt; не настроен (env)»** (а не «Неверный код»).

### Пример `.env.local` для dev

⚠️ **ВАЖНО: Избегайте дублей переменных**

- Каждая переменная должна быть определена **ТОЛЬКО ОДИН РАЗ** в `.env.local`
- Если переменная встречается дважды, **последнее значение перезапишет предыдущие**
- Результат: первый пароль будет проигнорирован, логин не сработает

**Правильно:**
```bash
AUTH_PASS_ADMIN=1233     # ✅ Определена один раз
```

**Неправильно:**
```bash
AUTH_PASS_ADMIN=1233     # ❌ Будет проигнорирована!
# ... другие переменные ...
AUTH_PASS_ADMIN=4567     # ❌ Перезапишет предыдущее значение
```

### Шаблон `.env.local`

Скопируйте блок ниже в новый файл `.env.local` (файл `.env.local.example` в репо не ведётся из‑за .gitignore):

```bash
# QA режим (включает тестовые функции)
ENABLE_QA=1

# Коды доступа для житлей (через /login)
AUTH_PASS_RESIDENT=1111

# Коды доступа для staff ролей (через /staff-login)
AUTH_PASS_ADMIN=1233
AUTH_PASS_CHAIRMAN=pass123
AUTH_PASS_SECRETARY=pass123
AUTH_PASS_ACCOUNTANT=pass123

# Опционально: Telegram уведомления (можно оставить пустыми)
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_DEFAULT_CHAT_ID=
```

**Примечания:**
- Для `ENABLE_QA` можно также использовать `ENABLE_QA=true`
- Пароли могут быть любыми строками (цифры, буквы, символы)
- В production пароли должны быть криптостойкими (генерируйте случайные строки)

### Проверка переменных при старте

При запуске dev сервера (`npm run dev`) в консоли появятся предупреждения, если какие-то `AUTH_PASS_*` переменные не заданы:

```
[dev-check] ⚠ Missing AUTH_PASS_* variables:
  - AUTH_PASS_CHAIRMAN
  - AUTH_PASS_SECRETARY
  - AUTH_PASS_ACCOUNTANT
[dev-check] ✓ AUTH_PASS_ADMIN is set
[dev-check] ✓ AUTH_PASS_RESIDENT is set
```

Это помогает избежать ошибок при попытке входа с незаданными кодами.

См. также README (раздел «Переменные окружения») и `.env.example`.

## Вход по коду (/login)

- В **dev**: по умолчанию работают коды `1111` (житель), `1233` (админ), `2222` (правление). Можно переопределить через `DEV_LOGIN_CODE`, `MASTER_CODE`.
- В **prod** при `ENABLE_QA=true`: `TEST_ACCESS_CODE` (по умолчанию 1111), `TEST_ADMIN_CODE` (1233).

## /login?as=admin

На `/staff-login?as=admin` поле «Роль/логин» предзаполняется «админ». Введите пароль из `AUTH_PASS_ADMIN`.
