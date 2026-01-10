## Проверки actions, основанных на facts

- Пользователь со статусом pending → в ответе есть действие «Проверить статус» (/cabinet/verification/status?status=pending).
- Статус rejected или draft → действие «Подтверждение участка» (/cabinet/verification).
- Есть задолженность → действие «Оплата и долги» (/cabinet?section=finance).
- Гость или smalltalk → действий из facts нет.
- Действия не дублируются с уже существующими role-actions.
