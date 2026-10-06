import type { IDataObject, INodePropertyRouting } from 'n8n-workflow';

/**
 * Writes `value` at a dotted path such as `body.textOptions.tone`, copying each
 * object on the way so writers into the same nested object merge, not clobber.
 */
export function setPath(target: object, path: string, value: unknown): void {
	const keys = path.split('.');
	const leaf = keys.pop() as string;
	let obj = target as IDataObject;
	for (const key of keys) obj = obj[key] = { ...(obj[key] as IDataObject) };
	obj[leaf] = value as IDataObject[string];
}

/**
 * Routing whose preSend copies one parameter to `path` on the request. An empty
 * value, or `skip` (the API's own default), sends nothing.
 *
 * `param` is the full path ('additionalOptions.tone'): n8n runs preSend with the
 * node-level context, where a bare nested name does not resolve.
 */
export function sendIfSet(
	param: string,
	path: string,
	{ skip, extractValue }: { skip?: string; extractValue?: boolean } = {},
): INodePropertyRouting {
	return {
		send: {
			preSend: [
				async function (requestOptions) {
					const value = this.getNodeParameter(param, '', extractValue ? { extractValue } : undefined);
					if (value && value !== skip) setPath(requestOptions, path, value);
					return requestOptions;
				},
			],
		},
	};
}
