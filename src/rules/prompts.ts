import { defineRule, issue, type Rule } from "./rule.js";

export const promptRules: readonly Rule[] = [
  defineRule({
    id: "prompts/name-missing",
    category: "prompts",
    defaultSeverity: "error",
    summary: "prompt has no name",
    rationale:
      "A prompt is retrieved by name when the user picks it from a slash menu. Without a name it can be listed but never invoked.",
    spec: "server/prompts",
    check: ({ snapshot }) =>
      snapshot.prompts
        .map((prompt, index) =>
          prompt.name === undefined
            ? issue({
                message: `prompt at index ${index} has no name`,
                subject: `#${index}`,
                subjectKind: "prompt",
                hint: "Give every prompt a unique, stable name.",
                pointer: `/prompts/${index}/name`,
              })
            : null,
        )
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
  }),

  defineRule({
    id: "prompts/duplicate-name",
    category: "prompts",
    defaultSeverity: "error",
    summary: "two prompts share the same name",
    rationale:
      "Duplicate prompt names make selection order-dependent: whichever the server lists first wins, and the other becomes unreachable without any error.",
    spec: "server/prompts",
    check: ({ snapshot }) => {
      const counts = new Map<string, number>();
      for (const prompt of snapshot.prompts) {
        if (prompt.name === undefined) continue;
        counts.set(prompt.name, (counts.get(prompt.name) ?? 0) + 1);
      }
      return [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([name, count]) =>
          issue({
            message: `prompt name "${name}" is used by ${count} prompts`,
            subject: name,
            subjectKind: "prompt",
            hint: "Prompt names must be unique within a server.",
          }),
        );
    },
  }),

  defineRule({
    id: "prompts/description-missing",
    category: "prompts",
    defaultSeverity: "warn",
    summary: "prompt has no description",
    rationale:
      "Users choose prompts from a list. A description is the only thing distinguishing `review` from `review-deep` in that list.",
    spec: "server/prompts",
    check: ({ snapshot }) =>
      snapshot.prompts
        .filter((prompt) => prompt.description === undefined || prompt.description.trim().length === 0)
        .map((prompt) =>
          issue({
            message: `prompt "${prompt.name ?? "(unnamed)"}" has no description`,
            subject: prompt.name,
            subjectKind: "prompt",
            hint: "Describe what the prompt produces and when to use it.",
          }),
        ),
  }),

  defineRule({
    id: "prompts/argument-description-missing",
    category: "prompts",
    defaultSeverity: "warn",
    summary: "prompt argument has no description",
    rationale:
      "Prompt arguments are filled in by a user or by the model. An undescribed argument such as `mode: string` leaves both guessing the accepted values.",
    spec: "server/prompts",
    check: ({ snapshot }) =>
      snapshot.prompts.flatMap((prompt) =>
        (prompt.arguments ?? [])
          .filter((argument) => argument.description === undefined)
          .map((argument) =>
            issue({
              message: `prompt "${prompt.name ?? "(unnamed)"}" argument "${argument.name ?? "(unnamed)"}" has no description`,
              subject: prompt.name,
              subjectKind: "prompt",
              hint: "Describe the argument and list its accepted values.",
            }),
          ),
      ),
  }),

  defineRule({
    id: "prompts/argument-name-missing",
    category: "prompts",
    defaultSeverity: "error",
    summary: "prompt argument has no name",
    rationale:
      "An unnamed argument cannot be supplied: the client has no key to put in the arguments object, so the prompt always runs with that value missing.",
    spec: "server/prompts",
    check: ({ snapshot }) =>
      snapshot.prompts.flatMap((prompt) =>
        (prompt.arguments ?? [])
          .filter((argument) => argument.name === undefined)
          .map(() =>
            issue({
              message: `prompt "${prompt.name ?? "(unnamed)"}" has an argument with no name`,
              subject: prompt.name,
              subjectKind: "prompt",
              hint: "Every prompt argument needs a name matching a placeholder in the message.",
            }),
          ),
      ),
  }),
];
