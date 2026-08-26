import type { INodeProperties } from 'n8n-workflow';

import { generationOperations } from './Generation.resource';
import { createDescription } from './create.operation';
import { createFromTemplateDescription } from './createFromTemplate.operation';
import { createMultiPageDescription } from './createMultiPage.operation';
import { getStatusDescription } from './getStatus.operation';

export const generationDescription: INodeProperties[] = [
	...generationOperations,
	...createDescription,
	...createMultiPageDescription,
	...createFromTemplateDescription,
	...getStatusDescription,
];
