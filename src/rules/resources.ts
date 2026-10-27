import { defineRule, issue, type Rule, type RuleIssue } from "./rule.js";

/** A URI per RFC 3986 starts with a scheme; `note.txt` alone is not one. */
const URI_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export const resourceRules: readonly Rule[] = [
  defineRule({
    id: "resources/uri-missing",
    category: "resources",
    defaultSeverity: "error",
    summary: "resource has no uri",
    rationale:
      "The uri is how a resource is read and how it is referenced from a prompt or a tool result. A resource without one can be listed but never fetched.",
    spec: "server/resources",
    check: ({ snapshot }) =>
      snapshot.resources
        .map((resource, index) =>
          resource.uri === undefined
            ? issue({
                message: `resource at index ${index} has no uri`,
                subject: resource.name ?? `#${index}`,
                subjectKind: "resource",
                hint: "Give the resource a stable, absolute URI such as file:// or https://.",
                pointer: `/resources/${index}/uri`,
              })
            : null,
        )
        .filter((entry): entry is RuleIssue => entry !== null),
  }),

  defineRule({
    id: "resources/uri-not-absolute",
    category: "resources",
    defaultSeverity: "warn",
    summary: "resource uri has no scheme",
    rationale:
      "Relative URIs collide across servers: two servers both exposing `config.json` become indistinguishable once a client merges their resource lists.",
    spec: "server/resources",
    check: ({ snapshot }) =>
      snapshot.resources
        .filter((resource) => resource.uri !== undefined && !URI_PATTERN.test(resource.uri))
        .map((resource) =>
          issue({
            message: `resource uri "${resource.uri}" has no scheme`,
            subject: resource.uri,
            subjectKind: "resource",
            hint: "Use an absolute URI with a scheme, for example `myserver://config`.",
          }),
        ),
  }),

  defineRule({
    id: "resources/duplicate-uri",
    category: "resources",
    defaultSeverity: "error",
    summary: "two resources share the same uri",
    rationale:
      "A read request by uri returns one of them, chosen by the server's own ordering. The other resource is unreachable and nothing in the protocol exposes that.",
    spec: "server/resources",
    check: ({ snapshot }) => {
      const counts = new Map<string, number>();
      for (const resource of snapshot.resources) {
        if (resource.uri === undefined) continue;
        counts.set(resource.uri, (counts.get(resource.uri) ?? 0) + 1);
      }
      return [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([uri, count]) =>
          issue({
            message: `resource uri "${uri}" is used by ${count} resources`,
            subject: uri,
            subjectKind: "resource",
            hint: "Resource uris must be unique within a server.",
          }),
        );
    },
  }),

  defineRule({
    id: "resources/name-missing",
    category: "resources",
    defaultSeverity: "warn",
    summary: "resource has no name",
    rationale:
      "The name is what a user sees in a client's resource picker. Without it the picker shows a raw URI, which users cannot tell apart or judge before attaching.",
    spec: "server/resources",
    check: ({ snapshot }) =>
      snapshot.resources
        .filter((resource) => resource.name === undefined)
        .map((resource) =>
          issue({
            message: `resource "${resource.uri ?? "(no uri)"}" has no name`,
            subject: resource.uri,
            subjectKind: "resource",
            hint: 'Add a short human-readable name such as "Deployment guide".',
          }),
        ),
  }),

  defineRule({
    id: "resources/mime-type-missing",
    category: "resources",
    defaultSeverity: "info",
    summary: "resource has no mimeType",
    rationale:
      "Clients pick a renderer from the mime type. Without it a markdown document may be shown as plain text and a binary blob may be pushed into the context as mojibake.",
    spec: "server/resources",
    check: ({ snapshot }) =>
      snapshot.resources
        .filter((resource) => resource.mimeType === undefined)
        .map((resource) =>
          issue({
            message: `resource "${resource.uri ?? "(no uri)"}" has no mimeType`,
            subject: resource.uri,
            subjectKind: "resource",
            hint: "Set mimeType, for example text/markdown or application/json.",
          }),
        ),
  }),

  defineRule({
    id: "resources/template-uri-invalid",
    category: "resources",
    defaultSeverity: "error",
    summary: "resource template uriTemplate is not a valid URI template",
    rationale:
      "A template without a scheme, or with an unclosed brace, cannot be expanded by the client. The resource silently never appears even though the server believes it published it.",
    spec: "server/resources#resource-templates",
    check: ({ snapshot }) =>
      snapshot.resourceTemplates
        .filter((template) => !isValidTemplate(template.uriTemplate))
        .map((template) =>
          issue({
            message:
              template.uriTemplate === undefined
                ? `resource template "${template.name ?? "(unnamed)"}" has no uriTemplate`
                : `resource template uriTemplate "${template.uriTemplate}" is not a valid URI template`,
            subject: template.uriTemplate ?? template.name,
            subjectKind: "resourceTemplate",
            hint: "Use a URI template such as `myserver://items/{id}` with a scheme and balanced braces.",
          }),
        ),
  }),
];

function isValidTemplate(templateUri: string | undefined): boolean {
  if (templateUri === undefined) return false;
  if (!URI_PATTERN.test(templateUri)) return false;
  return !hasUnbalancedBraces(templateUri);
}

function hasUnbalancedBraces(value: string): boolean {
  let depth = 0;
  for (const character of value) {
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth < 0 || depth > 1) return true;
  }
  return depth !== 0;
}
