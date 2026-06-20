import { redirect } from "next/navigation";
import { isDirector, isRegional } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listTemplates, templateFormOptions } from "@/lib/template-data";
import { TemplatesPanel, type TemplateRow } from "./TemplatesPanel";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const user = await requireUser();
  if (!isDirector(user) && !isRegional(user)) redirect("/boards");

  const [templates, options] = await Promise.all([listTemplates(user), templateFormOptions(user)]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-[22px] font-bold text-[var(--color-ink)]">Шаблоны задач</h1>
      <div className="mt-4">
        <TemplatesPanel templates={templates as unknown as TemplateRow[]} options={options} />
      </div>
    </div>
  );
}
