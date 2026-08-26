import type { INodeProperties } from 'n8n-workflow';

/** Operations on the Generation resource, including their routing. */
export const generationOperations: INodeProperties[] = [
	// ============================================
	// GENERATION OPERATIONS
	// ============================================
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['generation'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create generation',
				description: 'Create a new presentation, document, social post, or webpage',
				routing: {
					request: {
						method: 'POST',
						url: '/v1.0/generations',
					},
				},
			},
			{
				name: 'Create From Template',
				value: 'createFromTemplate',
				action: 'Create from template',
				description: 'Remix an existing Gamma with new prompt',
				routing: {
					request: {
						method: 'POST',
						url: '/v1.0/generations/from-template',
					},
				},
			},
			{
				name: 'Get Status',
				value: 'getStatus',
				action: 'Get generation status',
				description: 'Check the status of a generation',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1.0/generations/{{$parameter["generationId"]}}',
					},
				},
			},
		],
		default: 'create',
	},
];
