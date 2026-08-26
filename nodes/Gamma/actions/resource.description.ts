import type { INodeProperties } from 'n8n-workflow';

/** The top-level Resource selector. Every other parameter is gated on it. */
export const resourceDescription: INodeProperties[] = [
	// ============================================
	// RESOURCE SELECTOR
	// ============================================
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
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
];
