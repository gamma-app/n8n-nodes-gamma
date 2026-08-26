import type { INodeProperties } from 'n8n-workflow';

/** Parameters for Image: Archive Media. */
export const imageArchiveMediaDescription: INodeProperties[] = [
	{
		displayName: 'Saved Media ID',
		name: 'savedMediaId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. media_abc123',
		description:
			'The savedMediaId from a completed image generation. Only images saved to the media library have one.',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['archiveMedia'],
			},
		},
	},
];
