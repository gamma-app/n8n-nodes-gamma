import type { INodeProperties } from 'n8n-workflow';

/** Parameters for Gamma: Get. */
export const gammaGetDescription: INodeProperties[] = [
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: {
			show: {
				resource: ['gamma'],
				operation: ['get'],
			},
		},
		routing: {
			output: {
				postReceive: [
					{
						type: 'setKeyValue',
						enabled: '={{ $value }}',
						properties: {
							id: '={{ $responseItem.id }}',
							title: '={{ $responseItem.title }}',
							url: '={{ $responseItem.url }}',
							type: '={{ $responseItem.type }}',
							archived: '={{ $responseItem.archived }}',
							updatedTime: '={{ $responseItem.updatedTime }}',
							authorName: '={{ $responseItem.author ? $responseItem.author.name : null }}',
							themeId: '={{ $responseItem.themeId }}',
						},
					},
				],
			},
		},
	},
];
