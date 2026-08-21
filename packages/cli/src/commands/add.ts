import { readFileSync, writeFileSync } from 'node:fs';
import { findPackageFile, PACKAGE_FILE } from '../files.js';
import { ok, fail, info, warn, ui } from '../ui.js';

type ResourceType = 'query' | 'function' | 'connector' | 'agent' | 'skill' | 'collection' | 'store' | 'webhook' | 'schedule' | 'pipeline';

const SECTION_BY_TYPE: Record<ResourceType, string> = {
  query: 'queries',
  function: 'functions',
  connector: 'connectors',
  agent: 'agents',
  skill: 'skills',
  collection: 'collections',
  store: 'stores',
  webhook: 'webhooks',
  schedule: 'schedules',
  pipeline: 'pipelines',
};

function template(type: ResourceType, namespace: string, name: string): string {
  switch (type) {
    case 'query':
      return `    - namespace: ${namespace}
      name: ${name}
      description: TODO
      connectionName: built-in
      operation: read
      inputSchema:
        type: object
        properties: {}
      sql: |
        SELECT 1
`;
    case 'function':
      return `    - namespace: ${namespace}
      name: ${name}
      description: TODO
      sharedPool: true
      timeout: 30
      inputSchema:
        type: object
        properties: {}
      code: |
        def handler(input_data, context):
            return {"ok": True}
`;
    case 'connector':
      return `    - namespace: ${namespace}
      name: ${name}
      description: TODO
      baseUrl: https://example.com
      auth:
        type: bearer
        secret: "{{SECRET_NAME}}"
      operations: []
`;
    case 'agent':
      return `    - namespace: ${namespace}
      name: ${name}
      description: TODO
      temperature: 0.2
      systemPrompt: |
        You are ...
      enabledQueries: []
      enabledFunctions: []
      enabledSkills: []
`;
    case 'skill':
      return `    - namespace: ${namespace}
      name: ${name}
      description: TODO
      content: |
        # ${name}
        TODO
`;
    case 'collection':
      return `    - namespace: ${namespace}
      name: ${name}
      allowSharedFiles: true
      allowPrivateFiles: true
      maxFileSizeMb: 10
      maxTotalSizeGb: 1
`;
    case 'store':
      return `    - namespace: ${namespace}
      name: ${name}
      description: TODO
`;
    case 'webhook':
      return `    - namespace: ${namespace}
      name: ${name}
      description: TODO
      enabledFunctions: []
`;
    case 'schedule':
      return `    - name: ${name}
      description: TODO
      scheduleType: function      # function | agent | pipeline
      functionName: ${namespace}/TODO
      cronExpression: "0 * * * *"
      inputData: {}
`;
    case 'pipeline':
      return `    - namespace: ${namespace}
      name: ${name}
      description: TODO
      inputSchema:
        type: object
        properties: {}
      steps:
        - name: fetch
          type: connector          # connector | function | agent | query | load
          connector: ${namespace}/TODO
          operation: TODO
          input: {}
        - name: process
          type: function
          function: ${namespace}/TODO
          input.$: "{value: steps.fetch.output.body}"
      # asTool: true               # expose to agents (requires toolDescription + inputSchema)
      # toolDescription: TODO
`;
  }
}

export async function addCommand(typeArg: string, nameArg: string, opts: { namespace?: string }): Promise<void> {
  const type = typeArg as ResourceType;
  if (!(type in SECTION_BY_TYPE)) {
    fail(`Unknown resource type: ${typeArg}. Known: ${Object.keys(SECTION_BY_TYPE).join(', ')}`);
    process.exit(1);
  }

  const pkg = findPackageFile();
  if (!pkg) {
    fail(`No ${PACKAGE_FILE} found in the current directory. Run \`sinas init\` first.`);
    process.exit(1);
  }

  const packageNamespace =
    opts.namespace ??
    ((pkg.parsed?.package as Record<string, unknown> | undefined)?.name as string | undefined) ??
    'default';

  const section = SECTION_BY_TYPE[type];
  const block = template(type, packageNamespace, nameArg);

  let content = readFileSync(pkg.path, 'utf8');

  // Ensure trailing newline before we append
  if (!content.endsWith('\n')) content += '\n';

  // Naive YAML editing: if spec.<section>: exists, append items under it.
  // If not, add the key with the new item.
  const sectionRe = new RegExp(`(^|\\n)  ${section}:[ \\t]*(\\n|$)`);
  if (sectionRe.test(content)) {
    // Append before the next top-level spec.* key, or at end of file.
    const match = content.match(sectionRe);
    const insertPos = match!.index! + match![0].length;
    // Find the position after the section header where we should insert.
    // Walk forward through lines under this section until we hit a less-indented key.
    const after = content.slice(insertPos);
    const lines = after.split('\n');
    let cursor = 0;
    let sawAnyItem = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === '' || /^\s*#/.test(line)) {
        cursor += line.length + 1;
        continue;
      }
      // Items under this section start with "    -" (4 spaces). Stop when we hit something less indented.
      if (/^    [-\s]/.test(line)) {
        sawAnyItem = true;
        cursor += line.length + 1;
        continue;
      }
      break;
    }
    if (!sawAnyItem) {
      // Section was empty (e.g. "  queries: []" or "  queries:\n  next:"). Insert right after header.
      // Detect [] case and rewrite to a list.
      const emptyArrayRe = new RegExp(`(^|\\n)  ${section}:[ \\t]*\\[\\][ \\t]*(\\n|$)`);
      if (emptyArrayRe.test(content)) {
        content = content.replace(emptyArrayRe, `$1  ${section}:\n${block}$2`);
      } else {
        content = content.slice(0, insertPos) + block + content.slice(insertPos);
      }
    } else {
      const at = insertPos + cursor;
      content = content.slice(0, at) + block + content.slice(at);
    }
  } else {
    // No section yet — append at end with header.
    // Ensure there is a spec: block.
    if (!/^\s*spec\s*:/m.test(content)) {
      content += 'spec:\n';
    }
    content += `  ${section}:\n${block}`;
  }

  writeFileSync(pkg.path, content);
  ok(`Added ${ui.cyan(type)} ${packageNamespace}/${nameArg} to ${PACKAGE_FILE}`);
  info(`Edit the stub in ${PACKAGE_FILE} and run \`sinas validate\`.`);
  warn('Remember to extend spec.manifests[].requiredResources accordingly.');
}
