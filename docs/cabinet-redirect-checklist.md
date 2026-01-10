## Кабинет: маршрутизация доступа

- Профиль не заполнен → при входе в /cabinet происходит редирект на /cabinet/profile?onboarding=1.
- Профиль заполнен, заявка не отправлена/отклонена → редирект на /cabinet/verification.
- Статус pending → редирект на /cabinet/verification/status?status=pending.
- Статус verified → попытка открыть /cabinet/verification или /cabinet/verification/status уводит на /cabinet.
- Неавторизованный пользователь при попытке открыть страницы кабинета → редирект на /login.
