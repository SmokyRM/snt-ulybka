"use client";

/**
 * Client-обёртка для кнопки «Удалить»: confirm и submit.
 * Server не может передавать onClick в нативный button — handler живёт только в Client.
 */
type Props = {
  deleteAction: (formData: FormData) => Promise<void>;
  templateId: string;
};

export default function DeleteTemplateButton({ deleteAction, templateId }: Props) {
  return (
    <form action={deleteAction}>
      <input type="hidden" name="id" value={templateId} />
      <button
        type="submit"
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:border-red-300"
        onClick={(e) => {
          if (!confirm("Удалить шаблон?")) {
            e.preventDefault();
          }
        }}
      >
        Удалить
      </button>
    </form>
  );
}
