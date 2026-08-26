import type { INodeProperties } from 'n8n-workflow';

/** Parameters for Gamma: Export. */
export const gammaExportDescription: INodeProperties[] = [
	{
		displayName: 'Export As',
		name: 'exportFormat',
		type: 'options',
		required: true,
		options: [
			{ name: 'PDF', value: 'pdf' },
			{ name: 'PNG', value: 'png' },
			{ name: 'PowerPoint (PPTX)', value: 'pptx' },
		],
		default: 'pdf',
		description: 'Format to export to',
		displayOptions: {
			show: {
				resource: ['gamma'],
				operation: ['export'],
			},
		},
		routing: {
			request: {
				body: {
					exportAs: '={{ $value }}',
				},
			},
		},
	},
];
