"use client";

import { useState, useEffect } from "react";
import { qaText } from "@/lib/qaText";

type TestStep = {
  id: string;
  text: string;
  checked: boolean;
};

type TestScenario = {
  id: string;
  title: string;
  steps: TestStep[];
  note: string;
};

const getInitialScenarios = (): TestScenario[] => [
  {
    id: "access-roles",
    title: qaText.scenarios.accessRoles.title,
    steps: qaText.scenarios.accessRoles.steps.map((text, idx) => ({
      id: String(idx + 1),
      text,
      checked: false,
    })),
    note: "",
  },
  {
    id: "resident-cabinet",
    title: qaText.scenarios.residentCabinet.title,
    steps: qaText.scenarios.residentCabinet.steps.map((text, idx) => ({
      id: String(idx + 1),
      text,
      checked: false,
    })),
    note: "",
  },
  {
    id: "staff-office",
    title: qaText.scenarios.staffOffice.title,
    steps: qaText.scenarios.staffOffice.steps.map((text, idx) => ({
      id: String(idx + 1),
      text,
      checked: false,
    })),
    note: "",
  },
  {
    id: "admin-panel",
    title: qaText.scenarios.adminPanel.title,
    steps: qaText.scenarios.adminPanel.steps.map((text, idx) => ({
      id: String(idx + 1),
      text,
      checked: false,
    })),
    note: "",
  },
  {
    id: "deadends-redirects",
    title: qaText.scenarios.deadendsRedirects.title,
    steps: qaText.scenarios.deadendsRedirects.steps.map((text, idx) => ({
      id: String(idx + 1),
      text,
      checked: false,
    })),
    note: "",
  },
  {
    id: "knowledge-base",
    title: qaText.scenarios.knowledgeBase.title,
    steps: qaText.scenarios.knowledgeBase.steps.map((text, idx) => ({
      id: String(idx + 1),
      text,
      checked: false,
    })),
    note: "",
  },
  {
    id: "basic-navigation",
    title: qaText.scenarios.basicNavigation.title,
    steps: qaText.scenarios.basicNavigation.steps.map((text, idx) => ({
      id: String(idx + 1),
      text,
      checked: false,
    })),
    note: "",
  },
];

export default function QaTestPlanCard() {
  const [scenarios, setScenarios] = useState<TestScenario[]>(getInitialScenarios());
  const [openScenarios, setOpenScenarios] = useState<Set<string>>(new Set());

  const toggleScenario = (scenarioId: string) => {
    setOpenScenarios((prev) => {
      const next = new Set(prev);
      if (next.has(scenarioId)) {
        next.delete(scenarioId);
      } else {
        next.add(scenarioId);
      }
      return next;
    });
  };

  const toggleStep = (scenarioId: string, stepId: string) => {
    setScenarios((prev) =>
      prev.map((scenario) =>
        scenario.id === scenarioId
          ? {
              ...scenario,
              steps: scenario.steps.map((step) =>
                step.id === stepId ? { ...step, checked: !step.checked } : step
              ),
            }
          : scenario
      )
    );
  };

  const updateScenarioNote = (scenarioId: string, note: string) => {
    setScenarios((prev) =>
      prev.map((scenario) => (scenario.id === scenarioId ? { ...scenario, note } : scenario))
    );
  };

  const resetAll = () => {
    setScenarios(getInitialScenarios().map((s) => ({ ...s, steps: s.steps.map((step) => ({ ...step, checked: false })), note: "" })));
    setOpenScenarios(new Set());
  };

  // Экспортируем данные для использования в QaTestRunCard
  const getScenariosData = () => scenarios;

  // Сохраняем в window для доступа из другого компонента
  useEffect(() => {
    if (typeof window !== "undefined") {
      type WindowWithQa = Window & {
        __qaTestPlanScenarios?: () => TestScenario[];
        __qaTestPlanReset?: () => void;
      };
      const win = window as WindowWithQa;
      win.__qaTestPlanScenarios = getScenariosData;
      win.__qaTestPlanReset = resetAll;
    }
  }, [scenarios]);

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      data-testid="qa-testplan-card"
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{qaText.headers.testPlan}</h2>
          <p className="mt-1 text-xs text-zinc-500" data-testid="qa-help-testplan">
            {qaText.hints.testPlan}
          </p>
        </div>
        <button
          type="button"
          onClick={resetAll}
          className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
          aria-label="Сбросить все отметки в сценариях"
        >
          {qaText.buttons.resetAll}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {scenarios.map((scenario) => {
          const isOpen = openScenarios.has(scenario.id);
          const completedSteps = scenario.steps.filter((s) => s.checked).length;
          const totalSteps = scenario.steps.length;
          const allCompleted = completedSteps === totalSteps && totalSteps > 0;

          return (
            <details
              key={scenario.id}
              open={isOpen}
              onToggle={() => toggleScenario(scenario.id)}
              className="group rounded-xl border border-zinc-200 bg-white"
              data-testid={`qa-testplan-scenario-${scenario.id}`}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs transition-transform ${isOpen ? "rotate-90" : "rotate-0"}`}
                    aria-hidden="true"
                  >
                    ▶
                  </span>
                  <span className="text-sm font-semibold text-zinc-900">{scenario.title}</span>
                  <span className="text-xs text-zinc-500" aria-label={`Выполнено шагов: ${completedSteps} из ${totalSteps}`}>
                    ({completedSteps}/{totalSteps})
                  </span>
                  {allCompleted && (
                    <span
                      className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                      aria-label="Все шаги выполнены"
                    >
                      ✓
                    </span>
                  )}
                </div>
              </summary>
              <div className="border-t border-zinc-100 px-4 py-3">
                <div className="space-y-3">
                  {/* Шаги */}
                  <div className="space-y-2">
                    {scenario.steps.map((step) => (
                      <label
                        key={step.id}
                        className="flex items-start gap-2 text-sm text-zinc-700 cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-[#5E704F] focus-within:ring-offset-1 rounded p-1 -m-1"
                      >
                        <input
                          type="checkbox"
                          checked={step.checked}
                          onChange={() => toggleStep(scenario.id, step.id)}
                          data-testid={`qa-testplan-step-${scenario.id}-${step.id}`}
                          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-[#5E704F] focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
                          aria-label={`${step.checked ? "Выполнено" : "Не выполнено"}: ${step.text}`}
                        />
                        <span className={step.checked ? "line-through text-zinc-500" : ""}>
                          {step.text}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Заметка для сценария */}
                  <div>
                    <label
                      htmlFor={`qa-testplan-note-${scenario.id}`}
                      className="mb-1 block text-xs font-medium text-zinc-700"
                    >
                      {qaText.labels.note}
                    </label>
                    <textarea
                      id={`qa-testplan-note-${scenario.id}`}
                      data-testid={`qa-testplan-note-${scenario.id}`}
                      value={scenario.note}
                      onChange={(e) => updateScenarioNote(scenario.id, e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-900 focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
                      placeholder={qaText.placeholders.scenarioNote}
                    />
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
