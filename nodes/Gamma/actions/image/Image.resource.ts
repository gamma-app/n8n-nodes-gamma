import type { INodeProperties } from 'n8n-workflow';

/** Operations on the Image resource, including their routing. */
export const imageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
		options: [
			{
				name: 'Archive Media',
				value: 'archiveMedia',
				action: 'Archive media item',
				description: 'Archive a saved image in the media library. Repeating this succeeds.',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1.0/images/media/{{$parameter["savedMediaId"]}}/archive',
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create image',
				description: 'Generate a standalone on-brand image from a text prompt',
				routing: {
					request: {
						method: 'POST',
						url: '/v1.0/images',
					},
				},
			},
			{
				name: 'Get Status',
				value: 'getStatus',
				action: 'Get image status',
				description: 'Poll an image generation until its status is completed or failed',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1.0/images/{{$parameter["imageGenerationId"]}}',
					},
				},
			},
		],
		default: 'create',
	},
];
