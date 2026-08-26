import type { INodeProperties } from 'n8n-workflow';

/**
 * Operations for the User resource.
 *
 * NOTE: /v1.0/me is undocumented. A live call confirms it works and returns
 * maxGenerateCards and availableImageModels, but nothing published commits
 * Gamma to keeping it, so nothing else in this node depends on it.
 */
export const userDescription: INodeProperties[] = [
	// ============================================
	// USER OPERATIONS  
	// ============================================
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Get Me',
				value: 'getMe',
				action: 'Get user information',
				description: 'Retrieve the account and workspace behind the API key, including your plan\'s maxGenerateCards limit and availableImageModels',
				routing: {
					request: {
						method: 'GET',
						url: '/v1.0/me',
					},
				},
			},
		],
		default: 'getMe',
	},
];
