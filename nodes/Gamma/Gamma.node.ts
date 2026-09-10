import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

import { properties } from './actions/versionDescription';
import { listSearch } from './methods';
import { USER_AGENT } from './userAgent';

export class Gamma implements INodeType {
	methods = { listSearch };

	description: INodeTypeDescription = {
		displayName: 'Gamma',
		name: 'gamma',
		icon: 'file:gamma.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create AI-powered presentations, documents, and websites with Gamma',
		defaults: {
			name: 'Gamma',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'gammaApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://public-api.gamma.app',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'User-Agent': USER_AGENT,
			},
		},
		properties,
		usableAsTool: true,
	};
}
