import type { INodeProperties } from 'n8n-workflow';

/** Parameters for Generation: Get Status. */
export const getStatusDescription: INodeProperties[] = [
	// ============================================
	// GET STATUS FIELD
	// ============================================
	{
		displayName: 'Generation ID',
		name: 'generationId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. abc123xyz',
		description: 'Generation ID returned from Create Generation operation',
		displayOptions: {
			show: {
				resource: ['generation'],
				operation: ['getStatus'],
			},
		},
	},
];
