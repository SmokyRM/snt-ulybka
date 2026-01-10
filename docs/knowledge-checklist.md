## Knowledge base & Assistant checks

- `/knowledge` lists articles grouped by category; search works by title/tags.
- `/knowledge/[slug]` shows title, updated date, content, and related articles section.
- Assistant reply with knowledge link renders a “Материал из базы знаний” card in the chat.
- Articles stored in `content/knowledge/*.md` with frontmatter are loaded server-side.
- Smalltalk (“привет”, “спасибо”) returns a friendly answer + actions without errors.
