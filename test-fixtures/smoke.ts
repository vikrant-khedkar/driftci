import { loadOpenApi } from '../src/openapi/load.ts';
import { diff } from '../src/diff/engine.ts';
import { renderText } from '../src/report/text.ts';
import type { ApiCall, ScanResult } from '../src/types.ts';

const spec = await loadOpenApi(new URL('./sample-openapi.yaml', import.meta.url).pathname);

const fakeMakeCalls: ApiCall[] = [
  {
    source: 'make',
    operationName: 'create_user',
    method: 'POST',
    pathTemplate: '/v1/users',
    params: [
      { name: 'email', location: 'body', required: true },
      { name: 'name', location: 'body', required: true },
    ],
    authMethod: 'http',
  },
  {
    source: 'make',
    operationName: 'list_users',
    method: 'GET',
    pathTemplate: '/v2/users',
    params: [{ name: 'limit', location: 'query', required: false }],
    authMethod: 'http',
  },
  {
    source: 'make',
    operationName: 'get_user',
    method: 'GET',
    pathTemplate: '/v2/users/{userId}',
    params: [{ name: 'userId', location: 'path', required: true }],
    authMethod: 'http',
  },
  {
    source: 'make',
    operationName: 'delete_user',
    method: 'DELETE',
    pathTemplate: '/v2/users/{id}',
    params: [{ name: 'id', location: 'path', required: true }],
    authMethod: 'http',
  },
];

const drifts = diff(fakeMakeCalls, spec);

const result: ScanResult = {
  platform: 'make',
  target: 'smoke-test',
  version: '1',
  scanned: fakeMakeCalls,
  spec,
  drifts,
  warnings: [],
};

console.log(renderText(result));
console.log('\n--- summary ---');
console.log(`scanned: ${fakeMakeCalls.length}  spec: ${spec.length}  drifts: ${drifts.length}`);
