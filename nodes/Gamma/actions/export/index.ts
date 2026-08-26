import type { INodeProperties } from 'n8n-workflow';

/** Operations and parameters for the Export resource. */
export const exportDescription: INodeProperties[] = [
	// ============================================
	// EXPORT OPERATIONS
	// ============================================
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['export'],
			},
		},
		options: [
			{
				name: 'Get Status',
				value: 'getStatus',
				action: 'Get export status',
				description: 'Poll an export until its status is completed or failed',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1.0/exports/{{$parameter["exportId"]}}',
					},
				},
			},
		],
		default: 'getStatus',
	},
	{
		displayName: 'Export ID',
		name: 'exportId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. exp_abc123',
		description: 'The exportId returned when the export was started',
		displayOptions: {
			show: {
				resource: ['export'],
			},
		},
	},
];
