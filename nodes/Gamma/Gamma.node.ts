import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

import { analyticsDescription } from './actions/analytics';
import { commentDescription } from './actions/comment';
import { exportDescription } from './actions/export';
import { folderDescription } from './actions/folder';
import { gammaDescription } from './actions/gamma';
import { generationDescription } from './actions/generation';
import { imageDescription } from './actions/image';
import { themeDescription } from './actions/theme';
import { userDescription } from './actions/user';
import { BASE_URL, USER_AGENT } from './api';
import { listSearch } from './methods/listSearch';

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
			baseURL: BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'User-Agent': USER_AGENT,
			},
		},
		// n8n renders parameters in this order: the Resource selector first, which
		// gates everything else, then each resource's block. Keep new resources in
		// one contiguous block.
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Analytics',
						value: 'analytics',
						description: 'Read engagement metrics for a Gamma',
					},
					{
						name: 'Comment',
						value: 'comment',
						description: 'Read comment threads on a Gamma',
					},
					{
						name: 'Export',
						value: 'export',
						description: 'Check the status of an export started on a Gamma',
					},
					{
						name: 'Folder',
						value: 'folder',
						description: 'Browse workspace folders (read-only - use to get folder IDs)',
					},
					{
						name: 'Gamma',
						value: 'gamma',
						description: 'Read, export, archive or delete an existing Gamma',
					},
					{
						name: 'Generation',
						value: 'generation',
						description: 'Create and manage AI-generated presentations, documents, and social posts',
					},
					{
						name: 'Image',
						value: 'image',
						description: 'Generate a standalone on-brand image',
					},
					{
						name: 'Theme',
						value: 'theme',
						description: 'Browse available themes (read-only - use to get theme IDs)',
					},
					{
						name: 'User',
						value: 'user',
						description: 'Read your account and workspace limits',
					},
				],
				default: 'generation',
			},
			...generationDescription,
			...imageDescription,
			...themeDescription,
			...folderDescription,
			...userDescription,
			...gammaDescription,
			...exportDescription,
			...commentDescription,
			...analyticsDescription,
		],
		usableAsTool: true,
	};
}
